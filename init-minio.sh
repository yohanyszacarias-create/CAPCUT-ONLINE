#!/bin/bash

# Script para inicializar MinIO con bucket videomaker

set -e

MINIO_ENDPOINT=${MINIO_ENDPOINT:-"http://localhost:9000"}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-"minioadmin"}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-"minioadmin"}
BUCKET_NAME=${BUCKET_NAME:-"videomaker"}

echo "Inicializando MinIO..."
echo "Endpoint: $MINIO_ENDPOINT"
echo "Bucket: $BUCKET_NAME"

# Esperar a que MinIO esté listo
echo "Esperando a que MinIO esté disponible..."
for i in {1..30}; do
  if curl -f "$MINIO_ENDPOINT/minio/health/live" > /dev/null 2>&1; then
    echo "MinIO está disponible"
    break
  fi
  echo "Intento $i/30..."
  sleep 2
done

# Configurar cliente de MinIO
export AWS_ACCESS_KEY_ID=$MINIO_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=$MINIO_SECRET_KEY
export AWS_DEFAULT_REGION=us-east-1

# Crear bucket si no existe
echo "Creando bucket $BUCKET_NAME..."
aws s3 mb "s3://$BUCKET_NAME" \
  --endpoint-url "$MINIO_ENDPOINT" \
  --region us-east-1 \
  || echo "Bucket ya existe o error al crear"

# Crear directorios de estructura
echo "Creando estructura de directorios..."
aws s3api put-object \
  --bucket "$BUCKET_NAME" \
  --key "jobs/" \
  --endpoint-url "$MINIO_ENDPOINT" \
  || true

echo "✓ MinIO inicializado correctamente"
echo "Acceso a MinIO Console: http://localhost:9001"
echo "Usuario: $MINIO_ACCESS_KEY"
echo "Contraseña: $MINIO_SECRET_KEY"

