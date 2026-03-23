import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { QrIngressoService } from './qr-ingresso.service';

@Component({
  selector: 'app-stampa-qrcode',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stampa-qrcode.component.html',
  styleUrl: './stampa-qrcode.component.css'
})
export class StampaQrcodeComponent implements OnInit {
  /** data URL per &lt;img src&gt; */
  qrDataUrl: string | null = null;
  /** Stringa codificata nel QR (stesso valore di {@code url} lato {@code QrIngressoService}). */
  urlNelQr: string | null = null;
  loading = false;
  error: string | null = null;

  constructor(private qrIngresso: QrIngressoService) {}

  ngOnInit(): void {
    this.caricaCorrente();
  }

  /** Carica il QR già in uso (generato dallo scheduler o da un rigenera precedente). */
  caricaCorrente(): void {
    this.error = null;
    this.loading = true;
    this.qrIngresso.getCorrente().subscribe({
      next: (dto) => this.applicaDto(dto),
      error: (err) => {
        this.loading = false;
        this.error = this.messaggioErroreHttp(err, 'caricamento');
      }
    });
  }

  /** Rigenera UUID + immagine lato server (in più rispetto al ciclo automatico ogni 4 giorni). */
  generaQRCode(): void {
    this.error = null;
    this.loading = true;
    this.qrIngresso.rigenera().subscribe({
      next: (dto) => this.applicaDto(dto),
      error: (err) => {
        this.loading = false;
        this.error = this.messaggioErroreHttp(err, 'rigenerazione');
      }
    });
  }

  private applicaDto(dto: { imageBase64?: string; urlNelQr?: string }): void {
    this.loading = false;
    this.urlNelQr = dto.urlNelQr ?? null;
    if (dto.imageBase64) {
      this.qrDataUrl = 'data:image/png;base64,' + dto.imageBase64;
      this.error = null;
    } else {
      this.qrDataUrl = null;
      this.urlNelQr = null;
      if (!this.error) {
        this.error =
          'Nessun QR in configurazione. Premi «Genera QR Code» oppure verifica i log del backoffice (DB / colonna valore troppo corta).';
      }
    }
  }

  private messaggioErroreHttp(err: unknown, contesto: 'caricamento' | 'rigenerazione'): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Sessione non valida: effettua di nuovo il login (token scaduto o assente).';
      }
      if (err.status === 0) {
        return `Errore di rete in ${contesto}: il backoffice su ${(err as HttpErrorResponse).url ?? 'API'} non risponde (CORS o server spento).`;
      }
      return `${contesto === 'caricamento' ? 'Caricamento' : 'Rigenerazione'} fallito (HTTP ${err.status}). Controlla i log del microservizio.`;
    }
    return `Errore in ${contesto}. Verifica che ms-gym-backoffice sia in esecuzione su porta 8080.`;
  }
}
