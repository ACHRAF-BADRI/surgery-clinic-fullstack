package com.badri.clinic.service;

import com.badri.clinic.dto.AuthDtos.AuthResponse;
import com.badri.clinic.dto.AuthDtos.ChangePasswordRequest;
import com.badri.clinic.dto.AuthDtos.LoginRequest;
import com.badri.clinic.dto.AuthDtos.ProfileUpdateRequest;
import com.badri.clinic.dto.AuthDtos.RegisterRequest;
import com.badri.clinic.dto.AuthDtos.SetPasswordRequest;
import com.badri.clinic.dto.UserDtos.UserDto;
import com.badri.clinic.model.AccountStatus;
import com.badri.clinic.model.Role;
import com.badri.clinic.model.User;
import com.badri.clinic.repository.ThreadRepository;
import com.badri.clinic.repository.UserRepository;
import com.badri.clinic.security.JwtService;
import com.badri.clinic.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository users;
    private final ThreadRepository threads;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final EmailService email;
    private final TokenService tokens;

    public AuthService(UserRepository users, ThreadRepository threads, PasswordEncoder encoder, JwtService jwt,
                       EmailService email, TokenService tokens) {
        this.users = users;
        this.threads = threads;
        this.encoder = encoder;
        this.jwt = jwt;
        this.email = email;
        this.tokens = tokens;
    }

    public static String normalizeEmail(String email) {
        return email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmail(normalizeEmail(req.email()))
                .filter(x -> x.getPasswordHash() != null && encoder.matches(req.password(), x.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Email ou mot de passe incorrect."));
        if (u.getStatus() == AccountStatus.RESTRICTED) {
            String reason = u.getRestrictionReason() == null ? "" : " Motif : " + u.getRestrictionReason();
            throw ApiException.forbidden("ACCOUNT_RESTRICTED", "Votre compte est restreint. Contactez le cabinet." + reason);
        }
        u.setLastLoginAt(Instant.now());
        users.save(u);
        return token(u);
    }

    public AuthResponse register(RegisterRequest req) {
        String mail = normalizeEmail(req.email());
        users.findByEmail(mail).ifPresent(existing -> {
            if (!existing.isHasAccount()) {
                throw ApiException.conflict("PATIENT_FILE_EXISTS",
                        "Un dossier patient existe déjà à cette adresse. Utilisez « Mot de passe oublié » pour activer votre compte.");
            }
            throw ApiException.conflict("EMAIL_TAKEN", "Cette adresse email est déjà utilisée.");
        });
        User u = new User();
        u.setFirstName(req.firstName().trim());
        u.setLastName(req.lastName().trim());
        u.setEmail(mail);
        u.setPhone(blankToNull(req.phone()));
        u.setDateOfBirth(req.dateOfBirth());
        u.setRole(Role.PATIENT);
        u.setHasAccount(true);
        u.setPasswordHash(encoder.encode(req.password()));
        u.setLastLoginAt(Instant.now());
        users.save(u);
        // Do not attach previous guest threads here: the email address is not verified yet.
        email.sendWelcome(u);
        return token(u);
    }

    /**
     * "Forgot password". Also used to activate a record created by the clinic:
     * the link proves the person controls the email address.
     * Always responds the same way so as not to reveal whether an account exists.
     */
    public void forgotPassword(String rawEmail) {
        users.findByEmail(normalizeEmail(rawEmail))
                .filter(u -> u.getStatus() == AccountStatus.ACTIVE)
                .ifPresent(u -> email.sendPasswordLink(u, tokens.issueLink(u, Duration.ofHours(24)), !u.isHasAccount()));
    }

    public AuthResponse setPassword(SetPasswordRequest req) {
        User u = users.findByTokenHash(TokenService.hash(req.token()))
                .filter(x -> x.getTokenExpiresAt() != null && x.getTokenExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> ApiException.badRequest("INVALID_TOKEN", "Ce lien est invalide ou a expiré."));
        if (u.getStatus() == AccountStatus.RESTRICTED) {
            throw ApiException.forbidden("ACCOUNT_RESTRICTED", "Votre compte est restreint. Contactez le cabinet.");
        }
        u.setPasswordHash(encoder.encode(req.password()));
        u.setHasAccount(true);
        u.setTokenHash(null);
        u.setTokenExpiresAt(null);
        u.setLastLoginAt(Instant.now());
        users.save(u);
        // The emailed link proves ownership of the address, so guest threads can be attached.
        attachGuestThreads(u);
        return token(u);
    }

    public UserDto me(String userId) {
        return UserDto.of(load(userId));
    }

    public UserDto updateProfile(String userId, ProfileUpdateRequest req) {
        User u = load(userId);
        u.setFirstName(req.firstName().trim());
        u.setLastName(req.lastName().trim());
        u.setPhone(blankToNull(req.phone()));
        u.setDateOfBirth(req.dateOfBirth());
        u.setGender(blankToNull(req.gender()));
        u.setAddress(blankToNull(req.address()));
        u.setCity(blankToNull(req.city()));
        u.setPostalCode(blankToNull(req.postalCode()));
        return UserDto.of(users.save(u));
    }

    public void changePassword(String userId, ChangePasswordRequest req) {
        User u = load(userId);
        if (u.getPasswordHash() == null || !encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("BAD_PASSWORD", "Le mot de passe actuel est incorrect.");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
        users.save(u);
    }

    private User load(String id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Utilisateur"));
    }

    private AuthResponse token(User u) {
        return new AuthResponse(jwt.issue(u), jwt.expiresAt(), UserDto.of(u));
    }

    /** Attaches threads previously sent as a guest with the same address to the account. */
    private void attachGuestThreads(User u) {
        if (u.getEmail() == null) return;
        threads.findByPatientId(null).stream()
                .filter(t -> u.getEmail().equalsIgnoreCase(t.getGuestEmail()))
                .forEach(t -> {
                    t.setPatientId(u.getId());
                    threads.save(t);
                });
    }
}
