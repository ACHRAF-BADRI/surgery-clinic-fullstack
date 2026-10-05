package com.badri.clinic.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String clinicName,
        String frontendUrl,
        String allowedOrigins,
        String timeZone,
        Jwt jwt,
        Mail mail,
        Seed seed,
        Schedule schedule
) {
    public record Jwt(String secret, long expirationHours) {}

    public record Mail(String resendApiKey, String from, String doctorNotificationEmail) {}

    public record Seed(String adminEmail, String adminPassword,
                       String doctorEmail, String doctorPassword,
                       String doctorFirstName, String doctorLastName,
                       boolean demoData) {}

    public record Schedule(int slotMinutes, int minNoticeHours, int patientCancelNoticeHours,
                           Map<DayOfWeek, String> hours) {}

    /** Frontend base URL without a trailing slash, so links built as frontendUrl() + "/path" stay valid. */
    @Override
    public String frontendUrl() {
        return frontendUrl == null ? "" : frontendUrl.trim().replaceAll("/+$", "");
    }

    public ZoneId zone() {
        return ZoneId.of(timeZone);
    }

    public List<String> origins() {
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
