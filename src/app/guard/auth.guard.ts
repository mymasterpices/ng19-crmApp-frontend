import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {

  const user = sessionStorage.getItem('RkJewellersUser');
  if (!user) {
    return false;
  }

  return true;

};
