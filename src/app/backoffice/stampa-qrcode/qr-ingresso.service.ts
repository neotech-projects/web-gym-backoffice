import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Risposta GET /corrente e POST /rigenera */
export interface QrCorrenteDto {
  uuid?: string;
  urlNelQr?: string;
  imageBase64?: string;
}

@Injectable({ providedIn: 'root' })
export class QrIngressoService {
  private baseUrl(): string {
    const b = environment.apiUrl;
    return b ? `${b}/api/qr-ingresso` : '/api/qr-ingresso';
  }

  constructor(private http: HttpClient) {}

  getCorrente(): Observable<QrCorrenteDto> {
    return this.http.get<QrCorrenteDto>(`${this.baseUrl()}/corrente`);
  }

  rigenera(): Observable<QrCorrenteDto> {
    return this.http.post<QrCorrenteDto>(`${this.baseUrl()}/rigenera`, null);
  }
}
