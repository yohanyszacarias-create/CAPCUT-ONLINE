#!/bin/bash

# Script para limpiar y resetear VideoMakerOnline

set -e

echo \"╔════════════════════════════════════════════════════════════╗\"
echo \"║         VideoMakerOnline - Cleanup Script                  ║\"
echo \"╚════════════════════════════════════════════════════════════╝\"

SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"
PROJECT_DIR=\"$(dirname \"$SCRIPT_DIR\")\"

echo \"\"
echo \"🧹 Limpiando VideoMakerOnline...\"

# Detener contenedores
echo \"\"
echo \"🛑 Deteniendo contenedores Docker...\"
cd \"$PROJECT_DIR\"
docker-compose down -v || true
echo \"✓ Contenedores detenidos\"

# Limpiar directorios de trabajo
echo \"\"
echo \"📂 Limpiando directorios de trabajo...\"
rm -rf /tmp/videomaker/*
echo \"✓ Directorios de trabajo limpios\"

# Limpiar node_modules (opcional)
read -p \"¿Deseas eliminar node_modules? (s/n): \" -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  echo \"Eliminando node_modules...\"
  find \"$PROJECT_DIR\" -name \"node_modules\" -type d -exec rm -rf {} + 2>/dev/null || true
  echo \"✓ node_modules eliminados\"
fi

# Limpiar imágenes Docker (opcional)
read -p \"¿Deseas eliminar imágenes Docker del proyecto? (s/n): \" -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  echo \"Eliminando imágenes Docker...\"
  docker rmi videomaker-online-api videomaker-online-worker 2>/dev/null || true
  echo \"✓ Imágenes Docker eliminadas\"
fi

echo \"\"
echo \"╔════════════════════════════════════════════════════════════╗\"
echo \"║              ✓ Cleanup Completado                          ║\"
echo \"╚════════════════════════════════════════════════════════════╝\"
echo \"\"
echo \"Para reiniciar, ejecuta: bash scripts/setup.sh\"
echo \"\"

