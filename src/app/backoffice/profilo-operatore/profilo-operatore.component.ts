import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OperatorProfileService } from './operator-profile.service';
import { OperatorProfile } from '../../shared/models/operator-profile-data.interface';
import { AuthService } from '../../shared/services/auth.service';

declare var bootstrap: any;

@Component({
  selector: 'app-profilo-operatore',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profilo-operatore.component.html',
  styleUrl: './profilo-operatore.component.css'
})
export class ProfiloOperatoreComponent implements OnInit {
  profile: OperatorProfile | null = null;
  isLoading: boolean = true;

  // Dati per modifica
  editProfile: Partial<OperatorProfile> = {};

  constructor(
    private profileService: OperatorProfileService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading = true;
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser || !currentUser.id) {
      console.error('Utente corrente non trovato');
      this.isLoading = false;
      return;
    }

    this.profileService.getProfile(currentUser.id).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.editProfile = { ...profile };
        this.isLoading = false;
        this.updateUI();
      },
      error: (error) => {
        console.error('Errore nel caricamento del profilo:', error);
        this.isLoading = false;
      }
    });
  }

  updateUI() {
    if (!this.profile) return;

    // Aggiorna i campi di visualizzazione
    const firstNameEl = document.getElementById('displayFirstname') as HTMLInputElement;
    const lastNameEl = document.getElementById('displayLastname') as HTMLInputElement;
    const emailEl = document.getElementById('displayEmail') as HTMLInputElement;
    const phoneEl = document.getElementById('displayPhone') as HTMLInputElement;
    const birthdateEl = document.getElementById('displayBirthdate') as HTMLInputElement;
    const genderEl = document.getElementById('displayGender') as HTMLInputElement;
    const nameEl = document.querySelector('.fs-17.mb-1');
    const roleEl = document.querySelector('.text-muted.mb-0');

    if (firstNameEl) firstNameEl.value = this.profile.firstName;
    if (lastNameEl) lastNameEl.value = this.profile.lastName;
    if (emailEl) emailEl.value = this.profile.email;
    if (phoneEl) phoneEl.value = this.profile.phone;
    if (birthdateEl) birthdateEl.value = this.profile.birthdateDisplay || this.profile.birthdate;
    if (genderEl) genderEl.value = this.profile.gender;
    if (nameEl) nameEl.textContent = `${this.profile.firstName} ${this.profile.lastName}`;
    if (roleEl) roleEl.textContent = this.profile.role;

    // Aggiorna i campi della modale di modifica
    const editFirstNameEl = document.getElementById('editFirstname') as HTMLInputElement;
    const editLastNameEl = document.getElementById('editLastname') as HTMLInputElement;
    const editEmailEl = document.getElementById('editEmail') as HTMLInputElement;
    const editPhoneEl = document.getElementById('editPhone') as HTMLInputElement;
    const editBirthdateEl = document.getElementById('editBirthdate') as HTMLInputElement;
    const editGenderEl = document.getElementById('editGender') as HTMLSelectElement;

    if (editFirstNameEl) editFirstNameEl.value = this.profile.firstName;
    if (editLastNameEl) editLastNameEl.value = this.profile.lastName;
    if (editEmailEl) editEmailEl.value = this.profile.email;
    if (editPhoneEl) editPhoneEl.value = this.profile.phone;
    if (editBirthdateEl) editBirthdateEl.value = this.profile.birthdate;
    if (editGenderEl) editGenderEl.value = this.profile.gender;
  }

  saveProfileChanges() {
    const editFirstNameEl = document.getElementById('editFirstname') as HTMLInputElement;
    const editLastNameEl = document.getElementById('editLastname') as HTMLInputElement;
    const editEmailEl = document.getElementById('editEmail') as HTMLInputElement;
    const editPhoneEl = document.getElementById('editPhone') as HTMLInputElement;
    const editBirthdateEl = document.getElementById('editBirthdate') as HTMLInputElement;
    const editGenderEl = document.getElementById('editGender') as HTMLSelectElement;

    if (!editFirstNameEl || !editLastNameEl || !editEmailEl || !editPhoneEl || !editBirthdateEl || !editGenderEl) {
      alert('Errore: campi non trovati');
      return;
    }

    const updatedProfile: Partial<OperatorProfile> = {
      firstName: editFirstNameEl.value,
      lastName: editLastNameEl.value,
      email: editEmailEl.value,
      phone: editPhoneEl.value,
      birthdate: editBirthdateEl.value,
      gender: editGenderEl.value
    };

    this.profileService.updateProfile(updatedProfile).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.updateUI();
        
        // Chiudi la modale
        const modalElement = document.getElementById('editProfileModal');
        if (modalElement) {
          const BootstrapModal = (window as any).bootstrap?.Modal;
          if (BootstrapModal) {
            const modal = BootstrapModal.getInstance(modalElement);
            if (modal) {
              modal.hide();
            }
          }
        }
        
        alert('✓ Profilo aggiornato con successo!');
      },
      error: (error) => {
        console.error('Errore nell\'aggiornamento del profilo:', error);
        alert('Errore nell\'aggiornamento del profilo. Riprova più tardi.');
      }
    });
  }

  clearPasswordFields() {
    const oldPasswordEl = document.getElementById('oldpasswordInput') as HTMLInputElement;
    const newPasswordEl = document.getElementById('newpasswordInput') as HTMLInputElement;
    const confirmPasswordEl = document.getElementById('confirmpasswordInput') as HTMLInputElement;

    if (oldPasswordEl) oldPasswordEl.value = '';
    if (newPasswordEl) newPasswordEl.value = '';
    if (confirmPasswordEl) confirmPasswordEl.value = '';
  }

  changePassword() {
    const oldPasswordEl = document.getElementById('oldpasswordInput') as HTMLInputElement;
    const newPasswordEl = document.getElementById('newpasswordInput') as HTMLInputElement;
    const confirmPasswordEl = document.getElementById('confirmpasswordInput') as HTMLInputElement;

    if (!oldPasswordEl || !newPasswordEl || !confirmPasswordEl) {
      alert('Errore: campi non trovati');
      return;
    }

    const oldPassword = oldPasswordEl.value;
    const newPassword = newPasswordEl.value;
    const confirmPassword = confirmPasswordEl.value;

    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('Per favore compila tutti i campi!');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Le password non corrispondono!');
      return;
    }

    if (newPassword.length < 8) {
      alert('La password deve essere di almeno 8 caratteri!');
      return;
    }

    this.profileService.changePassword(oldPassword, newPassword).subscribe({
      next: (success) => {
        if (success) {
          // Pulisci i campi
          this.clearPasswordFields();
          
          alert('✓ Password cambiata con successo!');
        } else {
          alert('Errore nel cambio password. Riprova più tardi.');
        }
      },
      error: (error) => {
        console.error('Errore nel cambio password:', error);
        alert('Errore nel cambio password. Riprova più tardi.');
      }
    });
  }

  toggleMenu(event: Event, targetId: string) {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      const BootstrapCollapse = (window as any).bootstrap?.Collapse;
      if (BootstrapCollapse) {
        const collapse = new BootstrapCollapse(target, { toggle: true });
      } else {
        // Fallback manuale
        target.classList.toggle('show');
      }
    }
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }
}
