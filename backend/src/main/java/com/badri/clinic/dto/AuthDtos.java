package com.badri.clinic.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public final class AuthDtos {

    private AuthDtos() {}

    public static final String PASSWORD_RULE = "^(?=.*[A-Za-z])(?=.*\\d).{8,100}$";
    public static final String PASSWORD_MESSAGE = "8 caractères minimum, avec au moins une lettre et un chiffre.";
    public static final String PHONE_RULE = "^$|^[+0-9 ().-]{6,20}$";

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {}

    public record RegisterRequest(
            @NotBlank @Size(max = 60) String firstName,
            @NotBlank @Size(max = 60) String lastName,
            @NotBlank @Email @Size(max = 120) String email,
            @Pattern(regexp = PHONE_RULE, message = "Numéro de téléphone invalide.") String phone,
            @Past LocalDate dateOfBirth,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String password) {}

    public record AuthResponse(String token, Instant expiresAt, UserDtos.UserDto user) {}

    public record ForgotPasswordRequest(@NotBlank @Email String email) {}

    public record SetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String password) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String newPassword) {}

    public record ProfileUpdateRequest(
            @NotBlank @Size(max = 60) String firstName,
            @NotBlank @Size(max = 60) String lastName,
            @Pattern(regexp = PHONE_RULE, message = "Numéro de téléphone invalide.") String phone,
            @Past LocalDate dateOfBirth,
            @Size(max = 20) String gender,
            @Size(max = 200) String address,
            @Size(max = 80) String city,
            @Size(max = 12) String postalCode) {}
}
