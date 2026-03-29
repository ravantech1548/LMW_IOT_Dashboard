#!/bin/bash

# Configuration
DOCKER_USERNAME="ravantech159"
BACKEND_IMAGE="lmw_iot_backend"
FRONTEND_IMAGE="lmw_iot-frontend"
POSTGRES_IMAGE="lmw_iot-postgres"
MOSQUITTO_IMAGE="lmw_iot-mosquitto"
TAG="latest"

echo "================================================="
echo "Building and Pushing Multi-Architecture Images"
echo "Target Architectures: linux/amd64, linux/arm64"
echo "================================================="

# Ensure docker is logged in 
echo "Checking Docker login..."
docker info | grep "Username:" || (echo "Please run 'docker login' first." && exit 1)

# Step 1: Create a buildx builder instance if it doesn't exist
echo -e "\n[1/4] Setting up docker buildx..."
docker buildx create --name multiarch-builder --use || echo "Buildx builder already exists or failed to create. Ensure 'multiarch-builder' is active."
docker buildx inspect --bootstrap

# Step 2: Build and Push Backend
echo -e "\n[2/4] Building and Pushing Backend for AMD64 and ARM64..."
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ${DOCKER_USERNAME}/${BACKEND_IMAGE}:${TAG} \
  --push .
cd ..

# Step 3: Build and Push Frontend
echo -e "\n[3/4] Building and Pushing Frontend for AMD64 and ARM64..."
cd frontend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg REACT_APP_API_URL=/api \
  --build-arg REACT_APP_WS_URL=/ \
  --tag ${DOCKER_USERNAME}/${FRONTEND_IMAGE}:${TAG} \
  --push .
cd ..

# Step 4: Retag and Push Official Multi-arch Databases
echo -e "\n[4/4] Creating and Pushing Postgres and Mosquitto Multi-Arch Manifests..."
# Using dockers imagetools to natively copy the multiarch manifests of the official images to your own repo tags
docker buildx imagetools create -t ${DOCKER_USERNAME}/${POSTGRES_IMAGE}:${TAG} postgres:15-alpine
docker buildx imagetools create -t ${DOCKER_USERNAME}/${MOSQUITTO_IMAGE}:${TAG} eclipse-mosquitto:latest

echo -e "\n================================================="
echo "✅ SUCCESS! Multi-architecture images pushed to Docker Hub."
echo "Backend:   ${DOCKER_USERNAME}/${BACKEND_IMAGE}:${TAG}"
echo "Frontend:  ${DOCKER_USERNAME}/${FRONTEND_IMAGE}:${TAG}"
echo "Postgres:  ${DOCKER_USERNAME}/${POSTGRES_IMAGE}:${TAG}"
echo "Mosquitto: ${DOCKER_USERNAME}/${MOSQUITTO_IMAGE}:${TAG}"
echo "================================================="
echo "To deploy on target device (ARM or Intel):"
echo "1. Copy docker-compose.yml to the target device"
echo "2. Run: docker-compose pull"
echo "3. Run: docker-compose up -d"
