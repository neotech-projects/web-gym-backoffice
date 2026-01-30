# Mock Server per Dashboard

Questo mock server simula il microservizio esterno che fornisce i dati della dashboard.

## Installazione

Prima di avviare il mock server, installa le dipendenze:

```bash
npm install
```

## Avvio del Mock Server

Per avviare il mock server, esegui:

```bash
npm run mock-server
```

Il server si avvierà su `http://localhost:3000`

## Endpoint Disponibili

### GET /api/dashboard/stats
Restituisce tutte le statistiche della dashboard:
- `weeklyBookings`: Prenotazioni settimanali
- `monthlyPresences`: Presenze mensili
- `currentPresences`: Presenze attuali (valore casuale tra 0-5)
- `lastUpdate`: Timestamp dell'ultimo aggiornamento

**Risposta:**
```json
{
  "success": true,
  "data": {
    "weeklyBookings": 15,
    "monthlyPresences": 28,
    "currentPresences": 3,
    "lastUpdate": "2024-01-15T10:30:00.000Z"
  },
  "message": "Dati recuperati con successo"
}
```

### GET /api/dashboard/stats/current-presences
Restituisce solo il numero di presenze attuali (usato per aggiornamenti periodici).

**Risposta:**
```json
{
  "success": true,
  "currentPresences": 3
}
```

### GET /health
Endpoint di health check per verificare che il server sia attivo.

## Utilizzo con l'Applicazione Angular

### Con Proxy (Raccomandato)

1. Avvia il mock server: `npm run mock-server`
2. In un altro terminale, avvia l'applicazione Angular: `npm start`
3. La dashboard caricherà automaticamente i dati dal mock server tramite il proxy configurato

Il proxy è configurato in `proxy.conf.json` e permette di:
- Evitare problemi di CORS
- Usare URL relativi nel codice
- Gestire meglio gli errori di connessione

### Senza Proxy

Se preferisci non usare il proxy, puoi modificare `dashboard.service.ts` per usare l'URL completo `http://localhost:3000/api/dashboard/stats`.

## Gestione Errori e Fallback

L'applicazione gestisce automaticamente gli errori di connessione:

1. **Prima tentativo**: Chiamata al microservizio su `http://localhost:3000`
2. **Se il server non è disponibile**: Fallback automatico al file JSON statico in `src/assets/mock/dashboard-stats.json`
3. **Se anche il mock fallisce**: Usa dati di default hardcoded

Gli errori di connessione vengono gestiti in modo silenzioso quando il fallback funziona correttamente, evitando log eccessivi in console.

## Note

- Il servizio verifica periodicamente se il server è disponibile (ogni minuto)
- Se il server non è disponibile, le chiamate successive useranno direttamente il mock locale senza tentare di connettersi
- Per testare il fallback, basta non avviare il mock server: l'applicazione userà automaticamente i dati mock

