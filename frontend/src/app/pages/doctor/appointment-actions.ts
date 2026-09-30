import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DoctorApi } from '../../core/api';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage, formatDateTime } from '../../core/format';
import { Appointment, AppointmentStatus } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { I18n, TKey } from '../../core/i18n/i18n';

/** Doctor's status actions on an appointment, with confirmation and notifications. */
@Injectable({ providedIn: 'root' })
export class AppointmentActions {
  private api = inject(DoctorApi);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private i18n = inject(I18n);

  async setStatus(a: Appointment, status: AppointmentStatus): Promise<Appointment | null> {
    let reason: string | undefined;
    if (status === 'CANCELLED') {
      const r = await this.confirm.ask({
        title: this.i18n.t('myAppointments.cancelTitle'),
        message: `${a.patient.name} · ${formatDateTime(a.startAt)}${a.patient.email ? '. ' + this.i18n.t('actions.patientNotified') : ''}`,
        confirmLabel: this.i18n.t('myAppointments.cancelConfirm'),
        cancelLabel: this.i18n.t('common.back'),
        tone: 'danger',
        input: { label: this.i18n.t('actions.reasonLabel'), placeholder: this.i18n.t('actions.reasonPlaceholder') },
      });
      if (!r.confirmed) return null;
      reason = r.value || undefined;
    }
    try {
      const updated = await firstValueFrom(this.api.setStatus(a.id, status, reason));
      const msg: Record<AppointmentStatus, TKey> = {
        CONFIRMED: 'actions.toastConfirmed',
        CANCELLED: 'actions.toastCancelled',
        COMPLETED: 'actions.toastCompleted',
        NO_SHOW: 'actions.toastNoShow',
        PENDING: 'actions.toastPending',
      };
      this.toast.success(this.i18n.t(msg[status]), status === 'CONFIRMED' && a.patient.email ? this.i18n.t('actions.toastConfirmedText') : undefined);
      return updated;
    } catch (e) {
      this.toast.error(this.i18n.t('common.actionError'), errorMessage(e));
      return null;
    }
  }

  async remove(a: Appointment): Promise<boolean> {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('actions.deleteTitle'),
      message: this.i18n.t('actions.deleteText'),
      confirmLabel: this.i18n.t('common.delete'),
      tone: 'danger',
    });
    if (!ok) return false;
    try {
      await firstValueFrom(this.api.deleteAppointment(a.id));
      this.toast.success(this.i18n.t('actions.toastDeleted'));
      return true;
    } catch (e) {
      this.toast.error(this.i18n.t('common.deleteError'), errorMessage(e));
      return false;
    }
  }
}
