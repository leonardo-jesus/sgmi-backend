# Terraform configuration for SGMI infrastructure on AWS
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
}

# Data source for the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# Data source for current AWS caller identity
data "aws_caller_identity" "current" {}

# Create a VPC
resource "aws_vpc" "sgmi_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "sgmi-vpc"
  }
}

# Create an Internet Gateway
resource "aws_internet_gateway" "sgmi_igw" {
  vpc_id = aws_vpc.sgmi_vpc.id

  tags = {
    Name = "sgmi-igw"
  }
}

# Create a public subnet
resource "aws_subnet" "sgmi_public_subnet" {
  vpc_id                  = aws_vpc.sgmi_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "sgmi-public-subnet"
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Create a route table for public subnet
resource "aws_route_table" "sgmi_public_rt" {
  vpc_id = aws_vpc.sgmi_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sgmi_igw.id
  }

  tags = {
    Name = "sgmi-public-rt"
  }
}

# Associate the public subnet with the route table
resource "aws_route_table_association" "sgmi_public_rta" {
  subnet_id      = aws_subnet.sgmi_public_subnet.id
  route_table_id = aws_route_table.sgmi_public_rt.id
}

# Security Group for EC2 instance
resource "aws_security_group" "sgmi_sg" {
  name        = "sgmi-security-group"
  description = "Security group for SGMI EC2 instance"
  vpc_id      = aws_vpc.sgmi_vpc.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API (port 4000)
  ingress {
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SGMI Frontend (port 3000)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SGMI-PADARIA Frontend (port 3001)
  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL (internal only - for Docker Compose)
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sgmi-security-group"
  }
}

# IAM role for EC2 instance
resource "aws_iam_role" "sgmi_ec2_role" {
  name = "sgmi-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for CloudWatch logs
resource "aws_iam_policy" "sgmi_cloudwatch_policy" {
  name        = "sgmi-cloudwatch-policy"
  description = "Policy for SGMI EC2 to write to CloudWatch logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "sgmi_cloudwatch_attachment" {
  role       = aws_iam_role.sgmi_ec2_role.name
  policy_arn = aws_iam_policy.sgmi_cloudwatch_policy.arn
}

# EC2 instance profile
resource "aws_iam_instance_profile" "sgmi_profile" {
  name = "sgmi-instance-profile"
  role = aws_iam_role.sgmi_ec2_role.name
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "sgmi_backend_logs" {
  name              = "/aws/ec2/sgmi-backend"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "sgmi_frontend_logs" {
  name              = "/aws/ec2/sgmi-frontend"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "sgmi_padaria_logs" {
  name              = "/aws/ec2/sgmi-padaria"
  retention_in_days = 7
}

# Key Pair for EC2 instance
resource "aws_key_pair" "sgmi_key" {
  key_name   = "sgmi-key"
  public_key = var.public_key
}

# EC2 Instance
resource "aws_instance" "sgmi_server" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.sgmi_key.key_name
  vpc_security_group_ids = [aws_security_group.sgmi_sg.id]
  subnet_id              = aws_subnet.sgmi_public_subnet.id
  iam_instance_profile   = aws_iam_instance_profile.sgmi_profile.name

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    region               = var.aws_region
    backend_log_group    = aws_cloudwatch_log_group.sgmi_backend_logs.name
    frontend_log_group   = aws_cloudwatch_log_group.sgmi_frontend_logs.name
    padaria_log_group    = aws_cloudwatch_log_group.sgmi_padaria_logs.name
  }))

  tags = {
    Name = "sgmi-server"
  }

  # Wait for the instance to be ready before considering it complete
  depends_on = [
    aws_cloudwatch_log_group.sgmi_backend_logs,
    aws_cloudwatch_log_group.sgmi_frontend_logs,
    aws_cloudwatch_log_group.sgmi_padaria_logs
  ]
}

# Elastic IP for the instance
resource "aws_eip" "sgmi_eip" {
  instance = aws_instance.sgmi_server.id
  domain   = "vpc"

  tags = {
    Name = "sgmi-eip"
  }
}