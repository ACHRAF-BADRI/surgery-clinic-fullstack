package com.badri.clinic.web;

import com.badri.clinic.dto.AppointmentDtos.AppointmentDto;
import com.badri.clinic.dto.AppointmentDtos.DayAvailability;
import com.badri.clinic.dto.AppointmentDtos.DoctorBookRequest;
import com.badri.clinic.dto.AppointmentDtos.NoteRequest;
import com.badri.clinic.dto.AppointmentDtos.RescheduleRequest;
import com.badri.clinic.dto.AppointmentDtos.StatusRequest;
import com.badri.clinic.dto.DashboardDtos.DoctorDashboard;
import com.badri.clinic.dto.MessageDtos.NewThreadRequest;
import com.badri.clinic.dto.MessageDtos.ReplyRequest;
import com.badri.clinic.dto.MessageDtos.ThreadDetail;
import com.badri.clinic.dto.MessageDtos.ThreadDto;
import com.badri.clinic.dto.MessageDtos.ThreadStatusRequest;
import com.badri.clinic.dto.UserDtos.PageDto;
import com.badri.clinic.dto.UserDtos.PatientDto;
import com.badri.clinic.dto.UserDtos.PatientUpsertRequest;
import com.badri.clinic.model.AppointmentStatus;
import com.badri.clinic.model.AppointmentType;
import com.badri.clinic.security.AuthUser;
import com.badri.clinic.service.AppointmentService;
import com.badri.clinic.service.DashboardService;
import com.badri.clinic.service.MessagingService;
import com.badri.clinic.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Doctor area (also accessible to the admin). */
@RestController
@RequestMapping("/api/doctor")
public class DoctorController {

    private final DashboardService dashboard;
    private final PatientService patients;
    private final AppointmentService appointments;
    private final MessagingService messaging;

    public DoctorController(DashboardService dashboard, PatientService patients, AppointmentService appointments,
                            MessagingService messaging) {
        this.dashboard = dashboard;
        this.patients = patients;
        this.appointments = appointments;
        this.messaging = messaging;
    }

    @GetMapping("/dashboard")
    public DoctorDashboard dashboard() {
        return dashboard.doctor();
    }

    // ---------------------------------------------------------------- patients

    @GetMapping("/patients")
    public PageDto<PatientDto> patients(@RequestParam(required = false) String q,
                                        @RequestParam(required = false) String account,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return patients.search(q, account, Math.max(page, 0), Math.clamp(size, 1, 100));
    }

    @PostMapping("/patients")
    @ResponseStatus(HttpStatus.CREATED)
    public PatientDto createPatient(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody PatientUpsertRequest req) {
        return patients.create(me, req);
    }

    @GetMapping("/patients/{id}")
    public PatientDto patient(@PathVariable String id) {
        return patients.get(id);
    }

    @PutMapping("/patients/{id}")
    public PatientDto updatePatient(@PathVariable String id, @Valid @RequestBody PatientUpsertRequest req) {
        return patients.update(id, req);
    }

    @DeleteMapping("/patients/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePatient(@PathVariable String id) {
        patients.delete(id);
    }

    @PostMapping("/patients/{id}/invite")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void invite(@PathVariable String id) {
        patients.invite(id);
    }

    @GetMapping("/patients/{id}/appointments")
    public List<AppointmentDto> patientAppointments(@PathVariable String id) {
        return appointments.list(null, null, null, id);
    }

    @PostMapping("/patients/{id}/threads")
    @ResponseStatus(HttpStatus.CREATED)
    public ThreadDetail writeToPatient(@AuthenticationPrincipal AuthUser me, @PathVariable String id,
                                       @Valid @RequestBody NewThreadRequest req) {
        return messaging.doctorStart(me, id, req);
    }

    // ---------------------------------------------------------------- appointments

    @GetMapping("/appointments")
    public List<AppointmentDto> appointments(@RequestParam Instant from, @RequestParam Instant to,
                                             @RequestParam(required = false) AppointmentStatus status) {
        return appointments.list(from, to, status, null);
    }

    @GetMapping("/availability")
    public DayAvailability availability(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                        @RequestParam(required = false) AppointmentType type,
                                        @RequestParam(required = false) String excludeId) {
        return appointments.availability(date, null, type, excludeId);
    }

    @PostMapping("/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentDto book(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody DoctorBookRequest req) {
        return appointments.bookByDoctor(me, req);
    }

    @GetMapping("/appointments/{id}")
    public AppointmentDto appointment(@PathVariable String id) {
        return appointments.get(id);
    }

    @PatchMapping("/appointments/{id}/reschedule")
    public AppointmentDto reschedule(@PathVariable String id, @Valid @RequestBody RescheduleRequest req) {
        return appointments.reschedule(id, req);
    }

    @PatchMapping("/appointments/{id}/status")
    public AppointmentDto status(@PathVariable String id, @Valid @RequestBody StatusRequest req) {
        return appointments.updateStatus(id, req);
    }

    @PatchMapping("/appointments/{id}/note")
    public AppointmentDto note(@PathVariable String id, @Valid @RequestBody NoteRequest req) {
        return appointments.updateNote(id, req.doctorNote());
    }

    @DeleteMapping("/appointments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAppointment(@PathVariable String id) {
        appointments.delete(id);
    }

    // ---------------------------------------------------------------- messaging

    @GetMapping("/threads")
    public List<ThreadDto> threads(@RequestParam(required = false) String filter) {
        return messaging.doctorThreads(filter);
    }

    @GetMapping("/threads/{id}")
    public ThreadDetail thread(@PathVariable String id) {
        return messaging.doctorGet(id);
    }

    @PostMapping("/threads/{id}/messages")
    public ThreadDetail reply(@AuthenticationPrincipal AuthUser me, @PathVariable String id, @Valid @RequestBody ReplyRequest req) {
        return messaging.doctorReply(me, id, req.body());
    }

    @PatchMapping("/threads/{id}/status")
    public ThreadDto threadStatus(@PathVariable String id, @Valid @RequestBody ThreadStatusRequest req) {
        return messaging.doctorSetStatus(id, req.status());
    }

    @DeleteMapping("/threads/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteThread(@PathVariable String id) {
        messaging.doctorDelete(id);
    }
}
