package com.badri.clinic.config;

import com.badri.clinic.model.Appointment;
import com.badri.clinic.model.AppointmentStatus;
import com.badri.clinic.model.AppointmentType;
import com.badri.clinic.model.Message;
import com.badri.clinic.model.MessageThread;
import com.badri.clinic.model.Procedure;
import com.badri.clinic.model.Role;
import com.badri.clinic.model.User;
import com.badri.clinic.repository.AppointmentRepository;
import com.badri.clinic.repository.MessageRepository;
import com.badri.clinic.repository.ThreadRepository;
import com.badri.clinic.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Creates the initial admin and doctor if they do not exist.
 * With SEED_DEMO_DATA=true, also adds fake patients, appointments and messages
 * (only when no patient exists yet).
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final AppointmentRepository appointments;
    private final ThreadRepository threads;
    private final MessageRepository messages;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    public DataSeeder(UserRepository users, AppointmentRepository appointments, ThreadRepository threads,
                      MessageRepository messages, PasswordEncoder encoder, AppProperties props) {
        this.users = users;
        this.appointments = appointments;
        this.threads = threads;
        this.messages = messages;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        var seed = props.seed();
        if (!users.existsByRole(Role.ADMIN)) {
            if (blank(seed.adminEmail()) || blank(seed.adminPassword())) {
                log.warn("No admin account exists and ADMIN_EMAIL / ADMIN_PASSWORD are not set: nobody can administer the app.");
            } else {
                users.save(account("Admin", "Cabinet", seed.adminEmail(), seed.adminPassword(), Role.ADMIN));
                log.info("Administrateur initial créé : {}", seed.adminEmail());
            }
        }
        if (!users.existsByRole(Role.DOCTOR)) {
            if (blank(seed.doctorEmail()) || blank(seed.doctorPassword())) {
                log.warn("No doctor account exists and DOCTOR_EMAIL / DOCTOR_PASSWORD are not set: appointments cannot be booked.");
            } else {
                users.save(account(seed.doctorFirstName(), seed.doctorLastName(), seed.doctorEmail(), seed.doctorPassword(), Role.DOCTOR));
                log.info("Docteur initial créé : {}", seed.doctorEmail());
            }
        }
        if (seed.demoData() && users.countByRole(Role.PATIENT) == 0) {
            seedDemo();
        }
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private User account(String first, String last, String email, String password, Role role) {
        User u = new User();
        u.setFirstName(first);
        u.setLastName(last);
        u.setEmail(email.trim().toLowerCase(Locale.ROOT));
        u.setPasswordHash(encoder.encode(password));
        u.setRole(role);
        u.setHasAccount(true);
        return u;
    }

    private void seedDemo() {
        User doctor = users.findByRole(Role.DOCTOR).getFirst();
        ZoneId zone = props.zone();
        Random rnd = new Random(42);
        String[][] people = {
                {"Léa", "Martin", "lea.martin@example.com", "06 12 34 56 78", "yes"},
                {"Chloé", "Bernard", "chloe.bernard@example.com", "06 22 45 67 89", "yes"},
                {"Inès", "Dubois", "ines.dubois@example.com", "07 11 22 33 44", "yes"},
                {"Manon", "Thomas", null, "06 98 76 54 32", "no"},
                {"Sarah", "Robert", "sarah.robert@example.com", "06 55 44 33 22", "yes"},
                {"Julie", "Richard", "julie.richard@example.com", null, "no"},
                {"Camille", "Petit", "camille.petit@example.com", "07 66 55 44 33", "yes"},
                {"Emma", "Durand", null, "06 10 20 30 40", "no"},
                {"Nora", "Leroy", "nora.leroy@example.com", "06 70 80 90 10", "yes"},
                {"Yasmine", "Moreau", "yasmine.moreau@example.com", "07 21 43 65 87", "yes"},
        };
        List<User> patients = new ArrayList<>();
        for (String[] p : people) {
            User u = new User();
            u.setFirstName(p[0]);
            u.setLastName(p[1]);
            u.setEmail(p[2]);
            u.setPhone(p[3]);
            u.setRole(Role.PATIENT);
            u.setDateOfBirth(LocalDate.of(1975 + rnd.nextInt(25), 1 + rnd.nextInt(12), 1 + rnd.nextInt(27)));
            u.setCity(List.of("Paris", "Lyon", "Neuilly-sur-Seine", "Boulogne-Billancourt", "Versailles").get(rnd.nextInt(5)));
            boolean hasAccount = "yes".equals(p[4]);
            u.setHasAccount(hasAccount);
            if (hasAccount) u.setPasswordHash(encoder.encode("Patient#2026"));
            else u.setCreatedBy(doctor.getId());
            patients.add(users.save(u));
        }

        Procedure[] procs = Procedure.values();
        AppointmentType[] types = AppointmentType.values();
        LocalDate today = LocalDate.now(zone);
        List<Appointment> list = new ArrayList<>();
        for (int i = 0; i < 70; i++) {
            LocalDate day = today.plusDays(rnd.nextInt(200) - 150);
            if (day.getDayOfWeek().getValue() >= 6) day = day.plusDays(2);
            AppointmentType type = types[rnd.nextInt(types.length)];
            Instant start = day.atTime(LocalTime.of(9 + rnd.nextInt(8), rnd.nextBoolean() ? 0 : 30)).atZone(zone).toInstant();
            Instant end = start.plus(Duration.ofMinutes(type.durationMinutes()));
            if (list.stream().anyMatch(a -> a.getStartAt().isBefore(end) && a.getEndAt().isAfter(start))) continue;
            User p = patients.get(rnd.nextInt(patients.size()));
            Appointment a = new Appointment();
            a.setPatientId(p.getId());
            a.setDoctorId(doctor.getId());
            a.setType(type);
            a.setProcedure(procs[rnd.nextInt(procs.length)]);
            a.setStartAt(start);
            a.setEndAt(end);
            boolean past = start.isBefore(Instant.now());
            int r = rnd.nextInt(10);
            a.setStatus(past
                    ? (r < 7 ? AppointmentStatus.COMPLETED : r < 9 ? AppointmentStatus.CANCELLED : AppointmentStatus.NO_SHOW)
                    : (r < 6 ? AppointmentStatus.CONFIRMED : r < 9 ? AppointmentStatus.PENDING : AppointmentStatus.CANCELLED));
            a.setCreatedBy(p.isHasAccount() && rnd.nextBoolean() ? p.getId() : doctor.getId());
            if (a.getCreatedBy().equals(p.getId())) a.setPatientNote("Je souhaiterais discuter des options possibles et des délais de récupération.");
            list.add(a);
        }
        appointments.saveAll(list);

        MessageThread guest = new MessageThread();
        guest.setGuestName("Sophie Lambert");
        guest.setGuestEmail("sophie.lambert@example.com");
        guest.setGuestPhone("06 44 55 66 77");
        guest.setSubject("Question sur la rhinoplastie");
        guest.setProcedure(Procedure.RHINOPLASTY);
        threads.save(guest);
        message(guest, Message.Sender.GUEST, null, "Sophie Lambert",
                "Bonjour Docteur, je souhaiterais connaître la durée de convalescence après une rhinoplastie. Merci !");

        User lea = patients.getFirst();
        MessageThread t = new MessageThread();
        t.setPatientId(lea.getId());
        t.setSubject("Suivi post-opératoire");
        t.setProcedure(Procedure.BLEPHAROPLASTY);
        threads.save(t);
        message(t, Message.Sender.PATIENT, lea.getId(), lea.fullName(), "Bonjour, les paupières sont encore un peu gonflées le matin, est-ce normal ?");
        message(t, Message.Sender.DOCTOR, doctor.getId(), doctor.displayName(),
                "Bonjour Léa, c'est tout à fait normal les premières semaines. Dormez la tête surélevée et appliquez du froid.");
        message(t, Message.Sender.PATIENT, lea.getId(), lea.fullName(), "Merci beaucoup Docteur !");
        log.info("Données de démonstration créées : {} patients, {} rendez-vous", patients.size(), list.size());
    }

    private void message(MessageThread t, Message.Sender sender, String senderId, String name, String body) {
        Message m = new Message();
        m.setThreadId(t.getId());
        m.setSender(sender);
        m.setSenderId(senderId);
        m.setSenderName(name);
        m.setBody(body);
        messages.save(m);
        t.setLastMessageAt(Instant.now());
        t.setLastMessagePreview(body.length() > 140 ? body.substring(0, 139) + "…" : body);
        if (sender == Message.Sender.DOCTOR) {
            t.setUnreadForPatient(t.getUnreadForPatient() + 1);
        } else {
            t.setUnreadForDoctor(t.getUnreadForDoctor() + 1);
            t.setUnreadForPatient(0);
        }
        threads.save(t);
    }
}
