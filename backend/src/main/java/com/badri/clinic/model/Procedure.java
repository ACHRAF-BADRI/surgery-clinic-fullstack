package com.badri.clinic.model;

public enum Procedure {
    RHINOPLASTY("Rhinoplastie", "Visage",
            "Affiner, redresser ou harmoniser le nez tout en préservant la fonction respiratoire."),
    BLEPHAROPLASTY("Blépharoplastie", "Visage",
            "Corriger les paupières tombantes et les poches pour un regard reposé."),
    FACELIFT("Lifting cervico-facial", "Visage",
            "Retendre les tissus du visage et du cou pour un rajeunissement naturel."),
    OTOPLASTY("Otoplastie", "Visage",
            "Remodeler les oreilles décollées, dès l'enfance ou à l'âge adulte."),
    BREAST_AUGMENTATION("Augmentation mammaire", "Seins",
            "Augmenter le volume par implants ou transfert de graisse, sur mesure."),
    BREAST_REDUCTION("Réduction mammaire", "Seins",
            "Réduire et remonter une poitrine volumineuse pour plus de confort."),
    BREAST_LIFT("Lifting mammaire", "Seins",
            "Redonner galbe et tenue à une poitrine relâchée."),
    LIPOSUCTION("Liposuccion", "Silhouette",
            "Éliminer les amas graisseux localisés résistants au sport et à l'alimentation."),
    ABDOMINOPLASTY("Abdominoplastie", "Silhouette",
            "Retendre la paroi abdominale et retirer l'excès de peau."),
    BBL("Lipofilling fessier", "Silhouette",
            "Galber les fessiers par réinjection de votre propre graisse."),
    HYALURONIC_ACID("Acide hyaluronique", "Médecine esthétique",
            "Restaurer les volumes et atténuer les rides sans chirurgie."),
    BOTULINUM_TOXIN("Toxine botulique", "Médecine esthétique",
            "Lisser les rides d'expression du front et du contour des yeux."),
    RECONSTRUCTIVE("Chirurgie reconstructrice", "Reconstructrice",
            "Reconstruction mammaire, cicatrices, séquelles de brûlures ou de traumatismes.");

    private final String label;
    private final String category;
    private final String description;

    Procedure(String label, String category, String description) {
        this.label = label;
        this.category = category;
        this.description = description;
    }

    public String label() { return label; }

    public String category() { return category; }

    public String description() { return description; }
}
