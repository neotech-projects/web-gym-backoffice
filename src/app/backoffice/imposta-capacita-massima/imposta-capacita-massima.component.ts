import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-imposta-capacita-massima',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './imposta-capacita-massima.component.html',
  styleUrl: './imposta-capacita-massima.component.css'
})
export class ImpostaCapacitaMassimaComponent implements OnInit {
  capacitaMassima: number = 0;
  private readonly STORAGE_KEY = 'capacita_massima_palestra';

  ngOnInit() {
    this.loadCapacitaMassima();
  }

  loadCapacitaMassima() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.capacitaMassima = parseInt(saved, 10) || 0;
    }
  }

  onSubmit() {
    // Salva in localStorage
    localStorage.setItem(this.STORAGE_KEY, this.capacitaMassima.toString());
    
    // Emetti un evento personalizzato per notificare altri componenti
    window.dispatchEvent(new CustomEvent('capacitaMassimaChanged', {
      detail: { capacity: this.capacitaMassima }
    }));
    
    // TODO: In produzione, salvare la capacità massima via API
    alert(`Capacità massima impostata a ${this.capacitaMassima} persone. Impostazione salvata!`);
  }
}
