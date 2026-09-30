package com.badri.clinic.web;

import com.badri.clinic.dto.AuthDtos.AuthResponse;
import com.badri.clinic.dto.AuthDtos.ChangePasswordRequest;
import com.badri.clinic.dto.AuthDtos.ForgotPasswordRequest;
import com.badri.clinic.dto.AuthDtos.LoginRequest;
import com.badri.clinic.dto.AuthDtos.ProfileUpdateRequest;
import com.badri.clinic.dto.AuthDtos.RegisterRequest;
import com.badri.clinic.dto.AuthDtos.SetPasswordRequest;
import com.badri.clinic.dto.UserDtos.UserDto;
import com.badri.clinic.security.AuthUser;
import com.badri.clinic.service.AuthService;
import com.badri.clinic.service.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Locale;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final RateLimiter limiter;

    public AuthController(AuthService auth, RateLimiter limiter) {
        this.auth = auth;
        this.limiter = limiter;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        limiter.check("login:" + http.getRemoteAddr(), 20, Duration.ofMinutes(10));
        limiter.check("login:" + req.email().toLowerCase(Locale.ROOT), 8, Duration.ofMinutes(10));
        return auth.login(req);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http) {
        limiter.check("register:" + http.getRemoteAddr(), 10, Duration.ofHours(1));
        return auth.register(req);
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgot(@Valid @RequestBody ForgotPasswordRequest req, HttpServletRequest http) {
        limiter.check("forgot:" + http.getRemoteAddr(), 5, Duration.ofHours(1));
        auth.forgotPassword(req.email());
    }

    @PostMapping("/set-password")
    public AuthResponse setPassword(@Valid @RequestBody SetPasswordRequest req, HttpServletRequest http) {
        limiter.check("set-password:" + http.getRemoteAddr(), 10, Duration.ofHours(1));
        return auth.setPassword(req);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthUser me) {
        return auth.me(me.id());
    }

    @PutMapping("/me")
    public UserDto updateMe(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ProfileUpdateRequest req) {
        return auth.updateProfile(me.id(), req);
    }

    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ChangePasswordRequest req) {
        auth.changePassword(me.id(), req);
    }
}
