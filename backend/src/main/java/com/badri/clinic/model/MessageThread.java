package com.badri.clinic.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Conversation between the clinic and a patient (signed in) or a guest visitor.
 * For a guest, contact details are stored on the thread and the doctor's replies
 * are sent by email.
 */
@Document("threads")
public class MessageThread {

    @Id
    private String id;
    @Indexed
    private String patientId;
    private String guestName;
    private String guestEmail;
    private String guestPhone;
    private String subject;
    private Procedure procedure;
    private ThreadStatus status = ThreadStatus.OPEN;
    private int unreadForDoctor;
    private int unreadForPatient;
    private String lastMessagePreview;
    @Indexed
    private Instant lastMessageAt;
    @CreatedDate
    private Instant createdAt;

    public boolean isGuest() {
        return patientId == null;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }
    public String getGuestEmail() { return guestEmail; }
    public void setGuestEmail(String guestEmail) { this.guestEmail = guestEmail; }
    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public Procedure getProcedure() { return procedure; }
    public void setProcedure(Procedure procedure) { this.procedure = procedure; }
    public ThreadStatus getStatus() { return status; }
    public void setStatus(ThreadStatus status) { this.status = status; }
    public int getUnreadForDoctor() { return unreadForDoctor; }
    public void setUnreadForDoctor(int unreadForDoctor) { this.unreadForDoctor = unreadForDoctor; }
    public int getUnreadForPatient() { return unreadForPatient; }
    public void setUnreadForPatient(int unreadForPatient) { this.unreadForPatient = unreadForPatient; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public void setLastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
