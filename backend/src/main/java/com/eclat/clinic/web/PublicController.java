package com.eclat.clinic.web;

import com.eclat.clinic.dto.AppointmentDtos.DayAvailability;
import com.eclat.clinic.dto.CatalogDtos.ClinicInfo;
import com.eclat.clinic.dto.MessageDtos.GuestMessageRequest;
import com.eclat.clinic.model.AppointmentType;
import com.eclat.clinic.service.AppointmentService;
import com.eclat.clinic.service.CatalogService;
import com.eclat.clinic.service.MessagingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
public class PublicController {

    private final CatalogService catalog;
    private final AppointmentService appointments;
    private final MessagingService messaging;

    public PublicController(CatalogService catalog, AppointmentService appointments, MessagingService messaging) {
        this.catalog = catalog;
        this.appointments = appointments;
        this.messaging = messaging;
    }

    /** Lightweight ping used by Render (health check) and to wake up the free instance. */
    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @GetMapping("/api/public/clinic")
    public ClinicInfo clinic() {
        return catalog.info();
    }

    @GetMapping("/api/public/availability")
    public DayAvailability availability(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                        @RequestParam(required = false) AppointmentType type,
                                        @RequestParam(required = false) String doctorId) {
        return appointments.availability(date, doctorId, type, null);
    }

    /** Contact form available without an account. */
    @PostMapping("/api/public/messages")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void guestMessage(@Valid @RequestBody GuestMessageRequest req, HttpServletRequest http) {
        messaging.guestMessage(req, http.getRemoteAddr());
    }
}
