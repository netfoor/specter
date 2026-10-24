terraform {
  required_version = ">= 1.10"
  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 6.0" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 5.0" }
  }

  # Configuración parcial: bucket y llave en backend.hcl (ignorado por git).
  backend "s3" {
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = var.region
}

# Toma el token de la variable de entorno CLOUDFLARE_API_TOKEN.
provider "cloudflare" {}
