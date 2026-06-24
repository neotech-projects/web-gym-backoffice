import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ConfigurazioneResponse {
  valore: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurazioneService {
  private get baseUrl(): string {
    const base = environment.apiUrl;
    return base ? `${base}/api/configurazione` : '/api/configurazione';
  }

  constructor(private http: HttpClient) {}

  getMargineEntrata(): Observable<number> {
    return this.http.get<ConfigurazioneResponse>(`${this.baseUrl}/margine-entrata`).pipe(
      map((res) => this.parseNonNegativeInt(res?.valore))
    );
  }

  saveMargineEntrata(minuti: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/margine-entrata`, { valore: String(minuti) });
  }

  getCapacitaMassima(): Observable<number> {
    return this.http.get<ConfigurazioneResponse>(`${this.baseUrl}/capacita-massima`).pipe(
      map((res) => this.parsePositiveInt(res?.valore))
    );
  }

  saveCapacitaMassima(capacita: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/capacita-massima`, { valore: String(capacita) });
  }

  private parsePositiveInt(raw: string | undefined | null): number {
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private parseNonNegativeInt(raw: string | undefined | null): number {
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
}
