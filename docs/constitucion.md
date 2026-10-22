# Constitución del proyecto

Principios que guían todas las decisiones de Specter. Si una tarea entra en conflicto con alguno, se discute antes de implementarla.

## Producto

1. **El abogado ejerce, Specter facilita.** Ninguna función, incluida NIA, presta asesoría jurídica ni sustituye el criterio profesional.
2. **No se simula lo que no existe.** Una capacidad no implementada se muestra como "Próximamente". Nunca se presentan como reales controles, verificaciones, pagos o validez jurídica que no existen.
3. **Transparencia financiera.** Todo monto se presenta con su desglose: honorarios, comisión de Specter y lo que recibe el abogado.
4. **Información pública ≠ información privada.** El perfil profesional del abogado puede ser público; los datos del cliente y del expediente nunca lo son.

## Seguridad y datos

5. **Mínimo privilegio.** Cada usuario accede solo a la información que necesita y para la que tiene autorización (contexto, sec. XVIII).
6. **Las reglas de negocio se aplican en el servidor.** El cliente web nunca decide estados, montos ni permisos.
7. **Sin secretos en el repositorio.** El repositorio es público. Llaves y tokens viven solo en `.env` o en almacenes de secretos.
8. **Datos de demostración** mientras no existan aviso de privacidad integral, verificación de identidad y firma con validez jurídica.

## Ingeniería

9. **Infraestructura como código.** Nada se crea a mano en consolas: Amplify Gen 2 para la aplicación y Terraform para la plataforma.
10. **Monolito modular** mientras el dominio no justifique otra cosa. Los módulos siguen los contextos del dominio.
11. **Cambios pequeños y trazables.** Rama por tarea, PR con checks verdes y commits convencionales en español.
12. **Lógica de dominio pura y probada.** Desglose, matching y máquina de estados viven en `shared/domain/` con pruebas unitarias.
13. **Lo visible primero.** Cada jornada termina con un despliegue revisable en `specter.foor.dev`.
