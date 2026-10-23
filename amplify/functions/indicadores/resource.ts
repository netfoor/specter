import { defineFunction } from '@aws-amplify/backend'

// En el grupo `data` para poder recibir permisos sobre sus tablas sin dependencias circulares.
export const indicadores = defineFunction({
  name: 'indicadores',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
})
