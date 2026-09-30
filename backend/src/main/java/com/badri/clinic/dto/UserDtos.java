package com.badri.clinic.dto;

import com.badri.clinic.model.AccountStatus;
import com.badri.clinic.model.Role;
import com.badri.clinic.model.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

import static com.badri.clinic.dto.AuthDtos.PASSWORD_MESSAGE;
import static com.badri.clinic.dto.AuthDtos.PASSWORD_RULE;
import static com.badri.clinic.dto.AuthDtos.PHONE_RULE;

public final class UserDtos {

    private UserDtos() {}

    /** User view for the user themselves or the admin (no medical notes). */
    public record UserDto(String id, String firstName, String lastName, String email, String phone,
                          Role role, AccountStatus status, String restrictionReason, boolean hasAccount,
                          LocalDate dateOfBirth, String gender, String address, String city, String postalCode,
                          Instant createdAt, Instant lastLoginAt) {

        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(),
                    u.getRole(), u.getStatus(), u.getRestrictionReason(), u.isHasAccount(),
                    u.getDateOfBirth(), u.getGender(), u.getAddress(), u.getCity(), u.getPostalCode(),
                    u.getCreatedAt(), u.getLastLoginAt());
        }
    }

    /** Patient view for the doctor. */
    public record PatientDto(String id, String firstName, String lastName, String email, String phone,
                             AccountStatus status, boolean hasAccount, boolean invitationPending,
                             LocalDate dateOfBirth, String gender, String address, String city, String postalCode,
                             String medicalNotes, long appointmentCount, Instant nextAppointmentAt,
                             Instant lastAppointmentAt, Instant createdAt, Instant lastLoginAt) {}

    public record PatientUpsertRequest(
            @NotBlank @Size(max = 60) String firstName,
            @NotBlank @Size(max = 60) String lastName,
            @Email @Size(max = 120) String email,
            @Pattern(regexp = PHONE_RULE, message = "Numéro de téléphone invalide.") String phone,
            @Past LocalDate dateOfBirth,
            @Size(max = 20) String gender,
            @Size(max = 200) String address,
            @Size(max = 80) String city,
            @Size(max = 12) String postalCode,
            @Size(max = 5000) String medicalNotes) {}

    public record AdminUserCreateRequest(
            @NotBlank @Size(max = 60) String firstName,
            @NotBlank @Size(max = 60) String lastName,
            @NotBlank @Email @Size(max = 120) String email,
            @Pattern(regexp = PHONE_RULE, message = "Numéro de téléphone invalide.") String phone,
            @NotNull Role role,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String password) {}

    public record AdminUserUpdateRequest(
            @NotBlank @Size(max = 60) String firstName,
            @NotBlank @Size(max = 60) String lastName,
            @Email @Size(max = 120) String email,
            @Pattern(regexp = PHONE_RULE, message = "Numéro de téléphone invalide.") String phone,
            @Past LocalDate dateOfBirth,
            @Size(max = 200) String address,
            @Size(max = 80) String city,
            @Size(max = 12) String postalCode) {}

    public record RoleChangeRequest(@NotNull Role role) {}

    public record StatusChangeRequest(@NotNull AccountStatus status, @Size(max = 300) String reason) {}

    public record AdminPasswordRequest(
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String password) {}

    public record PageDto<T>(java.util.List<T> items, long total, int page, int size) {}
}
