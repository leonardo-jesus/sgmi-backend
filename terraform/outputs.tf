# Outputs for SGMI Terraform configuration

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.sgmi_eip.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.sgmi_server.public_dns
}

output "backend_url" {
  description = "URL for the backend API"
  value       = "http://${aws_eip.sgmi_eip.public_ip}:4000"
}

output "sgmi_frontend_url" {
  description = "URL for the SGMI frontend"
  value       = "http://${aws_eip.sgmi_eip.public_ip}:3000"
}

output "sgmi_padaria_url" {
  description = "URL for the SGMI-PADARIA frontend"
  value       = "http://${aws_eip.sgmi_eip.public_ip}:3001"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i sgmi-backend-key.pem ec2-user@${aws_eip.sgmi_eip.public_ip}"
}

output "cloudwatch_log_groups" {
  description = "CloudWatch log groups created"
  value = {
    backend = aws_cloudwatch_log_group.sgmi_backend_logs.name
    frontend = aws_cloudwatch_log_group.sgmi_frontend_logs.name
    padaria = aws_cloudwatch_log_group.sgmi_padaria_logs.name
  }
}