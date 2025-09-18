#!/bin/bash

# SGMI EC2 Instance Initialization Script
# This script sets up and runs all three SGMI projects on a single EC2 instance

set -e

# Update system
dnf update -y

# Install Docker and Docker Compose
dnf install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js 20.x from NodeSource (required for Vite 7+)
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Install Git
dnf install -y git

# Install CloudWatch Agent
dnf install -y awscli wget
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Create CloudWatch Agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/sgmi-backend.log",
            "log_group_name": "${backend_log_group}",
            "log_stream_name": "sgmi-backend-stream",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/var/log/sgmi-frontend.log",
            "log_group_name": "${frontend_log_group}",
            "log_stream_name": "sgmi-frontend-stream",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/var/log/sgmi-padaria.log",
            "log_group_name": "${padaria_log_group}",
            "log_stream_name": "sgmi-padaria-stream",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch Agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

# Create application directory
mkdir -p /opt/sgmi
cd /opt/sgmi

# Clone repositories
echo "Cloning repositories..."
git clone https://github.com/jadmajzoub/SGMI.git
git clone https://github.com/jadmajzoub/SGMI-PADARIA.git
git clone https://github.com/leonardo-jesus/sgmi-backend

# Automatically run setup after cloning
cat > /opt/sgmi/setup-and-run.sh << 'SETUPEOF'
#!/bin/bash

# This script sets up and runs all SGMI applications
set -e

cd /opt/sgmi

# Function to log with timestamp
log_with_timestamp() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Setup and run sgmi-backend with Docker Compose
if [ -d "sgmi-backend" ]; then
    log_with_timestamp "Setting up sgmi-backend..."
    cd sgmi-backend

    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << 'ENVEOF'
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@db:5432/sgmi
JWT_SECRET=f8e58d21dce3902994a137065567c09c9f1de56976d791a85a41d7df7cf22665
JWT_REFRESH_SECRET=10506ad730443607e427b07125e24c531ec74d9d47913ef44ca9094fbe6ad92c
ENVEOF
    fi

    # Start backend services with Docker Compose
    log_with_timestamp "Starting backend services..."
    sudo docker-compose up -d

    # Monitor backend logs
    (sudo docker-compose logs -f 2>&1 | while read line; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $line" >> /var/log/sgmi-backend.log
    done) &

    cd ..
fi

# Setup and run SGMI frontend
if [ -d "SGMI" ]; then
    log_with_timestamp "Setting up SGMI frontend..."
    cd SGMI

    # Install dependencies
    npm install

    # Build for production
    npm run build

    # Start the frontend with npm start (production mode)
    log_with_timestamp "Starting SGMI frontend on port 3000..."
    (npm start 2>&1 | while read line; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $line" >> /var/log/sgmi-frontend.log
    done) &

    cd ..
fi

# Setup and run SGMI-PADARIA frontend
if [ -d "SGMI-PADARIA" ]; then
    log_with_timestamp "Setting up SGMI-PADARIA frontend..."
    cd SGMI-PADARIA

    # Install dependencies
    npm install

    # Build for production
    npm run build

    # Start the frontend with npm start (production mode)
    log_with_timestamp "Starting SGMI-PADARIA frontend on port 3001..."
    (npm start 2>&1 | while read line; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $line" >> /var/log/sgmi-padaria.log
    done) &

    cd ..
fi

log_with_timestamp "All services started successfully!"
log_with_timestamp "Backend API: http://localhost:4000"
log_with_timestamp "SGMI Frontend: http://localhost:3000"
log_with_timestamp "SGMI-PADARIA Frontend: http://localhost:3001"

# Wait for services to be ready
sleep 10

# Check if services are running
log_with_timestamp "Checking service health..."
if curl -f http://localhost:4000/health 2>/dev/null; then
    log_with_timestamp "Backend API is healthy"
else
    log_with_timestamp "Warning: Backend API health check failed"
fi

if curl -f http://localhost:3000 2>/dev/null; then
    log_with_timestamp "SGMI Frontend is accessible"
else
    log_with_timestamp "Warning: SGMI Frontend is not accessible"
fi

if curl -f http://localhost:3001 2>/dev/null; then
    log_with_timestamp "SGMI-PADARIA Frontend is accessible"
else
    log_with_timestamp "Warning: SGMI-PADARIA Frontend is not accessible"
fi

SETUPEOF

chmod +x /opt/sgmi/setup-and-run.sh

# Run the setup script automatically
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting automatic application setup..." >> /var/log/user-data.log
/opt/sgmi/setup-and-run.sh >> /var/log/user-data.log 2>&1 &

# Create systemd service for automatic startup
cat > /etc/systemd/system/sgmi.service << 'SERVICEEOF'
[Unit]
Description=SGMI Applications
After=network.target docker.service
Requires=docker.service

[Service]
Type=forking
User=root
WorkingDirectory=/opt/sgmi
ExecStart=/opt/sgmi/setup-and-run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Create log files with proper permissions
touch /var/log/sgmi-backend.log
touch /var/log/sgmi-frontend.log
touch /var/log/sgmi-padaria.log
chmod 644 /var/log/sgmi-*.log

# Create post-deployment instructions file
cat > /opt/sgmi/DEPLOYMENT_INSTRUCTIONS.md << 'INSTEOF'
# SGMI Deployment Instructions

## Current Status
This EC2 instance has been configured with all necessary dependencies:
- Docker and Docker Compose
- Node.js 20.x
- CloudWatch Agent for logging
- Application directory at /opt/sgmi

## Manual Steps Required

### 1. Upload Repository Files
You need to copy your repository files to the following directories:
- `/opt/sgmi/sgmi-backend/` - Backend code with docker-compose.yml
- `/opt/sgmi/SGMI/` - Frontend React application
- `/opt/sgmi/SGMI-PADARIA/` - Padaria React application

### 2. Start Services
After copying the files, run:
```bash
sudo /opt/sgmi/setup-and-run.sh
```

### 3. Enable Auto-start (Optional)
To start services automatically on boot:
```bash
sudo systemctl enable sgmi.service
sudo systemctl start sgmi.service
```

## Service URLs
- Backend API: http://YOUR_INSTANCE_IP:4000
- SGMI Frontend: http://YOUR_INSTANCE_IP:3000
- SGMI-PADARIA Frontend: http://YOUR_INSTANCE_IP:3001

## Monitoring
CloudWatch logs are configured for all services:
- Backend logs: ${backend_log_group}
- Frontend logs: ${frontend_log_group}
- Padaria logs: ${padaria_log_group}

## File Upload Methods

### Option 1: SCP (Secure Copy)
```bash
# Upload backend
scp -r -i your-key.pem ./sgmi-backend ec2-user@YOUR_IP:/tmp/
sudo mv /tmp/sgmi-backend/* /opt/sgmi/sgmi-backend/

# Upload SGMI
scp -r -i your-key.pem ./SGMI ec2-user@YOUR_IP:/tmp/
sudo mv /tmp/SGMI/* /opt/sgmi/SGMI/

# Upload SGMI-PADARIA
scp -r -i your-key.pem ./SGMI-PADARIA ec2-user@YOUR_IP:/tmp/
sudo mv /tmp/SGMI-PADARIA/* /opt/sgmi/SGMI-PADARIA/
```

### Option 2: Git Clone (Recommended for production)
```bash
cd /opt/sgmi
sudo git clone YOUR_BACKEND_REPO sgmi-backend
sudo git clone YOUR_SGMI_REPO SGMI
sudo git clone YOUR_PADARIA_REPO SGMI-PADARIA
```

### Option 3: File Transfer via AWS S3
```bash
# Upload to S3 first, then download on EC2
aws s3 cp sgmi-backend.tar.gz s3://your-bucket/
aws s3 cp SGMI.tar.gz s3://your-bucket/
aws s3 cp SGMI-PADARIA.tar.gz s3://your-bucket/

# On EC2:
cd /opt/sgmi
aws s3 cp s3://your-bucket/sgmi-backend.tar.gz ./
tar -xzf sgmi-backend.tar.gz
# Repeat for other projects
```

## Troubleshooting
- Check logs: `sudo journalctl -u sgmi.service -f`
- Check Docker: `sudo docker ps` and `sudo docker-compose logs`
- Check individual service logs in `/var/log/sgmi-*.log`
- CloudWatch logs available in AWS Console

INSTEOF

# Log completion
echo "$(date '+%Y-%m-%d %H:%M:%S') - EC2 instance initialization completed successfully!" >> /var/log/user-data.log
echo "$(date '+%Y-%m-%d %H:%M:%S') - Ready for application deployment. See /opt/sgmi/DEPLOYMENT_INSTRUCTIONS.md for next steps." >> /var/log/user-data.log