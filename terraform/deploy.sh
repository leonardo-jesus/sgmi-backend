#!/bin/bash

# SGMI Terraform Deployment Script
# This script automates the deployment process for the SGMI infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    print_error "Terraform is not installed. Please install Terraform first."
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install AWS CLI first."
    exit 1
fi

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    print_error "terraform.tfvars file not found."
    print_status "Please copy terraform.tfvars.example to terraform.tfvars and configure it."
    cp terraform.tfvars.example terraform.tfvars
    print_status "Created terraform.tfvars from example. Please edit it with your values."
    exit 1
fi

# Check if SSH key exists
SSH_KEY_PATH="../sgmi-backend-key"
if [ ! -f "$SSH_KEY_PATH" ]; then
    print_warning "SSH key not found at $SSH_KEY_PATH"
    print_status "Generating SSH key pair..."
    ssh-keygen -t rsa -b 2048 -f "$SSH_KEY_PATH" -N ""
    print_success "SSH key pair generated: $SSH_KEY_PATH and $SSH_KEY_PATH.pub"

    # Update terraform.tfvars with the public key
    PUBLIC_KEY=$(cat "$SSH_KEY_PATH.pub")
    sed -i.bak "s|public_key = \".*\"|public_key = \"$PUBLIC_KEY\"|" terraform.tfvars
    print_success "Updated terraform.tfvars with generated public key"
fi

print_status "Starting Terraform deployment..."

# Initialize Terraform
print_status "Initializing Terraform..."
terraform init

# Validate configuration
print_status "Validating Terraform configuration..."
terraform validate

# Plan deployment
print_status "Creating deployment plan..."
terraform plan -out=tfplan

# Ask for confirmation
echo ""
print_warning "This will create AWS resources that may incur costs."
read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Deployment cancelled."
    rm -f tfplan
    exit 0
fi

# Apply deployment
print_status "Applying Terraform configuration..."
terraform apply tfplan

# Clean up plan file
rm -f tfplan

print_success "Infrastructure deployment completed!"

# Display outputs
echo ""
print_status "=== Deployment Information ==="
terraform output -json | jq -r '
    "Instance Public IP: " + .instance_public_ip.value,
    "Backend URL: " + .backend_url.value,
    "SGMI Frontend URL: " + .sgmi_frontend_url.value,
    "SGMI-PADARIA URL: " + .sgmi_padaria_url.value,
    "SSH Command: " + .ssh_command.value
'

echo ""
print_warning "=== Next Steps ==="
echo "1. Wait 5-10 minutes for the instance to fully initialize and clone repositories"
echo "2. Applications will start automatically after initialization completes"
echo "3. Monitor progress with CloudWatch logs or SSH to the instance"
echo ""
print_status "Detailed instructions available in README.md"

# Save instance IP for convenience
INSTANCE_IP=$(terraform output -raw instance_public_ip)
echo "$INSTANCE_IP" > .instance_ip

print_status "Instance IP saved to .instance_ip file"
print_success "Deployment completed successfully!"