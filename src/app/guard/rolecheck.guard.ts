import { CanActivateFn, Router } from '@angular/router';
import { LoginedUserService } from '../services/logined-user.service';
import { inject } from '@angular/core';

export const rolecheckGuard: CanActivateFn = (route, state) => {

  const loginedUser = inject(LoginedUserService);
  const router = inject(Router);

  if (loginedUser.getUserName() !== 'admin') {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
