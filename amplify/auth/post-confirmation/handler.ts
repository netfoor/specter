import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'
import type { PostConfirmationTriggerHandler } from 'aws-lambda'
import { rolDeRegistro } from '../../../shared/domain/roles'

const cognito = new CognitoIdentityProviderClient()

export const handler: PostConfirmationTriggerHandler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') return event

  const rol = rolDeRegistro(event.request.userAttributes['custom:rol'])
  if (!rol) {
    console.warn('Registro confirmado sin un rol válido; no se asignó grupo.')
    return event
  }

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: rol,
    }),
  )
  return event
}
