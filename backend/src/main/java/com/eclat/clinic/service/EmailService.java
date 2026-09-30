package com.eclat.clinic.service;

import com.eclat.clinic.config.AppProperties;
import com.eclat.clinic.model.AccountStatus;
import com.eclat.clinic.model.Appointment;
import com.eclat.clinic.model.MessageThread;
import com.eclat.clinic.model.Role;
import com.eclat.clinic.model.User;
import com.eclat.clinic.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Sends transactional emails through the Resend API (https://resend.com/docs/api-reference/emails/send-email).
 * Without an API key, emails are only logged, which is handy in development.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final AppProperties props;
    private final UserRepository users;
    private final RestClient http;
    private final DateTimeFormatter dateFormat;

    public EmailService(AppProperties props, UserRepository users) {
        this.props = props;
        this.users = users;
        this.http = RestClient.builder().baseUrl("https://api.resend.com").build();
        this.dateFormat = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy 'à' HH'h'mm", Locale.FRENCH).withZone(props.zone());
    }

    // ---------------------------------------------------------------- doctor notifications

    @Async
    public void notifyDoctorNewAppointment(Appointment a, User patient) {
        String when = format(a.getStartAt());
        String body = paragraph("<strong>" + esc(patient.fullName()) + "</strong> vient de demander un rendez-vous.")
                + details(rows(
                "Date", when,
                "Motif", a.getType().label(),
                "Intervention", a.getProcedure() == null ? "—" : a.getProcedure().label(),
                "Email", orDash(patient.getEmail()),
                "Téléphone", orDash(patient.getPhone())))
                + (a.getPatientNote() == null || a.getPatientNote().isBlank() ? "" : quote(a.getPatientNote()))
                + button("Voir l'agenda", props.frontendUrl() + "/cabinet/agenda");
        sendToDoctors("Nouveau rendez-vous : " + patient.fullName() + " — " + when,
                layout("Nouvelle demande de rendez-vous", body));
    }

    @Async
    public void notifyDoctorAppointmentCancelled(Appointment a, User patient) {
        String body = paragraph("<strong>" + esc(patient.fullName()) + "</strong> a annulé son rendez-vous du "
                + format(a.getStartAt()) + ".")
                + (a.getCancelReason() == null ? "" : quote(a.getCancelReason()))
                + button("Voir l'agenda", props.frontendUrl() + "/cabinet/agenda");
        sendToDoctors("Rendez-vous annulé : " + patient.fullName(), layout("Rendez-vous annulé", body));
    }

    @Async
    public void notifyDoctorNewMessage(MessageThread t, String senderName, String senderEmail, String text, boolean firstMessage) {
        String who = esc(senderName) + (t.isGuest() ? " <span style=\"color:#9a7b4f\">(visiteur sans compte)</span>" : "");
        String body = paragraph((firstMessage ? "Nouveau message de " : "Nouvelle réponse de ") + "<strong>" + who + "</strong>.")
                + details(rows(
                "Sujet", esc(t.getSubject()),
                "Email", orDash(senderEmail),
                "Téléphone", orDash(t.getGuestPhone())))
                + quote(text)
                + button("Répondre dans la messagerie", props.frontendUrl() + "/cabinet/messages/" + t.getId());
        sendToDoctors((firstMessage ? "Nouveau message : " : "Réponse : ") + t.getSubject(),
                layout("Messagerie du cabinet", body));
    }

    // ---------------------------------------------------------------- patient notifications

    public enum AppointmentEvent { CONFIRMED, CANCELLED, RESCHEDULED, BOOKED_BY_CLINIC, REQUEST_RECEIVED }

    @Async
    public void notifyPatientAppointment(Appointment a, User patient, AppointmentEvent event) {
        if (patient.getEmail() == null || patient.getEmail().isBlank()) return;
        String when = format(a.getStartAt());
        String title;
        String intro;
        switch (event) {
            case CONFIRMED -> { title = "Votre rendez-vous est confirmé"; intro = "Nous avons le plaisir de confirmer votre rendez-vous."; }
            case CANCELLED -> { title = "Votre rendez-vous est annulé"; intro = "Votre rendez-vous a été annulé par le cabinet."; }
            case RESCHEDULED -> { title = "Votre rendez-vous a été déplacé"; intro = "Votre rendez-vous a été déplacé à une nouvelle date."; }
            case BOOKED_BY_CLINIC -> { title = "Un rendez-vous a été planifié pour vous"; intro = "Le cabinet a planifié un rendez-vous à votre attention."; }
            default -> { title = "Nous avons bien reçu votre demande"; intro = "Votre demande de rendez-vous a été transmise au docteur. Vous recevrez une confirmation très prochainement."; }
        }
        String body = paragraph("Bonjour " + esc(patient.getFirstName()) + ",")
                + paragraph(intro)
                + details(rows("Date", event == AppointmentEvent.CANCELLED ? "<s>" + when + "</s>" : when,
                "Motif", a.getType().label()))
                + (event == AppointmentEvent.CANCELLED && a.getCancelReason() != null ? quote(a.getCancelReason()) : "")
                + (patient.isHasAccount() ? button("Mes rendez-vous", props.frontendUrl() + "/espace/rendez-vous") : "");
        send(List.of(patient.getEmail()), title + " — " + props.clinicName(), layout(title, body), null);
    }

    @Async
    public void sendReply(String toEmail, String toName, String subject, String text, boolean hasAccount) {
        String body = paragraph("Bonjour " + esc(toName) + ",")
                + paragraph("Le cabinet a répondu à votre message :")
                + quote(text)
                + (hasAccount
                ? button("Ouvrir la messagerie", props.frontendUrl() + "/espace/messages")
                : paragraph("<span style=\"color:#6b6b6b\">Vous pouvez répondre directement à cet email ou nous écrire via le formulaire de contact.</span>"));
        String replyTo = props.mail().doctorNotificationEmail();
        send(List.of(toEmail), "Re : " + subject, layout("Réponse du cabinet", body),
                replyTo == null || replyTo.isBlank() ? null : replyTo);
    }

    @Async
    public void sendPasswordLink(User user, String link, boolean invitation) {
        String title = invitation ? "Activez votre espace patient" : "Réinitialisation de votre mot de passe";
        String body = paragraph("Bonjour " + esc(user.getFirstName()) + ",")
                + paragraph(invitation
                ? "Le cabinet vous invite à créer votre espace patient pour gérer vos rendez-vous et échanger avec le docteur en toute confidentialité."
                : "Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable 24 heures.")
                + button(invitation ? "Créer mon mot de passe" : "Choisir un nouveau mot de passe", link)
                + paragraph("<span style=\"color:#6b6b6b;font-size:13px\">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</span>");
        send(List.of(user.getEmail()), title + " — " + props.clinicName(), layout(title, body), null);
    }

    @Async
    public void sendWelcome(User user) {
        String body = paragraph("Bonjour " + esc(user.getFirstName()) + ",")
                + paragraph("Votre espace patient est prêt. Vous pouvez dès à présent prendre rendez-vous en ligne et échanger avec le cabinet.")
                + button("Prendre rendez-vous", props.frontendUrl() + "/rendez-vous");
        send(List.of(user.getEmail()), "Bienvenue — " + props.clinicName(), layout("Bienvenue", body), null);
    }

    // ---------------------------------------------------------------- sending

    private void sendToDoctors(String subject, String html) {
        String configured = props.mail().doctorNotificationEmail();
        List<String> to = configured != null && !configured.isBlank()
                ? List.of(configured.split(",")).stream().map(String::trim).filter(s -> !s.isEmpty()).toList()
                : users.findByRoleAndStatus(Role.DOCTOR, AccountStatus.ACTIVE).stream()
                .map(User::getEmail).filter(e -> e != null && !e.isBlank()).toList();
        if (to.isEmpty()) {
            log.warn("Aucun destinataire docteur configuré pour « {} »", subject);
            return;
        }
        send(to, subject, html, null);
    }

    private void send(List<String> to, String subject, String html, String replyTo) {
        String apiKey = props.mail().resendApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.info("[email non envoyé — RESEND_API_KEY absente] à={} sujet={}", to, subject);
            return;
        }
        try {
            var payload = new LinkedHashMap<String, Object>();
            payload.put("from", props.mail().from());
            payload.put("to", to);
            payload.put("subject", subject);
            payload.put("html", html);
            if (replyTo != null) payload.put("reply_to", replyTo);
            http.post().uri("/emails")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Email envoyé à {} : {}", to, subject);
        } catch (Exception e) {
            log.error("Échec d'envoi Resend à {} : {}", to, e.getMessage());
        }
    }

    // ---------------------------------------------------------------- HTML template

    private String format(Instant instant) {
        String s = dateFormat.format(instant);
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String esc(String s) {
        return s == null ? "" : HtmlUtils.htmlEscape(s);
    }

    private static String orDash(String s) {
        return s == null || s.isBlank() ? "—" : esc(s);
    }

    private static String paragraph(String html) {
        return "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;color:#2b2622\">" + html + "</p>";
    }

    private static String quote(String text) {
        return "<div style=\"margin:0 0 20px;padding:16px 18px;border-left:3px solid #b8925a;background:#f8f4ee;"
                + "border-radius:8px;font-size:14px;line-height:1.6;color:#3a332c;white-space:pre-wrap\">"
                + esc(text) + "</div>";
    }

    private static Map<String, String> rows(String... keyValues) {
        Map<String, String> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) m.put(keyValues[i], keyValues[i + 1]);
        return m;
    }

    /** Values must already be escaped (or come from the server). */
    private static String details(Map<String, String> rows) {
        StringBuilder sb = new StringBuilder("<table role=\"presentation\" style=\"width:100%;margin:0 0 20px;border-collapse:collapse\">");
        rows.forEach((k, v) -> sb.append("<tr><td style=\"padding:8px 0;color:#8a7f73;font-size:13px;width:130px\">")
                .append(k).append("</td><td style=\"padding:8px 0;color:#2b2622;font-size:14px;font-weight:600\">")
                .append(v).append("</td></tr>"));
        return sb.append("</table>").toString();
    }

    private static String button(String label, String href) {
        return "<p style=\"margin:28px 0 8px\"><a href=\"" + esc(href) + "\" style=\"display:inline-block;padding:13px 26px;"
                + "background:#1f1b17;color:#f6efe4;text-decoration:none;border-radius:999px;font-size:14px;"
                + "font-weight:600;letter-spacing:.02em\">" + label + "</a></p>";
    }

    private String layout(String title, String content) {
        return "<!doctype html><html lang=\"fr\"><body style=\"margin:0;background:#f3eee7;font-family:-apple-system,"
                + "Segoe UI,Helvetica,Arial,sans-serif\"><table role=\"presentation\" width=\"100%\" style=\"padding:32px 12px\">"
                + "<tr><td align=\"center\"><table role=\"presentation\" width=\"100%\" style=\"max-width:560px;background:#fffdf9;"
                + "border-radius:18px;overflow:hidden;border:1px solid #e8dfd2\">"
                + "<tr><td style=\"padding:28px 32px;background:#1f1b17;color:#f6efe4\">"
                + "<div style=\"font-family:Georgia,serif;font-size:22px;letter-spacing:.04em\">" + esc(props.clinicName()) + "</div>"
                + "<div style=\"font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#c9a978;margin-top:4px\">"
                + "Chirurgie plastique &amp; esthétique</div></td></tr>"
                + "<tr><td style=\"padding:32px\"><h1 style=\"margin:0 0 20px;font-family:Georgia,serif;font-weight:500;"
                + "font-size:24px;color:#1f1b17\">" + esc(title) + "</h1>" + content + "</td></tr>"
                + "<tr><td style=\"padding:18px 32px;background:#f8f4ee;color:#8a7f73;font-size:12px\">"
                + "Cet email vous est envoyé automatiquement par " + esc(props.clinicName()) + ".</td></tr>"
                + "</table></td></tr></table></body></html>";
    }
}
