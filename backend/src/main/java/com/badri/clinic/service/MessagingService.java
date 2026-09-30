package com.badri.clinic.service;

import com.badri.clinic.dto.MessageDtos.GuestMessageRequest;
import com.badri.clinic.dto.MessageDtos.MessageDto;
import com.badri.clinic.dto.MessageDtos.NewThreadRequest;
import com.badri.clinic.dto.MessageDtos.ThreadDetail;
import com.badri.clinic.dto.MessageDtos.ThreadDto;
import com.badri.clinic.model.Message;
import com.badri.clinic.model.MessageThread;
import com.badri.clinic.model.Role;
import com.badri.clinic.model.ThreadStatus;
import com.badri.clinic.model.User;
import com.badri.clinic.repository.MessageRepository;
import com.badri.clinic.repository.ThreadRepository;
import com.badri.clinic.repository.UserRepository;
import com.badri.clinic.security.AuthUser;
import com.badri.clinic.web.ApiException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MessagingService {

    private final ThreadRepository threads;
    private final MessageRepository messages;
    private final UserRepository users;
    private final EmailService email;
    private final RateLimiter limiter;

    public MessagingService(ThreadRepository threads, MessageRepository messages, UserRepository users,
                            EmailService email, RateLimiter limiter) {
        this.threads = threads;
        this.messages = messages;
        this.users = users;
        this.email = email;
        this.limiter = limiter;
    }

    // ------------------------------------------------------------------ guest

    public void guestMessage(GuestMessageRequest req, String clientIp) {
        if (req.website() != null && !req.website().isBlank()) return; // bot: silently ignored
        limiter.check("guest-msg:" + clientIp, 5, Duration.ofHours(1));
        MessageThread t = new MessageThread();
        t.setGuestName(req.name().trim());
        t.setGuestEmail(AuthService.normalizeEmail(req.email()));
        t.setGuestPhone(AuthService.blankToNull(req.phone()));
        t.setSubject(req.subject().trim());
        t.setProcedure(req.procedure());
        threads.save(t);
        Message m = append(t, Message.Sender.GUEST, null, t.getGuestName(), req.body());
        email.notifyDoctorNewMessage(t, t.getGuestName(), t.getGuestEmail(), m.getBody(), true);
    }

    // ------------------------------------------------------------------ patient

    public List<ThreadDto> patientThreads(AuthUser me) {
        return toDtos(threads.findByPatientIdOrderByLastMessageAtDesc(me.id()), false);
    }

    public ThreadDetail patientCreate(AuthUser me, NewThreadRequest req) {
        limiter.check("patient-thread:" + me.id(), 10, Duration.ofHours(1));
        User p = loadUser(me.id());
        MessageThread t = new MessageThread();
        t.setPatientId(p.getId());
        t.setSubject(req.subject().trim());
        t.setProcedure(req.procedure());
        threads.save(t);
        Message m = append(t, Message.Sender.PATIENT, p.getId(), p.fullName(), req.body());
        email.notifyDoctorNewMessage(t, p.fullName(), p.getEmail(), m.getBody(), true);
        return detail(t, false);
    }

    public ThreadDetail patientGet(AuthUser me, String id) {
        MessageThread t = patientThread(me, id);
        if (t.getUnreadForPatient() > 0) {
            t.setUnreadForPatient(0);
            threads.save(t);
        }
        return detail(t, false);
    }

    public ThreadDetail patientReply(AuthUser me, String id, String body) {
        limiter.check("patient-reply:" + me.id(), 30, Duration.ofHours(1));
        MessageThread t = patientThread(me, id);
        User p = loadUser(me.id());
        t.setStatus(ThreadStatus.OPEN);
        Message m = append(t, Message.Sender.PATIENT, p.getId(), p.fullName(), body);
        email.notifyDoctorNewMessage(t, p.fullName(), p.getEmail(), m.getBody(), false);
        return detail(t, false);
    }

    public long patientUnread(AuthUser me) {
        return threads.findByPatientId(me.id()).stream().filter(t -> t.getUnreadForPatient() > 0).count();
    }

    // ------------------------------------------------------------------ doctor

    public List<ThreadDto> doctorThreads(String filter) {
        return toDtos(threads.findAllByOrderByLastMessageAtDesc().stream().filter(t -> switch (filter == null ? "all" : filter) {
            case "unread" -> t.getUnreadForDoctor() > 0;
            case "open" -> t.getStatus() == ThreadStatus.OPEN;
            case "closed" -> t.getStatus() == ThreadStatus.CLOSED;
            case "guest" -> t.isGuest();
            default -> true;
        }).toList(), true);
    }

    public ThreadDetail doctorGet(String id) {
        MessageThread t = load(id);
        if (t.getUnreadForDoctor() > 0) {
            t.setUnreadForDoctor(0);
            threads.save(t);
        }
        return detail(t, true);
    }

    public ThreadDetail doctorStart(AuthUser me, String patientId, NewThreadRequest req) {
        User p = users.findById(patientId).filter(u -> u.getRole() == Role.PATIENT)
                .orElseThrow(() -> ApiException.notFound("Patient"));
        if (!p.isHasAccount() && p.getEmail() == null) {
            throw ApiException.badRequest("NO_CONTACT", "Ce patient n'a ni compte ni email : impossible de lui écrire.");
        }
        MessageThread t = new MessageThread();
        t.setPatientId(p.getId());
        t.setSubject(req.subject().trim());
        t.setProcedure(req.procedure());
        threads.save(t);
        Message m = append(t, Message.Sender.DOCTOR, me.id(), me.name(), req.body());
        notifyRecipient(t, p, m.getBody());
        return detail(t, true);
    }

    public ThreadDetail doctorReply(AuthUser me, String id, String body) {
        MessageThread t = load(id);
        Message m = append(t, Message.Sender.DOCTOR, me.id(), me.name(), body);
        User patient = t.getPatientId() == null ? null : users.findById(t.getPatientId()).orElse(null);
        notifyRecipient(t, patient, m.getBody());
        return detail(t, true);
    }

    public ThreadDto doctorSetStatus(String id, ThreadStatus status) {
        MessageThread t = load(id);
        t.setStatus(status);
        return toDtos(List.of(threads.save(t)), true).getFirst();
    }

    public void doctorDelete(String id) {
        MessageThread t = load(id);
        messages.deleteByThreadId(t.getId());
        threads.delete(t);
    }

    // ------------------------------------------------------------------ internal

    private void notifyRecipient(MessageThread t, User patient, String body) {
        if (patient != null) {
            if (patient.getEmail() != null) {
                email.sendReply(patient.getEmail(), patient.getFirstName(), t.getSubject(), body, patient.isHasAccount());
            }
        } else if (t.getGuestEmail() != null) {
            email.sendReply(t.getGuestEmail(), t.getGuestName(), t.getSubject(), body, false);
        }
    }

    private Message append(MessageThread t, Message.Sender sender, String senderId, String senderName, String body) {
        Message m = new Message();
        m.setThreadId(t.getId());
        m.setSender(sender);
        m.setSenderId(senderId);
        m.setSenderName(senderName);
        m.setBody(body.trim());
        messages.save(m);
        t.setLastMessageAt(Instant.now());
        t.setLastMessagePreview(preview(m.getBody()));
        // Replying counts as reading: the sender's unread counter is reset.
        if (sender == Message.Sender.DOCTOR) {
            t.setUnreadForPatient(t.getUnreadForPatient() + 1);
            t.setUnreadForDoctor(0);
        } else {
            t.setUnreadForDoctor(t.getUnreadForDoctor() + 1);
            t.setUnreadForPatient(0);
        }
        threads.save(t);
        return m;
    }

    private static String preview(String body) {
        String flat = body.replaceAll("\\s+", " ").trim();
        return flat.length() > 140 ? flat.substring(0, 139) + "…" : flat;
    }

    private MessageThread patientThread(AuthUser me, String id) {
        return threads.findById(id).filter(t -> me.id().equals(t.getPatientId()))
                .orElseThrow(() -> ApiException.notFound("Conversation"));
    }

    private MessageThread load(String id) {
        return threads.findById(id).orElseThrow(() -> ApiException.notFound("Conversation"));
    }

    private User loadUser(String id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Utilisateur"));
    }

    private ThreadDetail detail(MessageThread t, boolean doctorView) {
        List<MessageDto> list = messages.findByThreadIdOrderByCreatedAtAsc(t.getId()).stream().map(MessageDto::of).toList();
        return new ThreadDetail(toDtos(List.of(t), doctorView).getFirst(), list);
    }

    private List<ThreadDto> toDtos(Collection<MessageThread> list, boolean doctorView) {
        Map<String, User> patients = users.findAllById(list.stream().map(MessageThread::getPatientId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return list.stream().map(t -> {
            User p = t.getPatientId() == null ? null : patients.get(t.getPatientId());
            String name = p != null ? p.fullName() : t.getGuestName();
            String mail = p != null ? p.getEmail() : t.getGuestEmail();
            String phone = p != null ? p.getPhone() : t.getGuestPhone();
            return new ThreadDto(t.getId(), t.getPatientId(), name, doctorView ? mail : null, doctorView ? phone : null,
                    t.isGuest(), t.getSubject(), t.getProcedure(), t.getProcedure() == null ? null : t.getProcedure().label(),
                    t.getStatus(), doctorView ? t.getUnreadForDoctor() : t.getUnreadForPatient(),
                    t.getLastMessagePreview(), t.getLastMessageAt(), t.getCreatedAt());
        }).toList();
    }
}
