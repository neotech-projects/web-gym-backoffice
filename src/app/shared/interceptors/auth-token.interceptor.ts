import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Aggiunge l'header authToken a tutte le richieste verso le API backoffice (/api/...),
 * escludendo login, registrazione e password-reset che sono pubblici.
 */
export function authTokenInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const auth = inject(AuthService);
  const url = req.url;

  // Endpoint pubblici: non inviare authToken
  if (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/registrazione') ||
    url.includes('/api/auth/password-reset')
  ) {
    return next(req);
  }

  // Per tutte le altre chiamate a /api/ aggiungi l'header authToken
  if (url.includes('/api/')) {
    const token = auth.getCurrentUser()?.token ?? '';
    const cloned = req.clone({ setHeaders: { authToken: token } });
    return next(cloned);
  }

  return next(req);
}
