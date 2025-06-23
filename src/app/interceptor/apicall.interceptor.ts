import { HttpInterceptorFn } from '@angular/common/http';

export const apicallInterceptor: HttpInterceptorFn = (req, next) => {

  const token = localStorage.getItem('RkJewellersUser');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
