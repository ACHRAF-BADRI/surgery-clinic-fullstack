import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './models';

export const passwordValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  !c.value || /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/.test(c.value) ? null : { password: true };

export const phoneValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  !c.value || /^[+0-9 ().-]{6,20}$/.test(c.value) ? null : { phone: true };

export const matchValidator =
  (a: string, b: string): ValidatorFn =>
  (g: AbstractControl): ValidationErrors | null => {
    const second = g.get(b);
    if (!second) return null;
    const mismatch = g.get(a)?.value !== second.value;
    const errors = { ...(second.errors ?? {}) };
    if (mismatch && second.value) errors['mismatch'] = true;
    else delete errors['mismatch'];
    second.setErrors(Object.keys(errors).length ? errors : null);
    return null;
  };

/** Maps validation errors returned by the API onto the form fields. */
export function applyServerErrors(form: FormGroup, err: unknown) {
  if (!(err instanceof HttpErrorResponse)) return;
  const fields = (err.error as Partial<ApiError> | null)?.fields;
  if (!fields) return;
  for (const [name, message] of Object.entries(fields)) {
    const c = form.get(name);
    if (c) {
      c.setErrors({ ...(c.errors ?? {}), server: message });
      c.markAsTouched();
    }
  }
}

/** Converts empty strings to undefined (optional fields). */
export function clean<T extends object>(v: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) out[k] = typeof val === 'string' && val.trim() === '' ? undefined : val;
  return out as T;
}
