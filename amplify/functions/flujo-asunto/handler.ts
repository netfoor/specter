import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda'
import { ErrorFlujo } from '../../../shared/domain/flujo'
import { Servicio, type Resultado, type Tablas } from './servicio'

const entorno = (nombre: string): string => {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`)
  return valor
}

const tablas: Tablas = {
  asunto: entorno('TABLA_ASUNTO'),
  solicitud: entorno('TABLA_SOLICITUD'),
  propuesta: entorno('TABLA_PROPUESTA'),
  perfilAbogado: entorno('TABLA_PERFILABOGADO'),
  perfilPublico: entorno('TABLA_PERFILPUBLICO'),
  contrato: entorno('TABLA_CONTRATO'),
  expediente: entorno('TABLA_EXPEDIENTE'),
  actuacion: entorno('TABLA_ACTUACION'),
}

const cognito = new CognitoIdentityProviderClient()
const userPoolId = entorno('USER_POOL_ID')

/** Nombre registrado en Cognito; la identidad es `sub::username`. */
async function nombreDePersona(identidad: string): Promise<string> {
  const username = identidad.split('::')[1] ?? identidad
  const { UserAttributes } = await cognito.send(
    new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }),
  )
  return UserAttributes?.find((a) => a.Name === 'name')?.Value ?? 'Cliente'
}

const servicio = new Servicio(
  DynamoDBDocumentClient.from(new DynamoDBClient(), {
    marshallOptions: { removeUndefinedValues: true },
  }),
  tablas,
  nombreDePersona,
)

const texto = (valor: unknown, max = 100): string => {
  if (typeof valor !== 'string' || !valor.trim() || valor.length > max) {
    throw new ErrorFlujo('DATOS_INVALIDOS')
  }
  return valor
}

/**
 * Mutaciones del flujo de contratación. Los grupos se exigen en el esquema; aquí se comprueba
 * además que la persona participe en lo que cambia. Los errores son códigos estables.
 */
/** Amplify Gen 2 envía el nombre de la operación en `fieldName`; AppSync directo, en `info`. */
export const operacionDe = (event: {
  fieldName?: string
  info?: { fieldName?: string }
}) => event.fieldName ?? event.info?.fieldName

export const handler = async (
  event: AppSyncResolverEvent<Record<string, unknown>> & { fieldName?: string },
): Promise<Resultado> => {
  const identidad = event.identity as AppSyncIdentityCognito | null
  if (!identidad?.sub || !identidad.username) throw new Error('NO_PERMITIDO')
  const persona = `${identidad.sub}::${identidad.username}`
  const a = event.arguments

  try {
    switch (operacionDe(event)) {
      case 'enviarSolicitud':
        return await servicio.enviarSolicitud(
          persona,
          texto(a.asuntoId),
          texto(a.perfilId),
        )
      case 'retirarSolicitud':
        return await servicio.cambiarSolicitud(persona, texto(a.solicitudId), 'RETIRAR')
      case 'responderSolicitud':
        return await servicio.cambiarSolicitud(
          persona,
          texto(a.solicitudId),
          a.aceptar === true ? 'ACEPTAR' : 'RECHAZAR',
          a.declaracionNoConflicto === true,
        )
      case 'proponerHonorarios':
        return await servicio.proponerHonorarios(persona, texto(a.solicitudId), {
          monto: a.monto,
          alcance: a.alcance,
          formaDePago: a.formaDePago,
        })
      case 'prepararContrato':
        return await servicio.prepararContrato(persona, texto(a.solicitudId))
      case 'aceptarContrato':
        return await servicio.aceptarContrato(
          persona,
          texto(a.solicitudId),
          a.aceptoDemostracion === true,
        )
      default:
        throw new ErrorFlujo('NO_PERMITIDO')
    }
  } catch (error) {
    if (error instanceof ErrorFlujo) throw error
    console.error('Error inesperado en el flujo del asunto:', (error as Error).name)
    throw new Error('ERROR_INTERNO', { cause: error })
  }
}
