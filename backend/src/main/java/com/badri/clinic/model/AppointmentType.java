package com.badri.clinic.model;

public enum AppointmentType {
    FIRST_CONSULTATION("Première consultation", 45),
    FOLLOW_UP("Consultation de suivi", 30),
    PRE_OP("Consultation pré-opératoire", 45),
    POST_OP("Contrôle post-opératoire", 30),
    AESTHETIC_MEDICINE("Séance de médecine esthétique", 30);

    private final String label;
    private final int durationMinutes;

    AppointmentType(String label, int durationMinutes) {
        this.label = label;
        this.durationMinutes = durationMinutes;
    }

    public String label() { return label; }

    public int durationMinutes() { return durationMinutes; }
}
