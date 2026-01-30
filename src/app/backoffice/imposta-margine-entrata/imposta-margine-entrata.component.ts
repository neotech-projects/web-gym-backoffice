import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-imposta-margine-entrata',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './imposta-margine-entrata.component.html',
  styleUrl: './imposta-margine-entrata.component.css'
})
export class ImpostaMargineEntrataComponent implements OnInit {
  margineEntrata: number = 0;
  private readonly STORAGE_KEY = 'margine_entrata_palestra';

  ngOnInit() {
    this.loadMargineEntrata();
  }

  loadMargineEntrata() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.margineEntrata = parseInt(saved, 10) || 0;
    }
  }

  onSubmit() {
    // Salva in localStorage
    localStorage.setItem(this.STORAGE_KEY, this.margineEntrata.toString());
    
    // TODO: In produzione, salvare il margine entrata via API
    alert(`Margine entrata impostato a ${this.margineEntrata} minuti. Impostazione salvata!`);
  }
}

