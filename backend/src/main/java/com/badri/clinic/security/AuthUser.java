package com.badri.clinic.security;

import com.badri.clinic.model.Role;
import com.badri.clinic.model.User;

/** Lightweight principal stored in the SecurityContext. */
public record AuthUser(String id, String email, String name, Role role) {

    public static AuthUser of(User u) {
        return new AuthUser(u.getId(), u.getEmail(), u.fullName(), u.getRole());
    }

    public boolean isStaff() {
        return role == Role.DOCTOR || role == Role.ADMIN;
    }
}
