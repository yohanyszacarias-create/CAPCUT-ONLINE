# Guía de Desarrollo Local

Esta guía describe cómo configurar el entorno de desarrollo local para VideoMakerOnline.

## Requisitos Previos

- **Node.js**: 20.x LTS
- **npm**: 9.x o superior
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.0+
- **FFmpeg**: 4.4+ (incluido en contenedor Docker)

## Instalación Rápida

### 1. Clonar Repositorio

```bash
git clone https://github.com/tu-usuario/VideoMakerOnline.git
cd VideoMakerOnline
```

### 2. Ejecutar Setup Script

```bash
bash scripts/setup.sh
```

Este script:
- Verifica requisitos
- Instala dependencias
- Crea archivo `.env`
- Inicia servicios con Docker Compose

### 3. Acceder a la Aplicación

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **MinIO Console**: http://localhost:9001

## Instalación Manual

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env` con valores locales (por defecto funcionan).

### 3. Iniciar Servicios Docker

```bash
docker-compose up -d
```

Verificar estado:

```bash
docker-compose ps
```

### 4. Crear Bucket en MinIO

```bash
# Acceder a http://localhost:9001
# Usuario: minioadmin
# Contraseña: minioadmin

# O usar AWS CLI
aws s3 mb s3://videomaker --endpoint-url http://localhost:9000
```

### 5. Iniciar Servicios en Desarrollo

En terminales separadas:

```bash
# Terminal 1: Frontend
npm run dev --workspace=frontend

# Terminal 2: API
npm run dev --workspace=api

# Terminal 3: Worker
npm run dev --workspace=worker
```

## Estructura de Carpetas

```
VideoMakerOnline/
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas
│   │   ├── services/        # Servicios (API)
│   │   ├── styles/          # CSS global
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── api/                      # Backend API
│   ├── src/
│   │   ├── controllers/     # Lógica de negocios
│   │   ├── routes/          # Rutas HTTP
│   │   ├── services/        # Servicios (S3, Redis)
│   │   ├── middleware/      # Middlewares
│   │   ├── utils/           # Utilidades
│   │   ├── config.js        # Configuración
│   │   └── index.js         # Punto de entrada
│   └── package.json
│
├── worker/                   # Procesador de Videos
│   ├── src/
│   │   ├── processors/      # Procesadores (VideoProcessor)
│   │   ├── services/        # Servicios (S3, Redis)
│   │   ├── utils/           # Utilidades (FFmpeg)
│   │   ├── config.js        # Configuración
│   │   └── worker.js        # Punto de entrada
│   └── package.json
│
├── infra/                    # Infraestructura
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   └── Dockerfile.worker
│   └── init-minio.sh
│
├── scripts/                  # Scripts útiles
│   ├── setup.sh
│   └── cleanup.sh
│
├── docker-compose.yml        # Orquestación local
├── .env.example              # Variables de entorno
├── .gitignore
├── package.json              # Monorepo
├── README.md
├── DEVELOPMENT.md            # Este archivo
└── DEPLOYMENT.md             # Guía de producción
```

## Desarrollo del Frontend

### Estructura de Componentes

```
frontend/src/
├── components/
│   ├── FileUpload.jsx       # Carga de archivos
│   ├── ProgressBar.jsx      # Barra de progreso
│   └── ...
├── pages/
│   ├── UploadJob.jsx        # Página principal
│   └── ...
├── services/
│   └── api.js               # Cliente HTTP
└── styles/
    └── index.css            # Estilos globales
```

### Agregar Nuevo Componente

```jsx
// frontend/src/components/MyComponent.jsx
import React from 'react';

export const MyComponent = ({ prop1, prop2 }) => {
  return (
    <div className="p-4 bg-white rounded-lg">
      {/* Contenido */}
    </div>
  );
};

export default MyComponent;
```

### Estilos con Tailwind

```jsx
<div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
  <span className="text-lg font-semibold text-gray-900">Título</span>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Acción
  </button>
</div>
```

## Desarrollo del Backend API

### Agregar Nueva Ruta

```javascript
// api/src/routes/newRoutes.js
import express from 'express';
import NewController from '../controllers/newController.js';

const router = express.Router();

router.post('/', NewController.create);
router.get('/:id', NewController.get);

export default router;
```

```javascript
// api/src/index.js
import newRoutes from './routes/newRoutes.js';

app.use('/api/new', newRoutes);
```

### Agregar Nuevo Controlador

```javascript
// api/src/controllers/newController.js
export class NewController {
  static async create(req, res) {
    try {
      const { data } = req.body;
      // Lógica
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async get(req, res) {
    try {
      const { id } = req.params;
      // Lógica
      res.json({ data: {} });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default NewController;
```

## Desarrollo del Worker

### Agregar Nuevo Procesador

```javascript
// worker/src/processors/newProcessor.js
export class NewProcessor {
  static async process(jobId) {
    try {
      // Lógica de procesamiento
      await RedisService.updateJobStatus(jobId, 'processing', 50, 'Procesando...');
      // Más lógica
      await RedisService.updateJobStatus(jobId, 'done', 100, 'Completado');
    } catch (error) {
      await RedisService.updateJobStatus(jobId, 'error', 0, error.message);
    }
  }
}

export default NewProcessor;
```

## Testing

### Frontend

```bash
# Instalar dependencias de testing
npm install --save-dev vitest @testing-library/react

# Crear test
# frontend/src/components/MyComponent.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText(/test/i)).toBeInTheDocument();
  });
});

# Ejecutar tests
npm run test --workspace=frontend
```

### Backend

```bash
# Instalar dependencias de testing
npm install --save-dev jest supertest

# Crear test
# api/src/__tests__/jobs.test.js
import request from 'supertest';
import app from '../index.js';

describe('Jobs API', () => {
  it('POST /api/jobs should create a job', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({ resolution: '1080p', fps: 30 });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});

# Ejecutar tests
npm run test --workspace=api
```

## Debugging

### Frontend

```javascript
// Usar React DevTools
// Instalar extensión en Chrome/Firefox

// Usar console.log
console.log('Debug:', variable);

// Usar debugger
debugger; // Pausa en DevTools
```

### Backend

```bash
# Iniciar con inspector
node --inspect-brk api/src/index.js

# Acceder a chrome://inspect en Chrome
```

### Worker

```bash
# Ver logs en tiempo real
docker logs -f videomaker-worker

# O en desarrollo
npm run dev --workspace=worker
```

### Redis

```bash
# Conectarse a Redis
redis-cli

# Ver todas las claves
> KEYS *

# Ver un job específico
> GET job:uuid

# Ver cola de jobs
> LRANGE jobs:queue 0 -1

# Limpiar base de datos
> FLUSHALL
```

### MinIO

```bash
# Acceder a http://localhost:9001
# Usuario: minioadmin
# Contraseña: minioadmin

# O usar AWS CLI
aws s3 ls s3://videomaker --endpoint-url http://localhost:9000 --recursive
```

## Comandos Útiles

### Docker Compose

```bash
# Ver estado de servicios
docker-compose ps

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f api

# Reiniciar un servicio
docker-compose restart api

# Detener todo
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Reconstruir imágenes
docker-compose build
```

### npm

```bash
# Instalar dependencias de todo el monorepo
npm install

# Instalar en un workspace específico
npm install --workspace=frontend

# Ejecutar script en workspace
npm run dev --workspace=frontend

# Listar workspaces
npm ls -a
```

### Git

```bash
# Ver cambios
git status

# Agregar cambios
git add .

# Commit
git commit -m "Descripción del cambio"

# Push
git push origin main

# Ver historial
git log --oneline
```

## Solución de Problemas

### Puerto ya en uso

```bash
# Encontrar proceso en puerto
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O cambiar puerto en .env
PORT=3001
```

### Contenedor no inicia

```bash
# Ver logs
docker-compose logs api

# Reconstruir
docker-compose build api

# Reiniciar
docker-compose restart api
```

### Redis no conecta

```bash
# Verificar que Redis está corriendo
docker-compose ps redis

# Verificar conexión
redis-cli ping

# Reiniciar Redis
docker-compose restart redis
```

### MinIO no responde

```bash
# Verificar estado
docker-compose ps minio

# Ver logs
docker-compose logs minio

# Reiniciar
docker-compose restart minio

# Acceder a console
# http://localhost:9001
```

### FFmpeg no encontrado

```bash
# En contenedor Docker
docker exec videomaker-worker ffmpeg -version

# En máquina local
sudo apt-get install ffmpeg

# O descargar desde ffmpeg.org
```

## Performance

### Optimizar Frontend

```javascript
// Usar React.memo para evitar re-renders
export const MyComponent = React.memo(({ prop }) => {
  return <div>{prop}</div>;
});

// Usar useCallback para funciones
const handleClick = useCallback(() => {
  // Lógica
}, []);

// Usar useMemo para cálculos costosos
const result = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### Optimizar Backend

```javascript
// Usar caching
const cache = new Map();

// Usar connection pooling
const pool = new Pool({ max: 10 });

// Usar compression
app.use(compression());

// Usar rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

## Recursos Útiles

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Express.js](https://expressjs.com)
- [FFmpeg Docs](https://ffmpeg.org/documentation.html)
- [Redis Docs](https://redis.io/documentation)
- [Docker Docs](https://docs.docker.com)

## Contacto y Soporte

Para preguntas o problemas durante el desarrollo, abre un issue en GitHub o contacta al equipo.

