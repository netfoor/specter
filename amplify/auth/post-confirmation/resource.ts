import { defineFunction } from '@aws-amplify/backend'

export const postConfirmation = defineFunction({
  name: 'post-confirmacion',
  resourceGroupName: 'auth',
})
