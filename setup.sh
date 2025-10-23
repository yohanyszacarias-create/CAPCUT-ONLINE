#!/bin/bash

# Script de configuración rápida de VideoMakerOnline

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         VideoMakerOnline - Setup Script                    ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Detectar directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "📁 Directorio del proyecto: $PROJECT_DIR"

# Verificar requisitos
echo ""
echo "🔍 Verificando requisitos..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js no está instalado"
  exit 1
fi
echo "✓ Node.js $(node --version)"

if ! command -v npm &> /dev/null; then
  echo "❌ npm no está instalado"
  exit 1
fi
echo "✓ npm $(npm --version)"

if ! command -v docker &> /dev/null; then
  echo "❌ Docker no está instalado"
  exit 1
fi
echo "✓ Docker $(docker --version)"

if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose no está instalado"
  exit 1
fi
echo "✓ Docker Compose $(docker-compose --version)"

# Crear archivo .env si no existe
echo ""
echo "⚙️  Configurando variables de entorno..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  echo "✓ Archivo .env creado"
else
  echo "✓ Archivo .env ya existe"
fi

# Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
cd "$PROJECT_DIR"
npm install
echo "✓ Dependencias instaladas"

# Crear directorios necesarios
echo ""
echo "📂 Creando directorios de trabajo..."
mkdir -p /tmp/videomaker
echo "✓ Directorios creados"

# Iniciar servicios con Docker Compose
echo ""
echo "🐳 Iniciando servicios con Docker Compose..."
echo "   Esto puede tomar unos minutos en la primera ejecución..."
docker-compose up -d

# Esperar a que los servicios estén listos
echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar estado de los servicios
echo ""
echo "🔍 Verificando estado de los servicios..."

if docker-compose ps | grep -q "healthy\|Up"; then
  echo "✓ Servicios iniciados correctamente"
else
  echo "⚠️  Algunos servicios pueden no estar listos aún"
fi

# Mostrar información de acceso
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✓ Setup Completado                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Acceso a la aplicación:"
echo "   Frontend:  http://localhost:5173"
echo "   API:       http://localhost:3000"
echo "   MinIO:     http://localhost:9001"
echo ""
echo "🔐 Credenciales MinIO:"
echo "   Usuario:   minioadmin"
echo "   Contraseña: minioadmin"
echo ""
echo "📊 Servicios activos:"
docker-compose ps
echo ""
echo "💡 Próximos pasos:"
echo "   1. Abre http://localhost:5173 en tu navegador"
echo "   2. Crea un bucket 'videomaker' en MinIO (http://localhost:9001)"
echo "   3. Sube archivos de audio e imágenes"
echo "   4. Haz clic en 'Crear Video'"
echo ""
echo "📖 Para ver logs:"
echo "   docker-compose logs -f api      # Logs del API"
echo "   docker-compose logs -f worker   # Logs del Worker"
echo ""
echo "🛑 Para detener los servicios:"
echo "   docker-compose down"
echo ""

