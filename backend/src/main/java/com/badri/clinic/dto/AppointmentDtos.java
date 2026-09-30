package com.badri.clinic.dto;

import com.badri.clinic.model.AppointmentStatus;
import com.badri.clinic.model.AppointmentType;
import com.badri.clinic.model.Procedure;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class AppointmentDtos {

    private AppointmentDtos() {}

    public record PersonRef(String id, String name, String email, String phone, boolean hasAccount) {}

    public record AppointmentDto(String id, PersonRef patient, PersonRef doctor,
                                 AppointmentType type, String typeLabel,
                                 Procedure procedure, String procedureLabel,
                                 Instant startAt, Instant endAt, AppointmentStatus status,
                                 String patientNote, String doctorNote, String cancelReason,
                                 int rescheduleCount, Instant previousStartAt,
                                 boolean bookedByClinic, Instant createdAt) {}

    public record BookRequest(
            @NotNull AppointmentType type,
            Procedure procedure,
            @NotNull Instant startAt,
            String doctorId,
            @Size(max = 1000) String note) {}

    public record DoctorBookRequest(
            @NotBlank String patientId,
            @NotNull AppointmentType type,
            Procedure procedure,
            @NotNull Instant startAt,
            @Min(15) @Max(480) Integer durationMinutes,
            @Size(max = 1000) String note,
            boolean notifyPatient) {}

    public record RescheduleRequest(
            @NotNull Instant startAt,
            @Size(max = 300) String reason,
            boolean notifyPatient) {}

    public record StatusRequest(@NotNull AppointmentStatus status, @Size(max = 300) String reason) {}

    public record NoteRequest(@Size(max = 3000) String doctorNote) {}

    public record CancelRequest(@Size(max = 300) String reason) {}

    public record Slot(Instant startAt, String label) {}

    public record DayAvailability(LocalDate date, boolean closed, List<Slot> slots) {}
}
