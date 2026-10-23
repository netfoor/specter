import { defineFunction } from '@aws-amplify/backend'

// En el grupo `data` para poder recibir permisos sobre la tabla de uso sin dependencias circulares.
export const nia = defineFunction({
  name: 'nia-chat',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
})
