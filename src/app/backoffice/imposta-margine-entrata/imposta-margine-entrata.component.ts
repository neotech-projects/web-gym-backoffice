import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfigurazioneService } from '../../shared/services/configurazione.service';

@Component({
  selector: 'app-imposta-margine-entrata',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './imposta-margine-entrata.component.html',
  styleUrl: './imposta-margine-entrata.component.css'
})
export class ImpostaMargineEntrataComponent implements OnInit {
  margineEntrata: number = 0;
  isLoading = true;
  isSaving = false;

  constructor(private configurazioneService: ConfigurazioneService) {}

  ngOnInit() {
    this.loadMargineEntrata();
  }

  loadMargineEntrata() {
    this.isLoading = true;
    this.configurazioneService.getMargineEntrata().subscribe({
      next: (value) => {
        this.margineEntrata = value;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        alert('Impossibile caricare il margine entrata.');
      }
    });
  }

  onSubmit() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.configurazioneService.saveMargineEntrata(this.margineEntrata).subscribe({
      next: () => {
        this.isSaving = false;
        alert(`Margine entrata impostato a ${this.margineEntrata} minuti. Impostazione salvata!`);
      },
      error: () => {
        this.isSaving = false;
        alert('Errore durante il salvataggio. Riprova più tardi.');
      }
    });
  }
}
