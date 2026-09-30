import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API } from './config';
import { ToastService } from './toast.service';

/** Adds the JWT and handles session expiry / account restriction. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);
  const token = auth.token();
  const isApi = req.url.startsWith(API);

  const request = token && isApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      if (err instanceof HttpErrorResponse && err.status === 401 && token && isApi && !isAuthCall) {
        auth.logout(false);
        toast.warning('Session expirée', 'Merci de vous reconnecter pour continuer.');
        router.navigate(['/connexion'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
