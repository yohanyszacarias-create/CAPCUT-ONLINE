# Guía de Despliegue en Producción

Esta guía describe cómo desplegar VideoMakerOnline en producción utilizando servicios en la nube.

## Arquitectura de Producción

```
┌─────────────────────────────────────────────────────────────┐
│                     Cliente (Navegador)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vercel)                                           │
│  - React + Vite                                              │
│  - CDN Global                                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  API (Railway/Fly.io)                                        │
│  - Node.js + Express                                         │
│  - Gestión de Jobs                                           │
│  - URLs Firmadas S3                                          │
└─────────────────────────────────────────────────────────────┘
                    ↙                          ↘
        ┌────────────────────┐      ┌────────────────────┐
        │  Redis (Upstash)   │      │  S3 Compatible     │
        │  - Cola de Jobs    │      │  - AWS S3          │
        │  - Estado de Jobs  │      │  - Cloudflare R2   │
        └────────────────────┘      └────────────────────┘
                    ↑
        ┌────────────────────┐
        │  Worker (Railway)  │
        │  - FFmpeg          │
        │  - Procesamiento   │
        └────────────────────┘
```

## Paso 1: Preparar el Repositorio

### 1.1 Crear repositorio en GitHub

```bash
# Inicializar git
git init
git add .
git commit -m "Initial commit: VideoMakerOnline"

# Crear repositorio en GitHub y hacer push
git remote add origin https://github.com/tu-usuario/VideoMakerOnline.git
git branch -M main
git push -u origin main
```

### 1.2 Estructura para Vercel

Vercel necesita que el frontend esté en la raíz o en un directorio específico. Crear archivo `vercel.json`:

```json
{
  "buildCommand": "npm run build --workspace=frontend",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "@vite_api_url"
  }
}
```

## Paso 2: Desplegar Frontend en Vercel

### 2.1 Conectar Vercel

1. Ir a [vercel.com](https://vercel.com)
2. Hacer clic en "New Project"
3. Importar repositorio de GitHub
4. Seleccionar `VideoMakerOnline`

### 2.2 Configurar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_URL = https://api.tu-dominio.com/api
```

### 2.3 Configurar Build

- **Build Command**: `npm run build --workspace=frontend`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`

### 2.4 Deploy

Vercel desplegará automáticamente en cada push a `main`.

**URL del Frontend**: `https://videomaker-online.vercel.app` (o tu dominio personalizado)

## Paso 3: Desplegar Backend en Railway

### 3.1 Crear Proyecto en Railway

1. Ir a [railway.app](https://railway.app)
2. Hacer clic en "New Project"
3. Seleccionar "Deploy from GitHub"
4. Autorizar y seleccionar repositorio

### 3.2 Agregar Servicios

#### 3.2.1 API Service

1. En Railway Dashboard, crear nuevo servicio
2. Seleccionar "GitHub Repo"
3. Configurar:
   - **Root Directory**: `api`
   - **Dockerfile**: `infra/docker/Dockerfile.api`
   - **Port**: `3000`

#### 3.2.2 Worker Service

1. Crear otro servicio
2. Seleccionar "GitHub Repo"
3. Configurar:
   - **Root Directory**: `worker`
   - **Dockerfile**: `infra/docker/Dockerfile.worker`

### 3.3 Configurar Variables de Entorno

En Railway → Project → Variables:

```env
# Común
NODE_ENV=production

# S3 (AWS)
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=videomaker-prod
S3_ACCESS_KEY_ID=<tu-key>
S3_SECRET_ACCESS_KEY=<tu-secret>

# O S3 (Cloudflare R2)
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=videomaker
S3_ACCESS_KEY_ID=<tu-key>
S3_SECRET_ACCESS_KEY=<tu-secret>

# Redis (Upstash)
REDIS_URL=redis://default:<password>@<host>:<port>

# API
PORT=3000
CORS_ORIGIN=https://videomaker-online.vercel.app

# FFmpeg
DRAFT_MODE=0
USE_NVENC=0
BGM_VOL=0.25

# Worker
WORK_DIR=/tmp/videomaker
MAX_CONCURRENT=2
POLL_INTERVAL=2000
```

### 3.4 Configurar Dominios

En Railway → Deployments:

- **API**: Obtener dominio público (ej: `api-prod.railway.app`)
- Actualizar `VITE_API_URL` en Vercel a `https://api-prod.railway.app/api`

## Paso 4: Configurar S3

### Opción A: AWS S3

```bash
# Crear bucket
aws s3 mb s3://videomaker-prod --region us-east-1

# Configurar CORS
cat > cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://videomaker-online.vercel.app"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors --bucket videomaker-prod --cors-configuration file://cors.json

# Crear usuario IAM con permisos S3
# En AWS Console → IAM → Users → Create User
# Agregar política: AmazonS3FullAccess
```

### Opción B: Cloudflare R2

1. Ir a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Seleccionar "R2" → "Create bucket"
3. Nombre: `videomaker`
4. Crear "API Token" con permisos de lectura/escritura
5. Usar credenciales en variables de entorno

## Paso 5: Configurar Redis

### Opción: Upstash

1. Ir a [upstash.com](https://upstash.com)
2. Crear base de datos Redis
3. Copiar `REDIS_URL` (formato: `redis://default:password@host:port`)
4. Agregar a variables de entorno en Railway

## Paso 6: Monitoreo y Logs

### Railway Logs

```bash
# Instalar CLI de Railway
npm install -g @railway/cli

# Conectarse
railway login

# Ver logs
railway logs --service api
railway logs --service worker
```

### Monitoreo de Errores

Configurar alertas en Railway → Alerts:
- CPU > 80%
- Memory > 80%
- Failed Deployments

## Paso 7: Dominio Personalizado

### Vercel

1. Ir a Project Settings → Domains
2. Agregar dominio personalizado
3. Configurar DNS según instrucciones

### Railway

1. En Deployments → Custom Domain
2. Agregar dominio (ej: `api.tu-dominio.com`)
3. Configurar CNAME en DNS

## Paso 8: SSL/TLS

Todos los servicios incluyen SSL automáticamente:
- Vercel: Certificado automático
- Railway: Certificado automático
- Cloudflare R2: Certificado automático

## Paso 9: Backup y Recuperación

### Backup de S3

```bash
# Descargar todos los videos
aws s3 sync s3://videomaker-prod/jobs/ ./backup/jobs/

# Restaurar
aws s3 sync ./backup/jobs/ s3://videomaker-prod/jobs/
```

### Backup de Redis

Upstash proporciona backups automáticos. Configurar en Dashboard → Backups.

## Paso 10: Escalabilidad

### Aumentar Workers

En Railway, aumentar réplicas del servicio Worker:

```bash
# En Railway Dashboard → Worker Service → Deployments
# Configurar "Replica Count" a 2 o más
```

### Aumentar Capacidad de API

```bash
# En Railway Dashboard → API Service
# Aumentar "Memory" y "CPU"
```

## Checklist de Despliegue

- [ ] Repositorio en GitHub
- [ ] Frontend desplegado en Vercel
- [ ] API desplegada en Railway
- [ ] Worker desplegado en Railway
- [ ] S3 configurado (AWS o Cloudflare R2)
- [ ] Redis configurado (Upstash)
- [ ] Variables de entorno configuradas
- [ ] Dominios personalizados configurados
- [ ] SSL/TLS verificado
- [ ] Pruebas de extremo a extremo completadas
- [ ] Monitoreo y alertas configurados
- [ ] Backups configurados

## Troubleshooting

### API no responde

```bash
# Verificar estado en Railway
railway logs --service api

# Verificar variables de entorno
railway env

# Reiniciar servicio
railway redeploy
```

### Worker no procesa jobs

```bash
# Verificar logs
railway logs --service worker

# Verificar conexión a Redis
redis-cli -u $REDIS_URL ping

# Verificar jobs en cola
redis-cli -u $REDIS_URL LLEN jobs:queue
```

### Errores de S3

```bash
# Verificar credenciales
aws s3 ls --endpoint-url $S3_ENDPOINT

# Verificar bucket
aws s3 ls s3://$S3_BUCKET --endpoint-url $S3_ENDPOINT

# Verificar CORS
aws s3api get-bucket-cors --bucket $S3_BUCKET
```

## Costos Estimados (Mensual)

| Servicio | Plan | Costo |
|----------|------|-------|
| Vercel | Pro | $20 |
| Railway | Starter | $5-20 |
| AWS S3 | Pay-as-you-go | $0.023/GB |
| Cloudflare R2 | Pay-as-you-go | $0.015/GB |
| Upstash Redis | Free/Paid | $0-20 |
| **Total** | | **$25-75** |

## Referencias

- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [AWS S3 Docs](https://docs.aws.amazon.com/s3/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Upstash Docs](https://upstash.com/docs)

