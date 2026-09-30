package com.badri.clinic.service;

import com.badri.clinic.config.AppProperties;
import com.badri.clinic.dto.DashboardDtos.AdminDashboard;
import com.badri.clinic.dto.DashboardDtos.DoctorDashboard;
import com.badri.clinic.dto.DashboardDtos.LabeledCount;
import com.badri.clinic.dto.DashboardDtos.Point;
import com.badri.clinic.dto.UserDtos.UserDto;
import com.badri.clinic.model.AccountStatus;
import com.badri.clinic.model.Appointment;
import com.badri.clinic.model.AppointmentStatus;
import com.badri.clinic.model.Role;
import com.badri.clinic.model.User;
import com.badri.clinic.repository.AppointmentRepository;
import com.badri.clinic.repository.ThreadRepository;
import com.badri.clinic.repository.UserRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final Map<Role, String> ROLE_LABELS = Map.of(
            Role.ADMIN, "Administrateurs", Role.DOCTOR, "Docteurs", Role.PATIENT, "Patients");

    private final UserRepository users;
    private final AppointmentRepository appointments;
    private final ThreadRepository threads;
    private final AppointmentService appointmentService;
    private final MongoTemplate mongo;
    private final AppProperties props;

    public DashboardService(UserRepository users, AppointmentRepository appointments, ThreadRepository threads,
                            AppointmentService appointmentService, MongoTemplate mongo, AppProperties props) {
        this.users = users;
        this.appointments = appointments;
        this.threads = threads;
        this.appointmentService = appointmentService;
        this.mongo = mongo;
        this.props = props;
    }

    public AdminDashboard admin() {
        ZoneId zone = props.zone();
        YearMonth current = YearMonth.now(zone);
        Instant yearAgo = current.minusMonths(11).atDay(1).atStartOfDay(zone).toInstant();
        Map<YearMonth, Long> signups = users.findByCreatedAtAfter(yearAgo).stream()
                .filter(u -> u.getCreatedAt() != null)
                .collect(Collectors.groupingBy(u -> YearMonth.from(u.getCreatedAt().atZone(zone)), Collectors.counting()));
        List<Point> series = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            YearMonth m = current.minusMonths(i);
            series.add(new Point(m.toString(), signups.getOrDefault(m, 0L)));
        }
        long activeLast30 = mongo.count(new Query(Criteria.where("lastLoginAt").gte(Instant.now().minus(Duration.ofDays(30)))), User.class);
        List<LabeledCount> byRole = List.of(Role.PATIENT, Role.DOCTOR, Role.ADMIN).stream()
                .map(r -> new LabeledCount(r.name(), ROLE_LABELS.get(r), users.countByRole(r))).toList();
        return new AdminDashboard(
                users.count(),
                users.countByRole(Role.ADMIN),
                users.countByRole(Role.DOCTOR),
                users.countByRole(Role.PATIENT),
                users.countByRoleAndHasAccount(Role.PATIENT, false),
                users.countByStatus(AccountStatus.RESTRICTED),
                signups.getOrDefault(current, 0L),
                activeLast30,
                series,
                byRole,
                users.findTop6ByOrderByCreatedAtDesc().stream().map(UserDto::of).toList(),
                users.findTop6ByLastLoginAtNotNullOrderByLastLoginAtDesc().stream().map(UserDto::of).toList());
    }

    public DoctorDashboard doctor() {
        ZoneId zone = props.zone();
        Instant now = Instant.now();
        LocalDate today = LocalDate.now(zone);
        YearMonth current = YearMonth.from(today);
        Instant from = current.minusMonths(5).atDay(1).atStartOfDay(zone).toInstant();
        Instant to = current.plusMonths(3).atDay(1).atStartOfDay(zone).toInstant();
        List<Appointment> all = appointments.findByStartAtBetweenOrderByStartAtAsc(from, to);

        Instant todayStart = today.atStartOfDay(zone).toInstant();
        Instant todayEnd = today.plusDays(1).atStartOfDay(zone).toInstant();
        Instant weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay(zone).toInstant();
        Instant weekEnd = weekStart.plus(Duration.ofDays(7));

        long todayCount = all.stream().filter(a -> a.getStatus() != AppointmentStatus.CANCELLED && within(a, todayStart, todayEnd)).count();
        long weekCount = all.stream().filter(a -> a.getStatus() != AppointmentStatus.CANCELLED && within(a, weekStart, weekEnd)).count();

        List<Appointment> futurePending = appointments.findByStartAtAfterAndStatusInOrderByStartAtAsc(now, List.of(AppointmentStatus.PENDING));
        List<Appointment> upcoming = appointments.findByStartAtAfterAndStatusInOrderByStartAtAsc(now, AppointmentService.ACTIVE);

        List<Appointment> past = all.stream().filter(a -> a.getStartAt().isBefore(now)).toList();
        double cancellationRate = past.isEmpty() ? 0 :
                (double) past.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED).count() / past.size();

        Map<String, List<Point>> byStatus = new LinkedHashMap<>();
        List<Point> byMonth = new ArrayList<>();
        for (AppointmentStatus s : AppointmentStatus.values()) byStatus.put(s.name(), new ArrayList<>());
        for (int i = 5; i >= -2; i--) {
            YearMonth m = current.minusMonths(i);
            List<Appointment> inMonth = all.stream().filter(a -> YearMonth.from(a.getStartAt().atZone(zone)).equals(m)).toList();
            byMonth.add(new Point(m.toString(), inMonth.stream().filter(a -> a.getStatus() != AppointmentStatus.CANCELLED).count()));
            for (AppointmentStatus s : AppointmentStatus.values()) {
                byStatus.get(s.name()).add(new Point(m.toString(), inMonth.stream().filter(a -> a.getStatus() == s).count()));
            }
        }

        List<LabeledCount> topProcedures = all.stream().filter(a -> a.getProcedure() != null)
                .collect(Collectors.groupingBy(Appointment::getProcedure, Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<com.badri.clinic.model.Procedure, Long>comparingByValue().reversed())
                .limit(6).map(e -> new LabeledCount(e.getKey().name(), e.getKey().label(), e.getValue())).toList();
        List<LabeledCount> byType = all.stream().filter(a -> a.getType() != null)
                .collect(Collectors.groupingBy(Appointment::getType, Collectors.counting()))
                .entrySet().stream().sorted(Comparator.comparing(e -> e.getKey().ordinal()))
                .map(e -> new LabeledCount(e.getKey().name(), e.getKey().label(), e.getValue())).toList();

        Instant monthStart = current.atDay(1).atStartOfDay(zone).toInstant();
        return new DoctorDashboard(
                users.countByRole(Role.PATIENT),
                users.countByRoleAndHasAccount(Role.PATIENT, false),
                users.countByRoleAndCreatedAtAfter(Role.PATIENT, monthStart),
                todayCount, weekCount, futurePending.size(),
                threads.countByUnreadForDoctorGreaterThan(0),
                Math.round(cancellationRate * 1000) / 1000.0,
                byMonth, byStatus, topProcedures, byType,
                appointmentService.toDtos(upcoming.stream().limit(6).toList(), true),
                appointmentService.toDtos(futurePending.stream().limit(6).toList(), true));
    }

    private static boolean within(Appointment a, Instant from, Instant to) {
        return !a.getStartAt().isBefore(from) && a.getStartAt().isBefore(to);
    }
}
