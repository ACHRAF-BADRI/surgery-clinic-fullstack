import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { DoctorApi, PatientApi } from './api';

/** Unread thread counter, refreshed periodically in signed-in areas. */
@Injectable({ providedIn: 'root' })
export class UnreadService {
  private auth = inject(AuthService);
  private patientApi = inject(PatientApi);
  private doctorApi = inject(DoctorApi);
  readonly count = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  start(destroyRef: DestroyRef) {
    this.refresh();
    clearInterval(this.timer);
    this.timer = setInterval(() => document.visibilityState === 'visible' && this.refresh(), 60_000);
    destroyRef.onDestroy(() => clearInterval(this.timer));
  }

  refresh() {
    const role = this.auth.role();
    if (role === 'PATIENT') {
      this.patientApi.unreadCount().subscribe({ next: (r) => this.count.set(r.count), error: () => {} });
    } else if (role === 'DOCTOR' || role === 'ADMIN') {
      this.doctorApi.threads('unread').subscribe({ next: (t) => this.count.set(t.length), error: () => {} });
    }
  }
}
