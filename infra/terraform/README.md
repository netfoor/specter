# Infraestructura de Specter

El backend de la aplicación (Cognito, datos, funciones y almacenamiento) lo define Amplify Gen 2 en `amplify/` y se despliega con `amplify.yml` en cada push a `main`. Este directorio administra lo que queda fuera de Amplify Gen 2:

- Reglas de reescritura de la SPA en la app de Amplify Hosting.
- Asociación del dominio `specter.foor.dev`.
- Registros DNS en Cloudflare: validación del certificado y CNAME del subdominio, sin proxy.

El presupuesto de AWS ya existe en la cuenta y no se administra aquí.

## Orden de aplicación

1. **Bucket del estado** (una sola vez, estado local ignorado por git):

   ```bash
   cd infra/terraform/estado
   terraform init
   terraform apply -var bucket=<nombre-del-bucket>
   ```

2. **Conectar el repositorio** en Amplify Hosting (rama `main`). La app toma `amplify.yml` del repositorio. Anota el ID de la app.

3. **Configurar** `backend.hcl` y `terraform.tfvars` a partir de los `.example` (ambos ignorados por git) y exportar `CLOUDFLARE_API_TOKEN` desde `.env`.

4. **Importar la app y aplicar:**

   ```bash
   cd infra/terraform
   terraform init -backend-config=backend.hcl
   terraform import aws_amplify_app.specter <id-de-la-app>
   terraform plan
   terraform apply
   ```

5. Comprobar con `curl -I https://specter.foor.dev` cuando el certificado termine de validarse (puede tardar varios minutos).
