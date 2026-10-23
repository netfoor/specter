import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { Amplify } from 'aws-amplify'
import { fetchAuthSession, signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { leerSalidas, nombreTabla, resolverApiId } from '../../scripts/comun/backend'

export const salidas = leerSalidas()
Amplify.configure(salidas)

const region: string = salidas.auth.aws_region
const poolId: string = salidas.auth.user_pool_id

const cognito = new CognitoIdentityProviderClient({ region })
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }))

export const CLAVE = 'Prueba-Specter-2026!'
export type Persona = 'ana' | 'beto' | 'carla' | 'admin'

const PERSONAS: Record<Persona, { grupo: string; nombre: string }> = {
  ana: { grupo: 'CLIENTE', nombre: 'Ana Cliente' },
  beto: { grupo: 'ABOGADO', nombre: 'Beto Abogado' },
  carla: { grupo: 'CLIENTE', nombre: 'Carla Ajena' },
  admin: { grupo: 'ADMIN', nombre: 'Admin Prueba' },
}

const correo = (p: Persona) => `autorizacion-${p}@example.com`

/** Identidad tal como la guardan las reglas de propietario: `sub::username`. */
export const identidad: Record<Persona, string> = {
  ana: '',
  beto: '',
  carla: '',
  admin: '',
}

export async function crearPersonas() {
  apiId = await resolverApiId(salidas)
  for (const [persona, { grupo, nombre }] of Object.entries(PERSONAS) as [
    Persona,
    (typeof PERSONAS)[Persona],
  ][]) {
    const username = correo(persona)
    await cognito
      .send(new AdminDeleteUserCommand({ UserPoolId: poolId, Username: username }))
      .catch(() => undefined)
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: poolId,
        Username: username,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: username },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: nombre },
        ],
      }),
    )
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: poolId,
        Username: username,
        Password: CLAVE,
        Permanent: true,
      }),
    )
    await cognito.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: poolId,
        Username: username,
        GroupName: grupo,
      }),
    )
  }
  for (const persona of Object.keys(PERSONAS) as Persona[]) {
    await entrar(persona)
    const carga = (await fetchAuthSession()).tokens!.idToken!.payload
    identidad[persona] = `${carga.sub}::${carga['cognito:username']}`
  }
  await signOut()
}

export async function borrarPersonas() {
  await signOut().catch(() => undefined)
  for (const persona of Object.keys(PERSONAS) as Persona[]) {
    await cognito
      .send(new AdminDeleteUserCommand({ UserPoolId: poolId, Username: correo(persona) }))
      .catch(() => undefined)
  }
}

export async function entrar(persona: Persona) {
  await signOut()
  await signIn({ username: correo(persona), password: CLAVE })
}

export const comoUsuario = () => generateClient<Schema>({ authMode: 'userPool' })
/** Cierra la sesión primero: con una sesión abierta, AppSync lo trataría como usuario autenticado. */
export async function comoInvitado() {
  await signOut()
  return generateClient<Schema>({ authMode: 'identityPool' })
}

// Datos preparados directamente en DynamoDB, lo que haría el servidor en tareas posteriores.
const creados: { tabla: string; id: string }[] = []
let apiId = ''
const tabla = (modelo: string) => nombreTabla(modelo, apiId)

export async function sembrar(
  modelo: string,
  id: string,
  campos: Record<string, unknown>,
) {
  const ahora = new Date().toISOString()
  await dynamo.send(
    new PutCommand({
      TableName: tabla(modelo),
      Item: { id, __typename: modelo, createdAt: ahora, updatedAt: ahora, ...campos },
    }),
  )
  creados.push({ tabla: tabla(modelo), id })
}

export async function actualizarDirecto(
  modelo: string,
  id: string,
  campos: Record<string, unknown>,
) {
  const nombres = Object.keys(campos)
  await dynamo.send(
    new UpdateCommand({
      TableName: tabla(modelo),
      Key: { id },
      UpdateExpression: `SET ${nombres.map((_, i) => `#c${i} = :v${i}`).join(', ')}`,
      ExpressionAttributeNames: Object.fromEntries(nombres.map((n, i) => [`#c${i}`, n])),
      ExpressionAttributeValues: Object.fromEntries(
        nombres.map((n, i) => [`:v${i}`, campos[n]]),
      ),
    }),
  )
}

export function registrarCreado(modelo: string, id: string) {
  creados.push({ tabla: tabla(modelo), id })
}

export async function limpiarDatos() {
  for (const { tabla, id } of creados) {
    await dynamo
      .send(new DeleteCommand({ TableName: tabla, Key: { id } }))
      .catch(() => undefined)
  }
}

/** Una operación fue denegada si devolvió errores o no devolvió datos. */
export function denegada(res: { data?: unknown; errors?: readonly unknown[] }) {
  return Boolean(res.errors?.length) || res.data == null
}
