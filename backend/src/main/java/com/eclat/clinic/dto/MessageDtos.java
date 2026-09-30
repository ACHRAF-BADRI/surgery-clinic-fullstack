package com.eclat.clinic.dto;

import com.eclat.clinic.model.Message;
import com.eclat.clinic.model.Procedure;
import com.eclat.clinic.model.ThreadStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

import static com.eclat.clinic.dto.AuthDtos.PHONE_RULE;

public final class MessageDtos {

    private MessageDtos() {}

    public record ThreadDto(String id, String patientId, String participantName, String participantEmail,
                            String participantPhone, boolean guest, String subject, Procedure procedure,
                            String procedureLabel, ThreadStatus status, int unread,
                            String lastMessagePreview, Instant lastMessageAt, Instant createdAt) {}

    public record MessageDto(String id, Message.Sender sender, String senderName, String body, Instant createdAt) {

        public static MessageDto of(Message m) {
            return new MessageDto(m.getId(), m.getSender(), m.getSenderName(), m.getBody(), m.getCreatedAt());
        }
    }

    public record ThreadDetail(ThreadDto thread, List<MessageDto> messages) {}

    public record GuestMessageRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 120) String email,
            @Pattern(regexp = PHONE_RULE, message = "Numéro de téléphone invalide.") String phone,
            @NotBlank @Size(max = 150) String subject,
            Procedure procedure,
            @NotBlank @Size(min = 10, max = 5000) String body,
            /* Anti-spam honeypot field: must stay empty. */
            String website) {}

    public record NewThreadRequest(
            @NotBlank @Size(max = 150) String subject,
            Procedure procedure,
            @NotBlank @Size(min = 2, max = 5000) String body) {}

    public record ReplyRequest(@NotBlank @Size(max = 5000) String body) {}

    public record ThreadStatusRequest(@NotNull ThreadStatus status) {}
}
