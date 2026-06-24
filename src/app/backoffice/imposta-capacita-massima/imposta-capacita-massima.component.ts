import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfigurazioneService } from '../../shared/services/configurazione.service';

@Component({
  selector: 'app-imposta-capacita-massima',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './imposta-capacita-massima.component.html',
  styleUrl: './imposta-capacita-massima.component.css'
})
export class ImpostaCapacitaMassimaComponent implements OnInit {
  capacitaMassima: number = 0;
  isLoading = true;
  isSaving = false;

  constructor(private configurazioneService: ConfigurazioneService) {}

  ngOnInit() {
    this.loadCapacitaMassima();
  }

  loadCapacitaMassima() {
    this.isLoading = true;
    this.configurazioneService.getCapacitaMassima().subscribe({
      next: (value) => {
        this.capacitaMassima = value;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        alert('Impossibile caricare la capacità massima.');
      }
    });
  }

  onSubmit() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.configurazioneService.saveCapacitaMassima(this.capacitaMassima).subscribe({
      next: () => {
        this.isSaving = false;
        window.dispatchEvent(new CustomEvent('capacitaMassimaChanged', {
          detail: { capacity: this.capacitaMassima }
        }));
        alert(`Capacità massima impostata a ${this.capacitaMassima} persone. Impostazione salvata!`);
      },
      error: () => {
        this.isSaving = false;
        alert('Errore durante il salvataggio. Riprova più tardi.');
      }
    });
  }
}
