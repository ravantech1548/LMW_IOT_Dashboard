@echo off
set /p DOCKER_USERNAME="Enter your Docker Hub username: "

echo Building images...
docker-compose build

echo Tagging images...
docker tag iot-backend %DOCKER_USERNAME%/iot-backend:latest
docker tag iot-frontend %DOCKER_USERNAME%/iot-frontend:latest

echo Pushing images to Docker Hub...
docker push %DOCKER_USERNAME%/iot-backend:latest
docker push %DOCKER_USERNAME%/iot-frontend:latest

echo Done!
pause
