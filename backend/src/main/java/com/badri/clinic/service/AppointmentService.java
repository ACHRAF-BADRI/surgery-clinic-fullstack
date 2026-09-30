package com.badri.clinic.service;

import com.badri.clinic.config.AppProperties;
import com.badri.clinic.dto.AppointmentDtos.AppointmentDto;
import com.badri.clinic.dto.AppointmentDtos.BookRequest;
import com.badri.clinic.dto.AppointmentDtos.DayAvailability;
import com.badri.clinic.dto.AppointmentDtos.DoctorBookRequest;
import com.badri.clinic.dto.AppointmentDtos.PersonRef;
import com.badri.clinic.dto.AppointmentDtos.RescheduleRequest;
import com.badri.clinic.dto.AppointmentDtos.Slot;
import com.badri.clinic.dto.AppointmentDtos.StatusRequest;
import com.badri.clinic.model.AccountStatus;
import com.badri.clinic.model.Appointment;
import com.badri.clinic.model.AppointmentStatus;
import com.badri.clinic.model.AppointmentType;
import com.badri.clinic.model.Role;
import com.badri.clinic.model.User;
import com.badri.clinic.repository.AppointmentRepository;
import com.badri.clinic.repository.UserRepository;
import com.badri.clinic.security.AuthUser;
import com.badri.clinic.service.EmailService.AppointmentEvent;
import com.badri.clinic.web.ApiException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    static final Set<AppointmentStatus> ACTIVE = EnumSet.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);
    private static final DateTimeFormatter HOUR = DateTimeFormatter.ofPattern("HH:mm");
    private static final int MAX_DAYS_AHEAD = 180;

    private final AppointmentRepository appointments;
    private final UserRepository users;
    private final EmailService email;
    private final AppProperties props;

    public AppointmentService(AppointmentRepository appointments, UserRepository users, EmailService email, AppProperties props) {
        this.appointments = appointments;
        this.users = users;
        this.email = email;
        this.props = props;
    }

    // ------------------------------------------------------------------ availability

    public DayAvailability availability(LocalDate date, String doctorId, AppointmentType type, String excludeId) {
        ZoneId zone = props.zone();
        String hours = props.schedule().hours().getOrDefault(date.getDayOfWeek(), "");
        LocalDate today = LocalDate.now(zone);
        if (hours == null || hours.isBlank() || date.isBefore(today) || date.isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
            return new DayAvailability(date, true, List.of());
        }
        String[] range = hours.split("-");
        LocalTime open = LocalTime.parse(range[0].trim());
        LocalTime close = LocalTime.parse(range[1].trim());
        int duration = (type == null ? AppointmentType.FOLLOW_UP : type).durationMinutes();
        String doctor = resolveDoctorId(doctorId);

        Instant dayStart = date.atTime(open).atZone(zone).toInstant();
        Instant dayEnd = date.atTime(close).atZone(zone).toInstant();
        List<Appointment> busy = overlapping(doctor, dayStart, dayEnd, excludeId);
        Instant earliest = Instant.now().plus(Duration.ofHours(props.schedule().minNoticeHours()));

        List<Slot> slots = new ArrayList<>();
        for (LocalTime t = open; !t.plusMinutes(duration).isAfter(close); t = t.plusMinutes(props.schedule().slotMinutes())) {
            ZonedDateTime start = date.atTime(t).atZone(zone);
            Instant s = start.toInstant();
            Instant e = s.plus(Duration.ofMinutes(duration));
            boolean free = s.isAfter(earliest)
                    && busy.stream().noneMatch(a -> a.getStartAt().isBefore(e) && a.getEndAt().isAfter(s));
            if (free) slots.add(new Slot(s, HOUR.format(start)));
            if (t.plusMinutes(props.schedule().slotMinutes()).isBefore(t)) break; // wrapped past midnight
        }
        return new DayAvailability(date, false, slots);
    }

    // ------------------------------------------------------------------ patient side

    public AppointmentDto bookByPatient(AuthUser me, BookRequest req) {
        User patient = users.findById(me.id()).orElseThrow(() -> ApiException.notFound("Patient"));
        String doctorId = resolveDoctorId(req.doctorId());
        Instant start = req.startAt();
        LocalDate day = start.atZone(props.zone()).toLocalDate();
        boolean slotOffered = availability(day, doctorId, req.type(), null).slots().stream()
                .anyMatch(s -> s.startAt().equals(start));
        if (!slotOffered) {
            throw ApiException.conflict("SLOT_UNAVAILABLE", "Ce créneau n'est plus disponible. Merci d'en choisir un autre.");
        }
        long upcoming = appointments.findByPatientIdOrderByStartAtDesc(patient.getId()).stream()
                .filter(a -> ACTIVE.contains(a.getStatus()) && a.getStartAt().isAfter(Instant.now())).count();
        if (upcoming >= 3) {
            throw ApiException.conflict("TOO_MANY_APPOINTMENTS",
                    "Vous avez déjà 3 rendez-vous à venir. Contactez le cabinet pour en planifier davantage.");
        }
        Appointment a = new Appointment();
        a.setPatientId(patient.getId());
        a.setDoctorId(doctorId);
        a.setType(req.type());
        a.setProcedure(req.procedure());
        a.setStartAt(start);
        a.setEndAt(start.plus(Duration.ofMinutes(req.type().durationMinutes())));
        a.setStatus(AppointmentStatus.PENDING);
        a.setPatientNote(AuthService.blankToNull(req.note()));
        a.setCreatedBy(patient.getId());
        appointments.save(a);
        email.notifyDoctorNewAppointment(a, patient);
        email.notifyPatientAppointment(a, patient, AppointmentEvent.REQUEST_RECEIVED);
        return toDto(a, true);
    }

    public List<AppointmentDto> forPatient(String patientId) {
        return toDtos(appointments.findByPatientIdOrderByStartAtDesc(patientId), false);
    }

    public AppointmentDto cancelByPatient(AuthUser me, String id, String reason) {
        Appointment a = load(id);
        if (!a.getPatientId().equals(me.id())) throw ApiException.notFound("Rendez-vous");
        if (!a.getStatus().isActive()) throw ApiException.badRequest("NOT_ACTIVE", "Ce rendez-vous ne peut plus être annulé.");
        int notice = props.schedule().patientCancelNoticeHours();
        if (a.getStartAt().isBefore(Instant.now().plus(Duration.ofHours(notice)))) {
            throw ApiException.badRequest("TOO_LATE",
                    "Les annulations en ligne sont possibles jusqu'à " + notice + " h avant le rendez-vous. Merci d'appeler le cabinet.");
        }
        a.setStatus(AppointmentStatus.CANCELLED);
        a.setCancelReason(AuthService.blankToNull(reason));
        appointments.save(a);
        users.findById(a.getPatientId()).ifPresent(p -> email.notifyDoctorAppointmentCancelled(a, p));
        return toDto(a, false);
    }

    // ------------------------------------------------------------------ doctor side

    public List<AppointmentDto> list(Instant from, Instant to, AppointmentStatus status, String patientId) {
        List<Appointment> list = patientId != null
                ? appointments.findByPatientIdOrderByStartAtDesc(patientId)
                : appointments.findByStartAtBetweenOrderByStartAtAsc(from, to);
        return toDtos(list.stream().filter(a -> status == null || a.getStatus() == status).toList(), true);
    }

    public AppointmentDto get(String id) {
        return toDto(load(id), true);
    }

    public AppointmentDto bookByDoctor(AuthUser me, DoctorBookRequest req) {
        User patient = users.findById(req.patientId())
                .filter(u -> u.getRole() == Role.PATIENT)
                .orElseThrow(() -> ApiException.notFound("Patient"));
        int minutes = req.durationMinutes() != null ? req.durationMinutes() : req.type().durationMinutes();
        String doctorId = me.role() == Role.DOCTOR ? me.id() : resolveDoctorId(null);
        Instant start = req.startAt();
        Instant end = start.plus(Duration.ofMinutes(minutes));
        if (start.isBefore(Instant.now().minus(Duration.ofMinutes(5)))) {
            throw ApiException.badRequest("PAST_DATE", "Impossible de planifier un rendez-vous dans le passé.");
        }
        ensureFree(doctorId, start, end, null);
        Appointment a = new Appointment();
        a.setPatientId(patient.getId());
        a.setDoctorId(doctorId);
        a.setType(req.type());
        a.setProcedure(req.procedure());
        a.setStartAt(start);
        a.setEndAt(end);
        a.setStatus(AppointmentStatus.CONFIRMED);
        a.setDoctorNote(AuthService.blankToNull(req.note()));
        a.setCreatedBy(me.id());
        appointments.save(a);
        if (req.notifyPatient()) email.notifyPatientAppointment(a, patient, AppointmentEvent.BOOKED_BY_CLINIC);
        return toDto(a, true);
    }

    public AppointmentDto reschedule(String id, RescheduleRequest req) {
        Appointment a = load(id);
        if (!a.getStatus().isActive()) {
            throw ApiException.badRequest("NOT_ACTIVE", "Seul un rendez-vous en attente ou confirmé peut être déplacé.");
        }
        long minutes = Duration.between(a.getStartAt(), a.getEndAt()).toMinutes();
        Instant start = req.startAt();
        Instant end = start.plus(Duration.ofMinutes(minutes));
        ensureFree(a.getDoctorId(), start, end, a.getId());
        a.setPreviousStartAt(a.getStartAt());
        a.setStartAt(start);
        a.setEndAt(end);
        a.setRescheduleCount(a.getRescheduleCount() + 1);
        a.setStatus(AppointmentStatus.CONFIRMED);
        if (req.reason() != null && !req.reason().isBlank()) {
            a.setDoctorNote(joinNote(a.getDoctorNote(), "Déplacé : " + req.reason().trim()));
        }
        appointments.save(a);
        if (req.notifyPatient()) {
            users.findById(a.getPatientId()).ifPresent(p -> email.notifyPatientAppointment(a, p, AppointmentEvent.RESCHEDULED));
        }
        return toDto(a, true);
    }

    public AppointmentDto updateStatus(String id, StatusRequest req) {
        Appointment a = load(id);
        AppointmentStatus previous = a.getStatus();
        a.setStatus(req.status());
        if (req.status() == AppointmentStatus.CANCELLED) a.setCancelReason(AuthService.blankToNull(req.reason()));
        appointments.save(a);
        if (previous != req.status() && (req.status() == AppointmentStatus.CONFIRMED || req.status() == AppointmentStatus.CANCELLED)) {
            AppointmentEvent event = req.status() == AppointmentStatus.CONFIRMED ? AppointmentEvent.CONFIRMED : AppointmentEvent.CANCELLED;
            users.findById(a.getPatientId()).ifPresent(p -> email.notifyPatientAppointment(a, p, event));
        }
        return toDto(a, true);
    }

    public AppointmentDto updateNote(String id, String note) {
        Appointment a = load(id);
        a.setDoctorNote(AuthService.blankToNull(note));
        return toDto(appointments.save(a), true);
    }

    public void delete(String id) {
        appointments.delete(load(id));
    }

    // ------------------------------------------------------------------ helpers

    String resolveDoctorId(String requested) {
        if (requested != null && !requested.isBlank()) {
            return users.findById(requested)
                    .filter(u -> u.getRole() == Role.DOCTOR && u.getStatus() == AccountStatus.ACTIVE)
                    .map(User::getId)
                    .orElseThrow(() -> ApiException.notFound("Docteur"));
        }
        return users.findByRoleAndStatus(Role.DOCTOR, AccountStatus.ACTIVE).stream()
                .min(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(User::getId)
                .orElseThrow(() -> ApiException.conflict("NO_DOCTOR", "Aucun docteur n'est disponible pour le moment."));
    }

    private void ensureFree(String doctorId, Instant start, Instant end, String excludeId) {
        if (!overlapping(doctorId, start, end, excludeId).isEmpty()) {
            throw ApiException.conflict("SLOT_CONFLICT", "Ce créneau chevauche un autre rendez-vous.");
        }
    }

    private List<Appointment> overlapping(String doctorId, Instant start, Instant end, String excludeId) {
        return appointments.findByDoctorIdAndStatusInAndStartAtLessThanAndEndAtGreaterThan(doctorId, ACTIVE, end, start)
                .stream().filter(a -> !a.getId().equals(excludeId)).toList();
    }

    private Appointment load(String id) {
        return appointments.findById(id).orElseThrow(() -> ApiException.notFound("Rendez-vous"));
    }

    private static String joinNote(String existing, String add) {
        return existing == null || existing.isBlank() ? add : existing + "\n" + add;
    }

    AppointmentDto toDto(Appointment a, boolean staffView) {
        return toDtos(List.of(a), staffView).getFirst();
    }

    List<AppointmentDto> toDtos(Collection<Appointment> list, boolean staffView) {
        Set<String> ids = list.stream()
                .flatMap(a -> java.util.stream.Stream.of(a.getPatientId(), a.getDoctorId()))
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, User> byId = users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return list.stream().map(a -> {
            User p = byId.get(a.getPatientId());
            User d = byId.get(a.getDoctorId());
            return new AppointmentDto(a.getId(),
                    ref(p, a.getPatientId(), staffView), ref(d, a.getDoctorId(), false),
                    a.getType(), a.getType() == null ? null : a.getType().label(),
                    a.getProcedure(), a.getProcedure() == null ? null : a.getProcedure().label(),
                    a.getStartAt(), a.getEndAt(), a.getStatus(),
                    a.getPatientNote(), staffView ? a.getDoctorNote() : null, a.getCancelReason(),
                    a.getRescheduleCount(), a.getPreviousStartAt(),
                    !Objects.equals(a.getCreatedBy(), a.getPatientId()), a.getCreatedAt());
        }).toList();
    }

    private static PersonRef ref(User u, String fallbackId, boolean withContact) {
        if (u == null) return new PersonRef(fallbackId, "Utilisateur supprimé", null, null, false);
        String name = u.getRole() == Role.DOCTOR ? "Dr " + u.fullName() : u.fullName();
        return new PersonRef(u.getId(), name, withContact ? u.getEmail() : null, withContact ? u.getPhone() : null, u.isHasAccount());
    }
}
