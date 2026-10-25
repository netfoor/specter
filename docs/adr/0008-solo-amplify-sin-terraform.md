# ADR-0008: Solo Amplify, sin Terraform

- **Estado:** aceptada
- **Fecha:** 2026-10-24
- **Reemplaza:** la parte de Terraform de [ADR-0001](0001-amplify-gen2-y-terraform.md)

## Contexto

ADR-0001 repartía la infraestructura entre Amplify Gen 2 (aplicación) y Terraform (app de Amplify, dominio, DNS en Cloudflare, presupuesto). Al preparar el despliegue, lo único que Terraform automatizaba de verdad eran dos registros CNAME en Cloudflare; a cambio, el proyecto tendría dos herramientas, dos estados y la importación de una app creada desde la consola.

## Decisión

- **Amplify Gen 2** define todo el backend de la aplicación en `amplify/` y se despliega con `amplify.yml` en cada push a `main`.
- **Amplify Hosting** se conecta al repositorio y asocia `specter.foor.dev` desde su consola. Los registros que muestra (validación del certificado y CNAME del subdominio) se crean en Cloudflare **sin proxy**.
- El presupuesto de AWS ya existe en la cuenta y no forma parte del proyecto.
- No hay Terraform en el repositorio.

## Consecuencias

- Una sola herramienta que administrar.
- La conexión del repositorio, el dominio y los dos registros DNS son pasos manuales; quedan documentados aquí y en `README.md`. Si cambian, se actualiza este documento.
- El token de Cloudflare ya no es necesario para el proyecto.
