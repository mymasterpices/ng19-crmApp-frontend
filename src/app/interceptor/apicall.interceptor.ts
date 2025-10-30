import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const apicallInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('RkJewellersUser');

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // This acts like a "catch" block
      if (err.status === 401) {
        localStorage.removeItem('RkJewellersUser'); // clear token
        router.navigate(['/login']); // redirect to login
      }
      // Re-throw the error so other parts of app can handle it if needed
      return throwError(() => err);
    })
  );
};
