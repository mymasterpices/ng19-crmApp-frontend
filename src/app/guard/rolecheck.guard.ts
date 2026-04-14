import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const rolecheckGuard: CanActivateFn = (route, state) => {
  const _authService = inject(AuthService);
  const _router = inject(Router);

  const userRole = _authService.getUserRole(); // e.g., 'admin', 'karigar', 'user'
  const expectedRole = route.data['expectedRole'];

  // 1. If no specific role is required for this route, allow access
  if (!expectedRole) {
    return true;
  }

  // 2. Success: User role matches or user is superadmin (global access)
  if (userRole === expectedRole || userRole === 'superadmin') {
    return true;
  }

  // 3. Failure: Redirect based on role
  if (userRole === 'karigar') {
    return _router.createUrlTree(['/karigar/karigar-dashboard']);
  }

  return _router.createUrlTree(['/overview']);
};
