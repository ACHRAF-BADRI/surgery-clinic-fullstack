package com.eclat.clinic.model;

public enum AppointmentStatus {
    PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW;

    public boolean isActive() {
        return this == PENDING || this == CONFIRMED;
    }
}
