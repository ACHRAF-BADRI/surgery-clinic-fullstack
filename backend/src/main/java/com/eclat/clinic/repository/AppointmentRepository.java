package com.eclat.clinic.repository;

import com.eclat.clinic.model.Appointment;
import com.eclat.clinic.model.AppointmentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {

    List<Appointment> findByPatientIdOrderByStartAtDesc(String patientId);

    List<Appointment> findByStartAtBetweenOrderByStartAtAsc(Instant from, Instant to);

    List<Appointment> findByDoctorIdAndStatusInAndStartAtLessThanAndEndAtGreaterThan(
            String doctorId, Collection<AppointmentStatus> statuses, Instant end, Instant start);

    List<Appointment> findByStartAtAfterAndStatusInOrderByStartAtAsc(Instant after, Collection<AppointmentStatus> statuses);

    long countByStatus(AppointmentStatus status);

    long countByPatientId(String patientId);

    void deleteByPatientId(String patientId);
}
