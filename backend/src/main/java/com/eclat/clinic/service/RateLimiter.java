package com.eclat.clinic.service;

import com.eclat.clinic.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory fixed-window rate limiter, sufficient for a single instance (Render).
 * Protects login, the guest contact form and "forgot password".
 */
@Component
public class RateLimiter {

    private record Window(Instant start, int count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public void check(String key, int max, Duration period) {
        Instant now = Instant.now();
        Window w = windows.compute(key, (k, old) ->
                old == null || old.start().plus(period).isBefore(now) ? new Window(now, 1) : new Window(old.start(), old.count() + 1));
        if (w.count() > max) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "Trop de tentatives. Merci de réessayer dans quelques minutes.");
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> e.getValue().start().plus(Duration.ofHours(1)).isBefore(now));
        }
    }
}
