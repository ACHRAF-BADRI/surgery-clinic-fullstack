import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DoctorApi } from '../../core/api';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage, formatDateTime } from '../../core/format';
import { Appointment, AppointmentStatus } from '../../core/models';
import { ToastService } from '../../core/toast.service';

/** Doctor's status actions on an appointment, with confirmation and notifications. */
@Injectable({ providedIn: 'root' })
export class AppointmentActions {
  private api = inject(DoctorApi);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  async setStatus(a: Appointment, status: AppointmentStatus): Promise<Appointment | null> {
    let reason: string | undefined;
    if (status === 'CANCELLED') {
      const r = await this.confirm.ask({
        title: 'Annuler ce rendez-vous ?',
        message: `${a.patient.name} · ${formatDateTime(a.startAt)}${a.patient.email ? '. Le patient sera prévenu par email.' : ''}`,
        confirmLabel: 'Annuler le rendez-vous',
        cancelLabel: 'Retour',
        tone: 'danger',
        input: { label: 'Motif communiqué au patient', placeholder: 'Ex. : indisponibilité du docteur' },
      });
      if (!r.confirmed) return null;
      reason = r.value || undefined;
    }
    try {
      const updated = await firstValueFrom(this.api.setStatus(a.id, status, reason));
      const msg: Record<AppointmentStatus, string> = {
        CONFIRMED: 'Rendez-vous confirmé',
        CANCELLED: 'Rendez-vous annulé',
        COMPLETED: 'Rendez-vous marqué comme terminé',
        NO_SHOW: 'Absence enregistrée',
        PENDING: 'Rendez-vous remis en attente',
      };
      this.toast.success(msg[status], status === 'CONFIRMED' && a.patient.email ? 'Le patient a reçu une confirmation par email.' : undefined);
      return updated;
    } catch (e) {
      this.toast.error('Action impossible', errorMessage(e));
      return null;
    }
  }

  async remove(a: Appointment): Promise<boolean> {
    const ok = await this.confirm.confirm({
      title: 'Supprimer définitivement ?',
      message: 'Le rendez-vous sera effacé de l’historique. Préférez « Annuler » pour garder une trace.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return false;
    try {
      await firstValueFrom(this.api.deleteAppointment(a.id));
      this.toast.success('Rendez-vous supprimé');
      return true;
    } catch (e) {
      this.toast.error('Suppression impossible', errorMessage(e));
      return false;
    }
  }
}
