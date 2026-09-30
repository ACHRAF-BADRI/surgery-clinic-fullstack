package com.badri.clinic.service;

import com.badri.clinic.config.AppProperties;
import com.badri.clinic.dto.CatalogDtos.AppointmentTypeDto;
import com.badri.clinic.dto.CatalogDtos.ClinicInfo;
import com.badri.clinic.dto.CatalogDtos.DoctorDto;
import com.badri.clinic.dto.CatalogDtos.OpeningHours;
import com.badri.clinic.dto.CatalogDtos.ProcedureDto;
import com.badri.clinic.model.AccountStatus;
import com.badri.clinic.model.AppointmentType;
import com.badri.clinic.model.Procedure;
import com.badri.clinic.model.Role;
import com.badri.clinic.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.util.Arrays;
import java.util.List;

@Service
public class CatalogService {

    private final UserRepository users;
    private final AppProperties props;

    public CatalogService(UserRepository users, AppProperties props) {
        this.users = users;
        this.props = props;
    }

    public ClinicInfo info() {
        List<DoctorDto> doctors = users.findByRoleAndStatus(Role.DOCTOR, AccountStatus.ACTIVE).stream()
                .map(u -> new DoctorDto(u.getId(), "Dr " + u.fullName())).toList();
        List<OpeningHours> hours = Arrays.stream(DayOfWeek.values()).map(d -> {
            String h = props.schedule().hours().getOrDefault(d, "");
            if (h == null || h.isBlank()) return new OpeningHours(d.name(), null, null);
            String[] range = h.split("-");
            return new OpeningHours(d.name(), range[0].trim(), range[1].trim());
        }).toList();
        return new ClinicInfo(props.clinicName(), props.timeZone(), doctors,
                Arrays.stream(Procedure.values()).map(ProcedureDto::of).toList(),
                Arrays.stream(AppointmentType.values()).map(AppointmentTypeDto::of).toList(),
                hours);
    }
}
