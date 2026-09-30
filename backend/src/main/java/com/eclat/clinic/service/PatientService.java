package com.eclat.clinic.service;

import com.eclat.clinic.dto.UserDtos.PageDto;
import com.eclat.clinic.dto.UserDtos.PatientDto;
import com.eclat.clinic.dto.UserDtos.PatientUpsertRequest;
import com.eclat.clinic.model.Appointment;
import com.eclat.clinic.model.MessageThread;
import com.eclat.clinic.model.Role;
import com.eclat.clinic.model.User;
import com.eclat.clinic.repository.AppointmentRepository;
import com.eclat.clinic.repository.MessageRepository;
import com.eclat.clinic.repository.ThreadRepository;
import com.eclat.clinic.repository.UserRepository;
import com.eclat.clinic.security.AuthUser;
import com.eclat.clinic.web.ApiException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class PatientService {

    private final UserRepository users;
    private final AppointmentRepository appointments;
    private final ThreadRepository threads;
    private final MessageRepository messages;
    private final MongoTemplate mongo;
    private final TokenService tokens;
    private final EmailService email;

    public PatientService(UserRepository users, AppointmentRepository appointments, ThreadRepository threads,
                          MessageRepository messages, MongoTemplate mongo, TokenService tokens, EmailService email) {
        this.users = users;
        this.appointments = appointments;
        this.threads = threads;
        this.messages = messages;
        this.mongo = mongo;
        this.tokens = tokens;
        this.email = email;
    }

    /** Simple case-insensitive text search (first name, last name, email, phone). */
    static Criteria textCriteria(String q) {
        String safe = Pattern.quote(q.trim());
        return new Criteria().orOperator(
                Criteria.where("firstName").regex(safe, "i"),
                Criteria.where("lastName").regex(safe, "i"),
                Criteria.where("email").regex(safe, "i"),
                Criteria.where("phone").regex(safe, "i"));
    }

    public PageDto<PatientDto> search(String q, String account, int page, int size) {
        Criteria c = Criteria.where("role").is(Role.PATIENT);
        if ("with".equals(account)) c = c.and("hasAccount").is(true);
        if ("without".equals(account)) c = c.and("hasAccount").is(false);
        Query query = new Query(c);
        if (q != null && !q.isBlank()) query.addCriteria(textCriteria(q));
        long total = mongo.count(query, User.class);
        query.with(Sort.by(Sort.Direction.ASC, "lastName", "firstName")).skip((long) page * size).limit(size);
        List<User> list = mongo.find(query, User.class);
        return new PageDto<>(toDtos(list), total, page, size);
    }

    public PatientDto get(String id) {
        return toDtos(List.of(loadPatient(id))).getFirst();
    }

    public PatientDto create(AuthUser me, PatientUpsertRequest req) {
        String mail = AuthService.normalizeEmail(req.email());
        if (mail != null && users.existsByEmail(mail)) {
            throw ApiException.conflict("EMAIL_TAKEN", "Un utilisateur utilise déjà cette adresse email.");
        }
        User u = new User();
        apply(u, req);
        u.setEmail(mail);
        u.setRole(Role.PATIENT);
        u.setHasAccount(false);
        u.setCreatedBy(me.id());
        return toDtos(List.of(users.save(u))).getFirst();
    }

    public PatientDto update(String id, PatientUpsertRequest req) {
        User u = loadPatient(id);
        String mail = AuthService.normalizeEmail(req.email());
        if (u.isHasAccount() && mail == null) {
            throw ApiException.badRequest("EMAIL_REQUIRED", "L'email est obligatoire pour un patient disposant d'un compte.");
        }
        if (mail != null && !mail.equals(u.getEmail()) && users.existsByEmail(mail)) {
            throw ApiException.conflict("EMAIL_TAKEN", "Un utilisateur utilise déjà cette adresse email.");
        }
        apply(u, req);
        u.setEmail(mail);
        return toDtos(List.of(users.save(u))).getFirst();
    }

    /** Sends a patient without an account a link to set their password. */
    public void invite(String id) {
        User u = loadPatient(id);
        if (u.isHasAccount()) throw ApiException.badRequest("ALREADY_ACTIVE", "Ce patient possède déjà un compte.");
        if (u.getEmail() == null) throw ApiException.badRequest("EMAIL_REQUIRED", "Ajoutez d'abord une adresse email au dossier.");
        email.sendPasswordLink(u, tokens.issueLink(u, Duration.ofDays(7)), true);
    }

    /** The doctor can only delete records without an account; accounts are managed by the admin. */
    public void delete(String id) {
        User u = loadPatient(id);
        if (u.isHasAccount()) {
            throw ApiException.forbidden("HAS_ACCOUNT", "Ce patient possède un compte : seul un administrateur peut le supprimer.");
        }
        purge(u.getId());
        users.delete(u);
    }

    /** Deletes a patient's related data (appointments, threads). */
    void purge(String patientId) {
        appointments.deleteByPatientId(patientId);
        for (MessageThread t : threads.findByPatientId(patientId)) {
            messages.deleteByThreadId(t.getId());
            threads.delete(t);
        }
    }

    private User loadPatient(String id) {
        return users.findById(id).filter(u -> u.getRole() == Role.PATIENT)
                .orElseThrow(() -> ApiException.notFound("Patient"));
    }

    private static void apply(User u, PatientUpsertRequest req) {
        u.setFirstName(req.firstName().trim());
        u.setLastName(req.lastName().trim());
        u.setPhone(AuthService.blankToNull(req.phone()));
        u.setDateOfBirth(req.dateOfBirth());
        u.setGender(AuthService.blankToNull(req.gender()));
        u.setAddress(AuthService.blankToNull(req.address()));
        u.setCity(AuthService.blankToNull(req.city()));
        u.setPostalCode(AuthService.blankToNull(req.postalCode()));
        u.setMedicalNotes(AuthService.blankToNull(req.medicalNotes()));
    }

    private List<PatientDto> toDtos(Collection<User> list) {
        List<String> ids = list.stream().map(User::getId).toList();
        Map<String, List<Appointment>> byPatient = mongo.find(
                        new Query(Criteria.where("patientId").in(ids)), Appointment.class).stream()
                .collect(Collectors.groupingBy(Appointment::getPatientId));
        Instant now = Instant.now();
        return list.stream().map(u -> {
            List<Appointment> appts = byPatient.getOrDefault(u.getId(), List.of());
            Instant next = appts.stream()
                    .filter(a -> AppointmentService.ACTIVE.contains(a.getStatus()) && a.getStartAt().isAfter(now))
                    .map(Appointment::getStartAt).min(Comparator.naturalOrder()).orElse(null);
            Instant last = appts.stream().map(Appointment::getStartAt).filter(s -> s.isBefore(now))
                    .max(Comparator.naturalOrder()).orElse(null);
            boolean invitationPending = !u.isHasAccount() && u.getTokenExpiresAt() != null && u.getTokenExpiresAt().isAfter(now);
            return new PatientDto(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(),
                    u.getStatus(), u.isHasAccount(), invitationPending, u.getDateOfBirth(), u.getGender(),
                    u.getAddress(), u.getCity(), u.getPostalCode(), u.getMedicalNotes(), appts.size(), next, last,
                    u.getCreatedAt(), u.getLastLoginAt());
        }).toList();
    }
}
