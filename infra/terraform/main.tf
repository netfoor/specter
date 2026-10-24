# La app se crea al conectar el repositorio en Amplify Hosting y se importa aquí
# (ver README.md). Terraform administra las reglas de la SPA, el dominio y el DNS.
resource "aws_amplify_app" "specter" {
  name = "specter"

  # React Router: toda ruta sin extensión de archivo sirve index.html.
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }

  # Lo que define la conexión con GitHub y amplify.yml no se administra aquí.
  lifecycle {
    ignore_changes = [
      repository,
      access_token,
      oauth_token,
      build_spec,
      environment_variables,
      iam_service_role_arn,
      platform,
      enable_branch_auto_build,
      auto_branch_creation_config,
      cache_config,
      tags,
    ]
  }
}

resource "aws_amplify_domain_association" "specter" {
  app_id                = aws_amplify_app.specter.id
  domain_name           = var.dominio
  wait_for_verification = false

  sub_domain {
    branch_name = var.rama
    prefix      = var.subdominio
  }
}

locals {
  # Formato de Amplify: "<nombre> CNAME <destino>"
  validacion = split(" ", aws_amplify_domain_association.specter.certificate_verification_dns_record)
  subdominio = split(" ", one(aws_amplify_domain_association.specter.sub_domain).dns_record)
}

# Sin proxy de Cloudflare: el proxy rompe la validación del certificado de ACM.
resource "cloudflare_dns_record" "validacion_certificado" {
  zone_id = var.cloudflare_zone_id
  name    = trimsuffix(local.validacion[0], ".")
  type    = "CNAME"
  content = trimsuffix(local.validacion[2], ".")
  ttl     = 1
  proxied = false
  comment = "Validación ACM de specter (Terraform)"
}

resource "cloudflare_dns_record" "specter" {
  zone_id = var.cloudflare_zone_id
  name    = "${var.subdominio}.${var.dominio}"
  type    = "CNAME"
  content = trimsuffix(local.subdominio[2], ".")
  ttl     = 1
  proxied = false
  comment = "Specter en Amplify Hosting (Terraform)"
}

output "url" {
  value = "https://${var.subdominio}.${var.dominio}"
}
