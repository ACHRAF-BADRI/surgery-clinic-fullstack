package com.badri.clinic.dto;

import com.badri.clinic.model.AppointmentType;
import com.badri.clinic.model.Procedure;

import java.util.List;

public final class CatalogDtos {

    private CatalogDtos() {}

    public record ProcedureDto(Procedure code, String label, String category, String description) {
        public static ProcedureDto of(Procedure p) {
            return new ProcedureDto(p, p.label(), p.category(), p.description());
        }
    }

    public record AppointmentTypeDto(AppointmentType code, String label, int durationMinutes) {
        public static AppointmentTypeDto of(AppointmentType t) {
            return new AppointmentTypeDto(t, t.label(), t.durationMinutes());
        }
    }

    public record DoctorDto(String id, String name) {}

    public record OpeningHours(String day, String hours) {}

    public record ClinicInfo(String name, String timeZone, List<DoctorDto> doctors,
                             List<ProcedureDto> procedures, List<AppointmentTypeDto> appointmentTypes,
                             List<OpeningHours> openingHours) {}
}
