# Clinique Éclat — cabinet de chirurgie plastique

Application web d'un cabinet de chirurgie plastique, esthétique et reconstructrice : site vitrine, prise de rendez-vous en ligne, messagerie sécurisée, espace docteur et administration.

| Partie | Technologies | Hébergement |
|---|---|---|
| `frontend/` | Angular 21 (standalone, signals, zoneless), CSS sur mesure | Cloudflare Pages |
| `backend/` | Spring Boot 4.1, Java 21, Spring Security (JWT), Spring Data MongoDB | Render (Docker) |
| Base de données | MongoDB | MongoDB Atlas |
| Emails | API Resend | — |

## Fonctionnalités

**Visiteurs (sans compte)**
- Site vitrine : accueil, interventions filtrables par catégorie, horaires, contact.
- Formulaire de contact « invité » (champ anti-spam invisible, limitation de débit) : le docteur reçoit un email et répond depuis sa messagerie ; la réponse part par email.
- Préparation d'un rendez-vous (motif, date, créneau). La **confirmation exige un compte** ; la sélection est conservée pendant l'inscription ou la connexion.

**Patients**
- Inscription, connexion, mot de passe oublié.
- Réservation de créneaux réels (horaires du cabinet, sans chevauchement), statut « en attente » jusqu'à confirmation.
- Annulation en ligne jusqu'à 24 h avant, historique.
- Messagerie avec le cabinet, compteur de non-lus.
- Profil et changement de mot de passe.

**Docteur**
- Tableau de bord : rendez-vous du jour et de la semaine, demandes à confirmer, messages non lus, taux d'annulation, rendez-vous par mois, interventions demandées.
- Agenda par semaine : confirmer, refuser, **déplacer** (créneaux libres ou horaire libre), marquer terminé ou absent.
- Accès à **tous les patients** et à leurs coordonnées, notes médicales privées.
- **Création d'un patient sans compte** (badge « Sans compte ») et prise de rendez-vous pour lui, puis invitation par email à créer son mot de passe.
- Messagerie : filtres (non lues, invités, archivées), réponses, archivage.

**Administrateur**
- Tableau de bord : utilisateurs par rôle, inscriptions par mois, comptes restreints, connexions récentes.
- CRUD des utilisateurs, **changement de rôle**, **restriction / réactivation** (effet immédiat, motif affiché), **définition d'un mot de passe**.
- Accès à tout l'espace docteur.

**Emails (Resend)** : nouvelle demande de rendez-vous, nouveau message, annulation par un patient (au docteur) ; accusé de réception, confirmation, déplacement, annulation, réponse, invitation, bienvenue, réinitialisation (au patient).

**Interface** : thème clair / sombre / système (bascule animée), responsive, toasts empilables (pause au survol, balayage pour fermer), badges, bannières, skeletons de chargement, illustrations pour les états vides et les erreurs, transitions de page (View Transitions API), `prefers-reduced-motion` respecté.

## Démarrage en local

Prérequis : Java 21, Maven 3.9, Node 20.19+ (ou 22), MongoDB (local ou Atlas).

```bash
# Backend
cd backend
cp .env.example .env        # puis renseignez les valeurs
mvn spring-boot:run          # http://localhost:8080

# Frontend (autre terminal)
cd frontend
cp .env.example .env         # API_URL=http://localhost:8080
npm install
npm start                    # http://localhost:4200
```

`npm start` et `npm run build` génèrent d'abord `src/environments/runtime-config.ts` à partir de `API_URL` (fichier non versionné).

Au premier démarrage, le backend crée un administrateur et un docteur (`ADMIN_*`, `DOCTOR_*`). Avec `SEED_DEMO_DATA=true` et une base sans patient, il ajoute 10 patients fictifs (mot de passe `Patient#2026`), des rendez-vous et des messages.

## Variables d'environnement (backend)

| Variable | Rôle |
|---|---|
| `MONGODB_URI` | Chaîne de connexion MongoDB (Atlas : `mongodb+srv://…/clinic`) |
| `JWT_SECRET` | Secret de signature des jetons (chaîne aléatoire longue) |
| `RESEND_API_KEY` | Clé API Resend. Absente : les emails sont seulement journalisés |
| `MAIL_FROM` | Expéditeur, sur un domaine vérifié dans Resend |
| `DOCTOR_NOTIFICATION_EMAIL` | Adresse(s) qui reçoivent les notifications du cabinet |
| `FRONTEND_URL` | URL publique du frontend (liens des emails) |
| `ALLOWED_ORIGINS` | Origines CORS autorisées, séparées par des virgules (jokers acceptés) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Administrateur créé au premier démarrage |
| `DOCTOR_EMAIL` / `DOCTOR_PASSWORD` / `DOCTOR_FIRST_NAME` / `DOCTOR_LAST_NAME` | Docteur créé au premier démarrage |
| `CLINIC_NAME`, `CLINIC_TIME_ZONE` | Nom et fuseau du cabinet (défaut : Europe/Paris) |
| `SEED_DEMO_DATA` | `true` pour les données fictives |

Les horaires d'ouverture et la durée des créneaux se règlent dans `backend/src/main/resources/application.yml` (`app.schedule`). L'identité affichée (nom, docteur, adresse, téléphone) se règle dans `frontend/src/app/core/config.ts`.

## Déploiement

### 1. MongoDB Atlas
Créez un cluster (l'offre gratuite M0 suffit), un utilisateur de base de données, puis autorisez l'accès réseau depuis `0.0.0.0/0` (les IP sortantes de Render ne sont pas fixes sur l'offre gratuite). Copiez la chaîne de connexion en ajoutant le nom de base : `…mongodb.net/clinic?retryWrites=true&w=majority`.

### 2. Resend
Vérifiez votre domaine (Domains), créez une clé API et utilisez une adresse de ce domaine dans `MAIL_FROM`. Sans domaine vérifié, `onboarding@resend.dev` ne peut écrire qu'à l'adresse de votre compte Resend.

### 3. Backend sur Render
Render → **New → Blueprint** → sélectionnez ce dépôt : `render.yaml` crée le service Docker (`backend/Dockerfile`) et demande les variables marquées `sync: false`. `JWT_SECRET` est généré automatiquement. Le health check est `/api/health`.

Sur l'offre gratuite, le service se met en veille après 15 minutes d'inactivité ; la première requête suivante prend environ une minute. Le frontend affiche alors un état d'erreur avec un bouton « Réessayer ».

### 4. Frontend sur Cloudflare Pages
Workers & Pages → **Create → Pages → Connect to Git** :

| Réglage | Valeur |
|---|---|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist/frontend/browser` |
| Variables | `API_URL=https://<votre-service>.onrender.com`, `NODE_VERSION=22` |

`public/_redirects` gère le routage de l'application monopage et `public/_headers` ajoute les en-têtes de sécurité et de cache.

Enfin, reportez l'URL Pages dans `FRONTEND_URL` et `ALLOWED_ORIGINS` sur Render (par ex. `https://clinique-eclat.pages.dev,https://*.clinique-eclat.pages.dev` pour inclure les déploiements de prévisualisation).

## Structure

```
backend/
  src/main/java/com/eclat/clinic/
    config/      sécurité, propriétés, données initiales
    model/       documents MongoDB et énumérations
    repository/  accès aux données
    service/     logique métier, emails Resend, dashboards
    security/    JWT
    web/         contrôleurs REST (/api/auth, /api/public, /api/patient, /api/doctor, /api/admin)
frontend/
  src/app/
    core/        services API, authentification, thème, toasts, formats
    ui/          composants (badge, bannière, skeleton, toasts, modale, graphiques, illustrations…)
    layout/      mise en page publique et espaces connectés
    pages/       public, auth, patient, doctor, admin, shared
render.yaml      blueprint Render
```

## Sécurité

- Mots de passe hachés (BCrypt), jetons JWT signés ; le compte est relu à chaque requête, donc une restriction ou un changement de rôle s'applique immédiatement.
- Liens d'invitation et de réinitialisation à usage unique, stockés hachés (SHA-256) et limités dans le temps.
- Les messages envoyés en tant qu'invité ne sont rattachés à un compte qu'après validation de l'adresse par lien email.
- Limitation de débit sur la connexion, l'inscription, le mot de passe oublié et le formulaire de contact.
- Contenu saisi par les utilisateurs échappé dans les emails ; notes médicales jamais exposées aux patients.
