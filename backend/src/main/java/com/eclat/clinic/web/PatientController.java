package com.eclat.clinic.web;

import com.eclat.clinic.dto.AppointmentDtos.AppointmentDto;
import com.eclat.clinic.dto.AppointmentDtos.BookRequest;
import com.eclat.clinic.dto.AppointmentDtos.CancelRequest;
import com.eclat.clinic.dto.MessageDtos.NewThreadRequest;
import com.eclat.clinic.dto.MessageDtos.ReplyRequest;
import com.eclat.clinic.dto.MessageDtos.ThreadDetail;
import com.eclat.clinic.dto.MessageDtos.ThreadDto;
import com.eclat.clinic.security.AuthUser;
import com.eclat.clinic.service.AppointmentService;
import com.eclat.clinic.service.MessagingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patient")
public class PatientController {

    private final AppointmentService appointments;
    private final MessagingService messaging;

    public PatientController(AppointmentService appointments, MessagingService messaging) {
        this.appointments = appointments;
        this.messaging = messaging;
    }

    @GetMapping("/appointments")
    public List<AppointmentDto> myAppointments(@AuthenticationPrincipal AuthUser me) {
        return appointments.forPatient(me.id());
    }

    @PostMapping("/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentDto book(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody BookRequest req) {
        return appointments.bookByPatient(me, req);
    }

    @PostMapping("/appointments/{id}/cancel")
    public AppointmentDto cancel(@AuthenticationPrincipal AuthUser me, @PathVariable String id,
                                 @Valid @RequestBody(required = false) CancelRequest req) {
        return appointments.cancelByPatient(me, id, req == null ? null : req.reason());
    }

    @GetMapping("/threads")
    public List<ThreadDto> threads(@AuthenticationPrincipal AuthUser me) {
        return messaging.patientThreads(me);
    }

    @GetMapping("/threads/unread-count")
    public Map<String, Long> unread(@AuthenticationPrincipal AuthUser me) {
        return Map.of("count", messaging.patientUnread(me));
    }

    @PostMapping("/threads")
    @ResponseStatus(HttpStatus.CREATED)
    public ThreadDetail newThread(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody NewThreadRequest req) {
        return messaging.patientCreate(me, req);
    }

    @GetMapping("/threads/{id}")
    public ThreadDetail thread(@AuthenticationPrincipal AuthUser me, @PathVariable String id) {
        return messaging.patientGet(me, id);
    }

    @PostMapping("/threads/{id}/messages")
    public ThreadDetail reply(@AuthenticationPrincipal AuthUser me, @PathVariable String id, @Valid @RequestBody ReplyRequest req) {
        return messaging.patientReply(me, id, req.body());
    }
}
