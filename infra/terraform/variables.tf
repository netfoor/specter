variable "region" {
  type    = string
  default = "us-east-1"
}

variable "amplify_app_id" {
  description = "ID de la app de Amplify Hosting, creada al conectar el repositorio."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Zona de foor.dev en Cloudflare."
  type        = string
}

variable "dominio" {
  type    = string
  default = "foor.dev"
}

variable "subdominio" {
  type    = string
  default = "specter"
}

variable "rama" {
  type    = string
  default = "main"
}
