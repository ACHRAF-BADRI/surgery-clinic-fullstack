package com.eclat.clinic.dto;

import java.util.List;
import java.util.Map;

public final class DashboardDtos {

    private DashboardDtos() {}

    /** Time-series point (label = "2026-09"). */
    public record Point(String label, long value) {}

    public record LabeledCount(String key, String label, long value) {}

    public record AdminDashboard(long totalUsers, long admins, long doctors, long patients,
                                 long patientsWithoutAccount, long restricted, long newUsersThisMonth,
                                 long activeLast30Days,
                                 List<Point> signupsByMonth,
                                 List<LabeledCount> byRole,
                                 List<UserDtos.UserDto> recentUsers,
                                 List<UserDtos.UserDto> recentLogins) {}

    public record DoctorDashboard(long totalPatients, long patientsWithoutAccount, long newPatientsThisMonth,
                                  long appointmentsToday, long appointmentsThisWeek, long pendingRequests,
                                  long unreadThreads, double cancellationRate,
                                  List<Point> appointmentsByMonth,
                                  Map<String, List<Point>> appointmentsByMonthAndStatus,
                                  List<LabeledCount> topProcedures,
                                  List<LabeledCount> byType,
                                  List<AppointmentDtos.AppointmentDto> upcoming,
                                  List<AppointmentDtos.AppointmentDto> pending) {}
}
