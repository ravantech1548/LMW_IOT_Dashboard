# Docker Deployment Guide

This guide provides step-by-step instructions for building, running, and deploying the Voltas IOT Dashboard using Docker.

## 1. Prerequisites

- **Docker Desktop** (for Windows/Mac) or **Docker Engine** (for Linux) installed.
- **Docker Compose** installed (usually included with Docker Desktop).
- A **Docker Hub** account (if deploying to a remote server).

## 2. Database Initialization
The Docker setup (via `backend/start.sh`) automatically runs `npm run init-db` and `npm run create-admin` on startup.

**Under the hood:**
These scripts execute the logic defined in `database_init.sql` (conceptually), ensuring:
1.  **Table Creation**: `sensors`, `users`, `shifts`, `system_settings`, etc.
2.  **Migrations**: `alter table` statements to keep schema up to date.
3.  **Default Data**: Admin user (`admin`/`admin123`) and system settings.

You do **not** need to run `database_init.sql` manually for Docker setups.

## 3. Local Development & Testing

### Building and Running
To spin up the entire application stack (Database, MQTT Broker, Backend, Frontend) locally:

1.  Open a terminal in the project root directory.
2.  Run the following command:
    ```bash
    docker-compose up --build -d
    ```
    - `--build`: Forces a rebuild of the images.
    - `-d`: Detached mode (runs in background).

### Verifying the Deployment
1.  **Frontend**: Open your browser and go to `http://localhost`.
    - You should see the Login page.
2.  **Backend**: Check API availability at `http://localhost:5000`.
3.  **Logs**: To view logs for all services:
    ```bash
    docker-compose logs -f
    ```
    To view logs for a specific service (e.g., backend):
    ```bash
    docker-compose logs -f backend
    ```

### Stopping the Services
To stop the application:
```bash
docker-compose down
```
To stop and remove volumes (WARNING: deletes database data):
```bash
docker-compose down -v
```

## 3. Building and Pushing to Docker Hub

If you want to deploy to a remote server, you need to push your images to a registry like Docker Hub.

### Step 1: Login to Docker Hub
```powershell
docker login
```

### Step 2: Build the Images
If you haven't already:
```powershell
docker-compose build
```

### Step 3: Tag the Images
Docker Compose typically names images as `projectname-servicename`. You must duplicate these with your Docker Hub username.

**Check your local image names:**
```powershell
docker images
```

**Run the tag commands (Replace `ravantech159` with your username):**
```powershell
# Tag Backend
docker tag voltas_iot_dashboard-main-backend ravantech159/iot-backend:latest

# Tag Frontend
docker tag voltas_iot_dashboard-main-frontend ravantech159/iot-frontend:latest
```
*(Note: If `voltas_iot_dashboard-main-backend` doesn't exist, try `voltas_iot_dashboard-main_backend` with an underscore)*

### Step 4: Push to Docker Hub
```powershell
docker push ravantech159/iot-backend:latest
docker push ravantech159/iot-frontend:latest
```

---

## 4. Deploying to an Ubuntu Server (ARM Processor)

These steps work for standard Ubuntu servers and ARM-based devices (like Raspberry Pi or AWS Graviton).

### A. Pre-requisites on the Server
1.  **Install Docker & Docker Compose:**
    ```bash
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose
    ```
2.  **Ensure User Permissions:**
    ```bash
    sudo usermod -aG docker $USER
    # You may need to logout and login again
    ```

### B. Setup the Application
1.  **Create a folder:**
    ```bash
    mkdir iot-dashboard
    cd iot-dashboard
    ```


2.  **Create `docker-compose.yml`:**
    
    You need to copy the content of the **Production Docker Compose** file to your server. 
    
    **Option A: Copy file manually**
    Copy the `docker-compose.prod.yml` content from your local machine and paste it into a file named `docker-compose.yml` on the server.

    **Option B: Copy-Paste Content**
    Run `nano docker-compose.yml` on the server and paste the following content (which uses the pre-built images):

    ```yaml
    version: '3.8'

    services:
      postgres:
        image: postgres:15-alpine
        container_name: iot-postgres
        restart: always
        environment:
          POSTGRES_DB: iot_dashboard
          POSTGRES_USER: iotuser
          POSTGRES_PASSWORD: iotpassword
          TZ: Asia/Singapore
        ports:
          - "5432:5432"
        volumes:
          - postgres_data:/var/lib/postgresql/data
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U iotuser -d iot_dashboard"]
          interval: 10s
          timeout: 5s
          retries: 5
        command: ["postgres", "-c", "timezone=Asia/Singapore"]
        networks:
          - iot-network

      mosquitto:
        image: eclipse-mosquitto:latest
        container_name: iot-mosquitto
        restart: always
        ports:
          - "1883:1883"
          - "9001:9001"
        volumes:
          - mosquitto_data:/mosquitto/data
        networks:
          - iot-network

      backend:
        image: ravantech159/iot-backend:latest
        container_name: iot-backend
        restart: always
        ports:
          - "5000:5000"
        environment:
          DATABASE_URL: postgresql://iotuser:iotpassword@postgres:5432/iot_dashboard
          MQTT_BROKER_URL: mqtts://9213530428624354bfc54e44a2a16413.s1.eu.hivemq.cloud:8883
          MQTT_USERNAME: iot-sense
          MQTT_PASSWORD: 'Tech2026*'
          MQTT_TOPIC: voltas
          JWT_SECRET: your-super-secret-jwt-key-change-in-production
          JWT_EXPIRES_IN: 7d
          NODE_ENV: production
          DB_SSL: 'false'
          TZ: Asia/Singapore
        depends_on:
          postgres:
            condition: service_healthy
          mosquitto:
            condition: service_started
        networks:
          - iot-network

      frontend:
        image: ravantech159/iot-frontend:latest
        container_name: iot-frontend
        restart: always
        ports:
          - "80:80"
        depends_on:
          - backend
        networks:
          - iot-network

    volumes:
      postgres_data:
      mosquitto_data:

    networks:
      iot-network:
        driver: bridge
    ```

3.  **Deploy:**
    ```bash
    sudo docker-compose up -d
    ```

### C. ARM Architecture Note
If you built the images on Windows (x64), they are likely `linux/amd64` architecture.
- **Newer ARM devices (like Raspberry Pi 5 or AWS Graviton 3):** Docker can often run x64 images using emulation, but it might be slower.
- **If it fails:** You need to build multi-architecture images from your Windows machine using `docker buildx`.

**To build specifically for ARM from Windows:**
```powershell
# Create a builder instance
docker buildx create --use

# Build and push directly for both AMD64 and ARM64
docker buildx build --platform linux/amd64,linux/arm64 -t ravantech159/iot-backend:latest ./backend --push
docker buildx build --platform linux/amd64,linux/arm64 -t ravantech159/iot-frontend:latest --build-arg REACT_APP_API_URL=/api --build-arg REACT_APP_WS_URL=/ ./frontend --push
```

## 5. Troubleshooting

- **Container keeps exiting**: Check logs using `docker-compose logs <service_name>`.
- **Database connection failed**: Ensure the `postgres` container is healthy (`docker-compose ps`).
- **MQTT connection failed**: Ensure port 1883 is open and not blocked by firewalls.
- **Frontend 404s**: Ensure Nginx is configured correctly to handle React Router (handled by `nginx.conf`).

## 6. Database Maintenance & Troubleshooting

### Running SQL Queries
To execute SQL commands directly inside the running database container:

**1. Open Interactive SQL Shell:**
```powershell
docker exec -it iot-postgres psql -U iotuser -d iot_dashboard
```
(Type `\q` to exit)

**2. Run Single Command:**
```powershell
docker exec -it iot-postgres psql -U iotuser -d iot_dashboard -c "SELECT NOW();"
```

### Common Maintenance Tasks

**Check Database Timezone:**
Ensure the database logic aligns with your local time (affected by `docker-compose.yml` configuration).
```powershell
docker exec -it iot-postgres psql -U iotuser -d iot_dashboard -c "SHOW TIMEZONE; SELECT NOW();"
```

**Clear All Sensor Data:**
⚠️ **monitoring** data deletion. This command removes all records from the `sensor_data` table.
```powershell
docker exec -it iot-postgres psql -U iotuser -d iot_dashboard -c "TRUNCATE TABLE sensor_data;"
```

**Reset Database (Destructive):**
If you need to completely reset the database (delete all data including users/settings), stop containers and remove the volume:
```powershell

## 7. Production Deployment with Nginx & SSL

**Important**: You do **NOT** need to rebuild your Docker images for this step (assuming you built them with `REACT_APP_API_URL=/api` as shown above).

We will run Nginx on the **host machine** (Ubuntu) to handle SSL (HTTPS) and forward traffic to your Docker container.

### Step 1: Verify Port Configuration
I have already updated the `docker-compose.yml` and `docker-compose.prod.yml` files in this repository to expose the frontend on port **8080**.

1.  **Verify** your `docker-compose.yml` on the server has the following port configuration for the `frontend` service:
    ```yaml
    frontend:
      # ... other settings ...
      ports:
        - "8080:80"
    ```
    *(If it still says "80:80", please update it to "8080:80")*

2.  Restart the containers to apply the change:
    ```bash
    docker-compose down
    docker-compose up -d
    ```
    *Now your app is available at `http://your-server-ip:8080` (HTTP only).*

### Step 2: Install Nginx & Certbot on Host
Run these commands on your Ubuntu server:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 3: Configure Nginx
Create a configuration file for your domain.

1.  Create the file (replace `yourdomain.com` with your actual domain):
    ```bash
    sudo nano /etc/nginx/sites-available/yourdomain.com
    ```

2.  Paste the following configuration:
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        # Proxy for the Frontend (and API via internal proxy)
        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            
            # Forward real IP to Docker
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
    *Note: We assume `localhost:8080` is where your Docker frontend is running.*

3.  Enable the configuration:
    ```bash
    sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
    sudo nginx -t  # Test for syntax errors
    sudo systemctl restart nginx
    ```

### Step 4: Enable SSL (HTTPS)
Use Certbot to automatically fetch and configure the SSL certificate.

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

- Follow the prompts (enter email for renewal notices).
- When asked about redirecting HTTP traffic to HTTPS, choose **Redirect (2)**.

### Step 5: Verification
1.  Open `https://yourdomain.com` in your browser.
2.  Ensure the lock icon appears (SSL Secure).
3.  Try logging in and checking real-time data to verify Websockets (WSS) are passing through correctly.

