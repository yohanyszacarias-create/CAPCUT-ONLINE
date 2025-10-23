# VideoMakerOnline

Una aplicación web moderna para generar videos 16:9 de alta calidad a partir de audio, imágenes, música de fondo e intro opcionales. Diseñada para ejecutarse completamente en la nube con procesamiento escalable.

## Características

- **Generación de Videos 16:9**: Crea videos profesionales con resolución 1080p o 720p
- **Efecto Ken Burns**: Zoom suave y automático en cada imagen
- **Transiciones Suaves**: Encadenamiento de segmentos con transiciones fade configurables
- **Mezcla de Audio**: Combina audio principal con música de fondo (BGM) opcional
- **Intro Opcional**: Incluye clips de introducción al inicio del video
- **Procesamiento en Cola**: Maneja múltiples trabajos de forma asincrónica
- **Progreso en Vivo**: Monitorea el progreso del procesamiento en tiempo real
- **Almacenamiento en S3**: Compatible con AWS S3, Cloudflare R2 y MinIO
- **Modo Borrador**: Procesa rápidamente en 720p para vista previa
- **Aceleración GPU**: Soporte opcional para NVIDIA NVENC

## Arquitectura

```
VideoMakerOnline/
├── frontend/              # React + Vite + Tailwind
├── api/                   # Node.js + Express
├── worker/                # Procesador FFmpeg
├── infra/                 # Dockerfiles y configuración
└── docker-compose.yml     # Orquestación local
```

### Componentes

| Componente | Tecnología | Descripción |
|-----------|-----------|-------------|
| **Frontend** | React 18 + Vite | Interfaz de usuario moderna y responsiva |
| **API** | Node.js + Express | Gestión de jobs y URLs firmadas S3 |
| **Worker** | Node.js + FFmpeg | Procesamiento de videos en fases |
| **Almacenamiento** | S3 Compatible | MinIO (local), AWS S3 o Cloudflare R2 |
| **Cola de Trabajos** | Redis | Gestión de jobs en cola |

## Flujo de Procesamiento

### Fase 1: Ken Burns
Cada imagen se procesa con un efecto de zoom suave (1.0 → 1.08-1.12) durante su segmento de tiempo.

```bash
ffmpeg -loop 1 -t {duration} -i image.jpg \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,zoompan=z='1+on*{zStep}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d={frames}:s=1920x1080,fps=30" \
  -c:v libx264 -preset veryfast -crf 24 segment.mp4
```

### Fase 2: Transiciones
Los segmentos se encadenan con transiciones fade suave (~0.6s configurable).

```bash
ffmpeg -i seg1.mp4 -i seg2.mp4 \
  -filter_complex "[0][1]xfade=transition=fade:duration=0.6:offset=4.4[out]" \
  -map "[out]" slides.mp4
```

### Fase 3: Mezcla Final
Se combinan video, audio principal y BGM con sincronización exacta.

```bash
ffmpeg -i slides.mp4 -i audio.m4a -i bgm_ready.m4a \
  -filter_complex "[1][2]amix=inputs=2:duration=first:normalize=0[a]" \
  -map 0:v -map "[a]" -t {duration} -shortest final.mp4
```

## Instalación Local

### Requisitos Previos

- Docker y Docker Compose
- Node.js 20.x (para desarrollo sin Docker)
- FFmpeg (incluido en contenedor Docker)

### Configuración Rápida

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd VideoMakerOnline

# 2. Copiar archivo de entorno
cp .env.example .env

# 3. Iniciar servicios con Docker Compose
docker-compose up -d

# 4. Crear bucket en MinIO
# Acceder a http://localhost:9001
# Usuario: minioadmin / Contraseña: minioadmin
# Crear bucket: videomaker

# 5. Frontend estará disponible en http://localhost:5173
# API disponible en http://localhost:3000
```

### Instalación Manual (Desarrollo)

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Terminal 1: Iniciar API
npm run dev --workspace=api

# Terminal 2: Iniciar Worker
npm run dev --workspace=worker

# Terminal 3: Iniciar Frontend
npm run dev --workspace=frontend
```

## Variables de Entorno

### API y Worker

```env
# Entorno
NODE_ENV=production|development

# S3 Compatible
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=videomaker
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin

# Redis
REDIS_URL=redis://localhost:6379

# FFmpeg
DRAFT_MODE=1              # 1: 720p/25fps/ultrafast, 0: 1080p/30fps/veryfast
USE_NVENC=0               # 1: usar NVIDIA NVENC, 0: usar libx264
BGM_VOL=0.25              # Volumen de música de fondo (0-1)

# Worker
WORK_DIR=/tmp/videomaker
MAX_CONCURRENT=1          # Número de videos a procesar simultáneamente
POLL_INTERVAL=2000        # Milisegundos entre polls de cola
```

### Frontend

```env
VITE_API_URL=http://localhost:3000/api
```

## Uso de la API

### Crear un Job

```bash
POST /api/jobs
Content-Type: application/json

{
  "resolution": "1080p",  # 1080p o 720p
  "fps": 30,              # 25 o 30
  "zoomMax": 1.08,        # 1.06 a 1.12
  "fadeTime": 0.6         # 0.4 a 0.8 segundos
}

Response:
{
  "id": "uuid",
  "status": "queued",
  "message": "Job creado exitosamente"
}
```

### Obtener URL Firmada para Subida

```bash
POST /api/jobs/{jobId}/signed-url
Content-Type: application/json

{
  "fileType": "audio|image|bgm|intro",
  "fileName": "archivo.mp3"
}

Response:
{
  "signedUrl": "https://s3.example.com/...",
  "key": "jobs/{jobId}/input/audio/archivo.mp3"
}
```

### Obtener Estado del Job

```bash
GET /api/jobs/{jobId}

Response:
{
  "id": "uuid",
  "status": "queued|processing|done|error",
  "progress": 0-100,
  "message": "Descripción del estado",
  "downloadUrl": "https://s3.example.com/..." # Si status === done
}
```

### Stream de Progreso (SSE)

```bash
GET /api/jobs/{jobId}/stream

# Recibe eventos:
data: {"status":"processing","progress":35,"message":"Fase 1: Generando segmentos..."}
```

### Descargar Video

```bash
GET /api/jobs/{jobId}/download

# Redirige a URL de descarga firmada
```

## Despliegue en Producción

### Frontend - Vercel

```bash
# Conectar repositorio a Vercel
# Variables de entorno:
VITE_API_URL=https://api.example.com/api

# Deploy automático en push a main
```

### Backend - Railway/Fly.io

```bash
# Railway
railway link
railway up

# O Fly.io
fly deploy
```

### Configuración de S3

#### AWS S3
```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=videomaker-prod
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

#### Cloudflare R2
```env
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=videomaker
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

### Redis - Upstash

```env
REDIS_URL=redis://default:password@host:port
```

## Estructura de S3

```
videomaker/
├── jobs/
│   ├── {jobId}/
│   │   ├── input/
│   │   │   ├── audio/
│   │   │   │   └── audio.m4a
│   │   │   ├── image/
│   │   │   │   ├── image_0.jpg
│   │   │   │   └── image_1.jpg
│   │   │   ├── bgm/
│   │   │   │   └── bgm.m4a
│   │   │   └── intro/
│   │   │       └── intro.mp4
│   │   ├── work/
│   │   │   ├── phase1.log
│   │   │   ├── phase2.log
│   │   │   └── phase3.log
│   │   └── output/
│   │       └── final.mp4
```

## Configuración de Rendimiento

### Modo Borrador (DRAFT_MODE=1)
- Resolución: 720p
- FPS: 25
- Preset: ultrafast
- CRF: 28
- Uso: Vista previa rápida

### Modo Producción (DRAFT_MODE=0)
- Resolución: 1080p
- FPS: 30
- Preset: veryfast
- CRF: 24
- Uso: Video final de calidad

### Aceleración GPU (USE_NVENC=1)
- Requiere GPU NVIDIA con soporte NVENC
- Preset: default
- CRF: 23 (equivalente a 24 en libx264)
- Mejora de rendimiento: 3-5x más rápido

## Monitoreo

### Logs del API
```bash
docker logs videomaker-api
```

### Logs del Worker
```bash
docker logs videomaker-worker
```

### Estado de Redis
```bash
redis-cli
> INFO
> LLEN jobs:queue
> KEYS job:*
```

### Acceso a MinIO
```
http://localhost:9001
Usuario: minioadmin
Contraseña: minioadmin
```

## Troubleshooting

### El worker no procesa jobs

```bash
# Verificar conexión a Redis
redis-cli ping

# Verificar jobs en cola
redis-cli LLEN jobs:queue

# Verificar logs del worker
docker logs videomaker-worker -f
```

### Error de subida a S3

```bash
# Verificar credenciales en .env
# Verificar que el bucket existe en MinIO
# Verificar permisos de acceso

# Crear bucket si no existe:
aws s3 mb s3://videomaker --endpoint-url http://localhost:9000
```

### FFmpeg no encontrado

```bash
# Verificar instalación en contenedor
docker exec videomaker-worker ffmpeg -version

# Si usa instalación manual:
sudo apt-get install ffmpeg
```

## Roadmap Futuro

- [ ] Soporte para subtítulos SRT (quemado en video)
- [ ] Efectos adicionales (Ken Burns avanzado, filtros)
- [ ] Watermark personalizado
- [ ] Descarga de video en múltiples formatos
- [ ] API de webhooks para notificaciones
- [ ] Panel de administración
- [ ] Análisis de uso y estadísticas
- [ ] Soporte para múltiples idiomas en UI

## Licencia

MIT

## Soporte

Para reportar problemas o sugerencias, crea un issue en el repositorio.

## Autores

Desarrollado con ❤️ por el equipo de VideoMakerOnline
