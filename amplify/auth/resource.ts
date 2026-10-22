import { defineAuth } from '@aws-amplify/backend'
import { postConfirmation } from './post-confirmation/resource'

export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    fullname: { required: true, mutable: true },
    'custom:rol': { dataType: 'String', mutable: false },
  },
  groups: ['CLIENTE', 'ABOGADO', 'ADMIN'],
  multifactor: { mode: 'OPTIONAL', totp: true, sms: false },
  triggers: { postConfirmation },
  access: (allow) => [allow.resource(postConfirmation).to(['addUserToGroup'])],
})
