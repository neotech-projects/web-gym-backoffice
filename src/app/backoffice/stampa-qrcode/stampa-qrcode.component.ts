import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-stampa-qrcode',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stampa-qrcode.component.html',
  styleUrl: './stampa-qrcode.component.css'
})
export class StampaQrcodeComponent {
  generaQRCode() {
    // TODO: In produzione, implementare la logica per generare il QR Code
    alert('Generazione QR Code in corso...');
  }
}
