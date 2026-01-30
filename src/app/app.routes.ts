import { Routes } from '@angular/router';
import { DashboardComponent } from './backoffice/dashboard/dashboard.component';
import { adminGuard } from './shared/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'registrazione',
        loadComponent: () => import('./auth/registrazione/registrazione.component').then(m => m.RegistrazioneComponent)
      },
      {
        path: 'password-reset',
        loadComponent: () => import('./auth/password-reset/password-reset.component').then(m => m.PasswordResetComponent)
      }
    ]
  },
  {
    path: 'backoffice',
    loadComponent: () => import('./backoffice/layout/backoffice-layout.component').then(m => m.BackofficeLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'gestisci-utenti',
        loadComponent: () => import('./backoffice/gestisci-utenti/gestisci-utenti.component').then(m => m.GestisciUtentiComponent)
      },
      {
        path: 'gestisci-prenotazioni',
        loadComponent: () => import('./backoffice/gestisci-prenotazioni/gestisci-prenotazioni.component').then(m => m.GestisciPrenotazioniComponent)
      },
      {
        path: 'registra-utente',
        loadComponent: () => import('./backoffice/registra-utente/registra-utente.component').then(m => m.RegistraUtenteComponent)
      },
      {
        path: 'registra-operatore',
        loadComponent: () => import('./backoffice/registra-operatore/registra-operatore.component').then(m => m.RegistraOperatoreComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'visualizza-operatori',
        loadComponent: () => import('./backoffice/visualizza-operatori/visualizza-operatori.component').then(m => m.VisualizzaOperatoriComponent)
      },
      {
        path: 'profilo-operatore',
        loadComponent: () => import('./backoffice/profilo-operatore/profilo-operatore.component').then(m => m.ProfiloOperatoreComponent)
      },
      {
        path: 'stampa-qrcode',
        loadComponent: () => import('./backoffice/stampa-qrcode/stampa-qrcode.component').then(m => m.StampaQrcodeComponent)
      },
      {
        path: 'imposta-margine-entrata',
        loadComponent: () => import('./backoffice/imposta-margine-entrata/imposta-margine-entrata.component').then(m => m.ImpostaMargineEntrataComponent)
      },
      {
        path: 'imposta-capacita-massima',
        loadComponent: () => import('./backoffice/imposta-capacita-massima/imposta-capacita-massima.component').then(m => m.ImpostaCapacitaMassimaComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
