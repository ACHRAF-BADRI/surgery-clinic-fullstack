# surgery-clinic-fullstack

![Angular](https://img.shields.io/badge/Angular-21-dd0031?logo=angular&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-6db33f?logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248?logo=mongodb&logoColor=white)
![Render](https://img.shields.io/badge/API-Render-46e3b7?logo=render&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Front-Cloudflare%20Pages-f38020?logo=cloudflare&logoColor=white)

**Clinique Badri** is a full-stack web application for a plastic, aesthetic and reconstructive surgery practice. It combines a public website, online appointment booking, secure messaging, a doctor workspace and account administration.

Three roles: **patient**, **doctor**, **admin**. Visitors without an account can browse the site and contact the clinic.

The user interface is available in **French and English** (live switch, remembered per browser); the code and its comments are in English.

| Part | Stack | Hosting |
|---|---|---|
| `frontend/` | Angular 21 (standalone, signals, zoneless), custom CSS | Cloudflare Pages |
| `backend/` | Spring Boot 4.1, Java 21, Spring Security (JWT), Spring Data MongoDB | Render (Docker) |
| Database | MongoDB | MongoDB Atlas |
| Email | Resend API | — |

## Features

**Visitors (no account)**
- Public website: home page, procedures filterable by category, opening hours, contact.
- Guest contact form (invisible honeypot field, rate limiting): the doctor gets an email and replies from the messaging inbox; the reply is sent to the guest by email.
- Appointment preparation (reason, date, time slot). **Confirming requires an account**; the selection is kept during sign-up or login.

**Patients**
- Sign-up, login, forgot password.
- Booking of real time slots (clinic opening hours, no overlaps), "pending" status until the clinic confirms.
- Online cancellation up to 24 h before the appointment, appointment history.
- Messaging with the clinic, unread counter.
- Profile and password change.

**Doctor**
- Dashboard: today's and this week's appointments, requests to confirm, unread messages, cancellation rate, appointments per month, most requested procedures.
- Weekly agenda: confirm, decline, **reschedule** (free slots or custom time), mark as completed or no-show.
- Access to **all patients** and their contact details, private medical notes.
- **Create patients without an account** ("Sans compte" badge), book appointments for them, then invite them by email to set a password.
- Messaging: filters (unread, guests, archived), replies, archiving.

**Admin**
- Dashboard: users per role, sign-ups per month, restricted accounts, recent logins.
- User CRUD, **role changes**, **restrict / reactivate** accounts (immediate effect, reason shown to the user), **set a password**.
- Full access to the doctor workspace.

**Emails (Resend)**: new appointment request, new message, cancellation by a patient (to the doctor); acknowledgement, confirmation, rescheduling, cancellation, reply, invitation, welcome, password reset (to the patient).

**UI**: light / dark / system theme (animated toggle), responsive layout, stacked toasts (pause on hover, swipe to dismiss), badges, banners, skeleton loaders, illustrations for empty and error states, page transitions (View Transitions API), `prefers-reduced-motion` respected.

**Languages (FR / EN)**: FR | EN switch in the header and in signed-in areas; the first visit follows the browser language. Dates, times, statuses, procedures, validation messages, toasts, page titles and API error codes are all translated.

## Translations

The dictionaries live in `frontend/src/app/core/i18n/`:

- `fr.ts`: French, the reference dictionary.
- `en.ts`: English. It must have exactly the same keys: a missing or extra key fails the build.
- `i18n.ts`: `I18n` service, `t` pipe and translated page titles.

Use a key in a template with `{{ 'home.hero.title' | t }}`, or with parameters: `{{ 'agenda.count' | t: { n: 3 } }}`. In TypeScript, use `inject(I18n).t('key')`. Keys are typed: a typo is a compile error.

The API returns stable error codes (`SLOT_UNAVAILABLE`, `EMAIL_TAKEN`…) and codes for statuses, procedures and days; the frontend translates them. Emails sent by the backend are currently in French.

## Getting started

Requirements: Java 21, Maven 3.9, Node 20.19+ (or 22), MongoDB (local or Atlas).

```bash
git clone https://github.com/ACHRAF-BADRI/surgery-clinic-fullstack.git
cd surgery-clinic-fullstack

# Backend
cd backend
cp .env.example .env        # then fill in the values
mvn spring-boot:run          # http://localhost:8080

# Frontend (second terminal)
cd frontend
cp .env.example .env         # API_URL=http://localhost:8080
npm install
npm start                    # http://localhost:4200
```

`npm start` and `npm run build` first generate `src/environments/runtime-config.ts` from `API_URL` (this file is not versioned).

If port 8080 is already in use, add `PORT=8090` to `backend/.env` and `API_URL=http://localhost:8090` to `frontend/.env`. With an Atlas database, your machine's IP address must be allowed under **Network Access**.

Avoid accented characters in `backend/.env` values: Spring reads this file as ISO-8859-1. Set accented values in `application.yml` or on Render instead.

On first startup, the backend creates an admin and a doctor account (`ADMIN_*`, `DOCTOR_*`). With `SEED_DEMO_DATA=true` and a database without patients, it also adds 10 fake patients (password `Patient#2026`), appointments and messages.

## Environment variables (backend)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas: `mongodb+srv://…/clinic`) |
| `JWT_SECRET` | Token signing secret (long random string) |
| `RESEND_API_KEY` | Resend API key. When missing, emails are only logged |
| `MAIL_FROM` | Sender address, on a domain verified in Resend |
| `DOCTOR_NOTIFICATION_EMAIL` | Address(es) receiving the clinic notifications |
| `FRONTEND_URL` | Public frontend URL (used for links in emails) |
| `ALLOWED_ORIGINS` | Allowed CORS origins, comma-separated (wildcards allowed) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin account created on first startup |
| `DOCTOR_EMAIL` / `DOCTOR_PASSWORD` / `DOCTOR_FIRST_NAME` / `DOCTOR_LAST_NAME` | Doctor account created on first startup |
| `CLINIC_NAME`, `CLINIC_TIME_ZONE` | Clinic name and time zone (default: Europe/Paris) |
| `SEED_DEMO_DATA` | `true` to create fake demo data |
| `PORT` | HTTP port (default 8080; set automatically by Render) |

Opening hours and slot length are configured in `backend/src/main/resources/application.yml` (`app.schedule`). The clinic identity shown in the UI (name, doctor, address, phone) is configured in `frontend/src/app/core/config.ts`.

## Deployment

### 1. MongoDB Atlas
Create a cluster (the free M0 tier is enough) and a database user, then allow network access from `0.0.0.0/0` (Render's outbound IPs are not fixed on the free plan). Copy the connection string and add the database name: `…mongodb.net/clinic?retryWrites=true&w=majority`.

### 2. Resend
Verify your domain (Domains), create an API key (a "Sending access" key is enough) and use an address on that domain in `MAIL_FROM`. Without a verified domain, `onboarding@resend.dev` can only send to your Resend account's own address.

### 3. Backend on Render
Render → **New → Blueprint** → select this repository. `render.yaml` creates the Docker service (`backend/Dockerfile`) and prompts for the variables marked `sync: false`. `JWT_SECRET` is generated automatically. The health check path is `/api/health`.

On the free plan, the service sleeps after 15 minutes of inactivity and the next request takes about a minute. Meanwhile the frontend shows an error state with a "Réessayer" (retry) button.

### 4. Frontend on Cloudflare Pages
Workers & Pages → **Create → Pages → Connect to Git**:

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist/frontend/browser` |
| Variables | `API_URL=https://<your-service>.onrender.com`, `NODE_VERSION=22` |

`public/_redirects` handles single-page app routing and `public/_headers` adds security and cache headers.

Finally, set the Pages URL in `FRONTEND_URL` and `ALLOWED_ORIGINS` on Render (e.g. `https://clinique-badri.pages.dev,https://*.clinique-badri.pages.dev` to include preview deployments).

## Project structure

```
backend/
  src/main/java/com/badri/clinic/
    config/      security, properties, initial data
    model/       MongoDB documents and enums
    repository/  data access
    service/     business logic, Resend emails, dashboards
    security/    JWT
    web/         REST controllers (/api/auth, /api/public, /api/patient, /api/doctor, /api/admin)
frontend/
  src/app/
    core/        API services, authentication, theme, toasts, formatting
    ui/          components (badge, banner, skeleton, toasts, modal, charts, illustrations…)
    layout/      public layout and signed-in areas
    pages/       public, auth, patient, doctor, admin, shared
render.yaml      Render blueprint
```

## API

| Prefix | Access | Content |
|---|---|---|
| `/api/health` | public | health check |
| `/api/public/*` | public | clinic info, availability, contact form |
| `/api/auth/*` | public / signed in | login, sign-up, forgot password, profile |
| `/api/patient/*` | patient | appointments, messaging |
| `/api/doctor/*` | doctor, admin | dashboard, patients, agenda, messaging |
| `/api/admin/*` | admin | dashboard, user management |

Errors are returned as `{ status, code, message, fields }`, with messages in French.

## Security

- Passwords hashed with BCrypt, signed JWTs; the account is reloaded on every request, so a restriction or role change takes effect immediately.
- Single-use invitation and password-reset links, stored hashed (SHA-256) and time-limited.
- Messages sent as a guest are only attached to an account after the email address is verified through an emailed link.
- Rate limiting on login, sign-up, forgot password and the contact form.
- User input escaped in emails; medical notes are never exposed to patients.
