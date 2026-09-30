import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Requires being signed in with one of the given roles. */
export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } });
    }
    const role = auth.role();
    if (role && roles.includes(role)) return true;
    return router.createUrlTree([auth.homeFor(role)]);
  };

/** Login / sign-up pages: redirects an already signed-in user to their area. */
export const guestOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree([auth.homeFor()]) : true;
};
