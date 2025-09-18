# SGMI AWS Infrastructure with Terraform

This Terraform configuration deploys a complete AWS infrastructure for the SGMI application suite on a single EC2 instance, including:

- **sgmi-backend**: Node.js API with PostgreSQL database (Docker Compose)
- **SGMI**: React frontend for production management
- **SGMI-PADARIA**: React frontend for bakery management

## Architecture Overview

### AWS Resources Created
- **VPC** with public subnet and Internet Gateway
- **EC2 Instance** (t3.small) with Elastic IP
- **Security Groups** with ports for SSH (22), Backend API (4000), SGMI (3000), and SGMI-PADARIA (3001)
- **CloudWatch Log Groups** for centralized logging
- **IAM Role and Policies** for CloudWatch access

### Application Ports
- **4000**: Backend API (Docker Compose with PostgreSQL)
- **3000**: SGMI Frontend (served with npm start after build)
- **3001**: SGMI-PADARIA Frontend (served with npm start after build)
- **5432**: PostgreSQL (internal Docker network only)

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Terraform installed** (version >= 1.0)
3. **SSH key pair generated** for EC2 access

### Generate SSH Key Pair
```bash
ssh-keygen -t rsa -b 2048 -f sgmi-backend-key
# This creates sgmi-backend-key (private) and sgmi-backend-key.pub (public)
```

## Deployment Steps

### 1. Configure Variables
```bash
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Required variables:
- `public_key`: Content of your SSH public key file
- `aws_region`: AWS region for deployment
- `instance_type`: EC2 instance type (default: t3.small)

### 2. Initialize and Deploy
```bash
# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Deploy infrastructure
terraform apply
```

### 3. Automatic Setup

The deployment is fully automated! After Terraform completes:

1. **Wait 5-10 minutes** for the instance to:
   - Install all dependencies (Docker, Node.js, CloudWatch Agent)
   - Clone the repositories from GitHub
   - Build and start all applications automatically

2. **Monitor progress** via:
   - CloudWatch logs in AWS Console
   - SSH to instance: `ssh -i sgmi-backend-key ec2-user@INSTANCE_IP`
   - Check logs: `sudo tail -f /var/log/user-data.log`

### 4. Verify Deployment
After the initialization completes, access your applications:
```bash
# Get URLs from Terraform output
terraform output backend_url
terraform output sgmi_frontend_url
terraform output sgmi_padaria_url
```

## CloudWatch Logging

All application logs are automatically forwarded to CloudWatch:

- **Backend logs**: `/aws/ec2/sgmi-backend`
- **SGMI Frontend logs**: `/aws/ec2/sgmi-frontend`
- **SGMI-PADARIA logs**: `/aws/ec2/sgmi-padaria`

## Security Configuration

### Inbound Rules
| Port | Protocol | Source | Purpose |
|------|----------|---------|---------|
| 22 | TCP | 0.0.0.0/0 | SSH access |
| 4000 | TCP | 0.0.0.0/0 | Backend API |
| 3000 | TCP | 0.0.0.0/0 | SGMI Frontend |
| 3001 | TCP | 0.0.0.0/0 | SGMI-PADARIA Frontend |
| 5432 | TCP | VPC only | PostgreSQL (internal) |

### Production Security Recommendations
1. **Restrict SSH access** to your IP: Change `0.0.0.0/0` to `YOUR_IP/32`
2. **Use Application Load Balancer** for HTTPS termination
3. **Enable VPC Flow Logs** for network monitoring
4. **Implement WAF** for web application protection
5. **Use Secrets Manager** for sensitive configuration

## Monitoring and Maintenance

### Health Checks
```bash
# SSH to instance
ssh -i sgmi-backend-key ec2-user@$INSTANCE_IP

# Check Docker services
sudo docker ps
sudo docker-compose -f /opt/sgmi/sgmi-backend/docker-compose.yml logs

# Check frontend processes
ps aux | grep serve

# Check logs
tail -f /var/log/sgmi-*.log
```

### Update Applications
```bash
# SSH to the instance
ssh -i sgmi-backend-key ec2-user@INSTANCE_IP

# Update repositories
cd /opt/sgmi/sgmi-backend && sudo git pull
cd /opt/sgmi/SGMI && sudo git pull && sudo npm run build
cd /opt/sgmi/SGMI-PADARIA && sudo git pull && sudo npm run build

# Restart services
sudo systemctl restart sgmi.service
```

## Troubleshooting

### Common Issues

1. **Services not starting**: Check `/var/log/user-data.log` for initialization errors
2. **Port conflicts**: Ensure no other services are using ports 3000, 3001, 4000
3. **Database connection issues**: Verify Docker Compose is running: `sudo docker-compose ps`
4. **Frontend build errors**: Check Node.js version and dependencies

### Useful Commands
```bash
# Check system status
sudo systemctl status sgmi.service

# View real-time logs
sudo journalctl -u sgmi.service -f

# Restart all services
sudo systemctl restart sgmi.service

# Check CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a query-config -m ec2 -s
```

## Cost Optimization

- **Instance Type**: t3.small (~$30/month) is sufficient for development. Consider t3.large for production.
- **Storage**: Default 8GB should be adequate. Monitor usage with `df -h`.
- **Data Transfer**: Minimize outbound data transfer costs by using CloudFront for static assets.

## Cleanup

To destroy all resources:
```bash
terraform destroy
```

**Warning**: This will permanently delete all resources and data. Ensure you have backups if needed.

## Support

For issues or questions:
1. Check CloudWatch logs in AWS Console
2. Review `/opt/sgmi/DEPLOYMENT_INSTRUCTIONS.md` on the instance
3. Examine Terraform state: `terraform show`