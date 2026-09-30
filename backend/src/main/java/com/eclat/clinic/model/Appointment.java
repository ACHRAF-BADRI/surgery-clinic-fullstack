package com.eclat.clinic.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("appointments")
public class Appointment {

    @Id
    private String id;
    @Indexed
    private String patientId;
    @Indexed
    private String doctorId;
    private AppointmentType type;
    private Procedure procedure;
    @Indexed
    private Instant startAt;
    private Instant endAt;
    private AppointmentStatus status = AppointmentStatus.PENDING;
    private String patientNote;
    private String doctorNote;
    private String cancelReason;
    private int rescheduleCount;
    private Instant previousStartAt;
    /** Id of the user who created the appointment (patient or doctor). */
    private String createdBy;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }
    public AppointmentType getType() { return type; }
    public void setType(AppointmentType type) { this.type = type; }
    public Procedure getProcedure() { return procedure; }
    public void setProcedure(Procedure procedure) { this.procedure = procedure; }
    public Instant getStartAt() { return startAt; }
    public void setStartAt(Instant startAt) { this.startAt = startAt; }
    public Instant getEndAt() { return endAt; }
    public void setEndAt(Instant endAt) { this.endAt = endAt; }
    public AppointmentStatus getStatus() { return status; }
    public void setStatus(AppointmentStatus status) { this.status = status; }
    public String getPatientNote() { return patientNote; }
    public void setPatientNote(String patientNote) { this.patientNote = patientNote; }
    public String getDoctorNote() { return doctorNote; }
    public void setDoctorNote(String doctorNote) { this.doctorNote = doctorNote; }
    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }
    public int getRescheduleCount() { return rescheduleCount; }
    public void setRescheduleCount(int rescheduleCount) { this.rescheduleCount = rescheduleCount; }
    public Instant getPreviousStartAt() { return previousStartAt; }
    public void setPreviousStartAt(Instant previousStartAt) { this.previousStartAt = previousStartAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
