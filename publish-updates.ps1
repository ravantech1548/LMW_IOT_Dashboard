# publish-updates.ps1
Write-Host "Setting up Docker Buildx..."
docker buildx create --use --name iot-builder
docker buildx inspect --bootstrap

Write-Host "Building and Pushing Backend Image (amd64 & arm64)..."
docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t ravantech159/iot-backend_v1:latest ./backend --push

Write-Host "Building and Pushing Frontend Image (amd64 & arm64)..."
docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t ravantech159/iot-frontend_v1:latest --build-arg REACT_APP_API_URL=/api --build-arg REACT_APP_WS_URL=/ ./frontend --push

Write-Host "Done! Multi-platform images pushed."
Write-Host "Run the following command on your server to update:"
Write-Host "docker-compose pull && docker-compose up -d"
