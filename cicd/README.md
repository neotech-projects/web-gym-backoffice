# Pipeline Jenkins – Build e Docker

Pipeline che builda il frontend Angular e crea un'immagine Docker basata su **nginx (Docker Hub)** per servire l'applicazione.

## Parametri

| Parametro | Obbligatorio | Descrizione |
|-----------|--------------|-------------|
| **GIT_TAG** | Sì | Tag del repository Git da buildare (es. `v1.0.0`, `release/2024-01`) |

## Utilizzo in Jenkins

1. Crea un job **Pipeline** e indica come “Pipeline script from SCM” il repository Git che contiene questo progetto.
2. Alla prima esecuzione (o da “Build with Parameters”) inserisci il **GIT_TAG** da buildare.
3. La pipeline:
   - fa checkout del tag indicato,
   - esegue `npm ci` e `npm run build`,
   - costruisce un’immagine Docker con base **nginx:alpine** (Docker Hub) che serve gli artefatti di build.

## Requisiti Jenkins

- **Node.js** disponibile sull’agent (per `npm`)
- **Docker** installato e accessibile dall’agent (per `docker.build`)
- Plugin: Pipeline, Git, (opzionale) Docker Pipeline

## Output

- Immagine Docker: `cloudtemplate-fe-angular:<GIT_TAG>` (es. `cloudtemplate-fe-angular:v1.0.0`).
- Base image: **nginx:alpine** da Docker Hub.

## File in `cicd/`

- **Jenkinsfile** – definizione della pipeline (parametro `GIT_TAG`, build Angular, build immagine).
- **Dockerfile** – usa `nginx:alpine`, copia gli artefatti in `/usr/share/nginx/html`.
- **nginx.conf** – configurazione nginx per SPA (routing Angular) e cache degli asset.
