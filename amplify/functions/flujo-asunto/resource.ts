import { defineFunction } from '@aws-amplify/backend'

// En el grupo `data` para poder recibir permisos sobre sus tablas sin dependencias circulares.
export const flujoAsunto = defineFunction({
  name: 'flujo-asunto',
  resourceGroupName: 'data',
  timeoutSeconds: 15,
})
