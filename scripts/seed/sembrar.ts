/**
 * Siembra (o retira con --limpiar) los datos de demostración en el backend indicado por
 * `amplify_outputs.json`: una cuenta de administración, una de cliente y 12 abogados ficticios.
 * Es idempotente. Requiere credenciales de AWS y, al sembrar, SEED_DEMO_PASSWORD en el entorno.
 */
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { aPerfilPublico, validarPerfil } from '../../shared/domain/perfil'
import { leerSalidas, nombreTabla, resolverApiId } from '../comun/backend'
import { ABOGADOS_DEMO, CUENTAS_DEMO, ID_PERFIL_CLIENTE_DEMO } from './datos'

const MIN_CLAVE = 12
const limpiar = process.argv.includes('--limpiar')

const salidas = leerSalidas()
const pool = salidas.auth.user_pool_id
const region = salidas.auth.aws_region
const cognito = new CognitoIdentityProviderClient({ region })
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
})

const apiId = await resolverApiId(salidas)
const tabla = (modelo: string) => nombreTabla(modelo, apiId)

console.log(`Destino: user pool ${pool} (${region}), API ${apiId}`)

async function buscarUsuario(correo: string): Promise<string | null> {
  try {
    const { Username, UserAttributes } = await cognito.send(
      new AdminGetUserCommand({ UserPoolId: pool, Username: correo }),
    )
    const sub = UserAttributes?.find((a) => a.Name === 'sub')?.Value
    return `${sub}::${Username}`
  } catch (error) {
    if (error instanceof UserNotFoundException) return null
    throw error
  }
}

async function asegurarUsuario(
  correo: string,
  nombre: string,
  grupo: string,
  clave: string,
) {
  let identidad = await buscarUsuario(correo)
  let creado = false
  if (!identidad) {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: pool,
        Username: correo,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: correo },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: nombre },
        ],
      }),
    )
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: pool,
        Username: correo,
        Password: clave,
        Permanent: true,
      }),
    )
    identidad = (await buscarUsuario(correo))!
    creado = true
  }
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: pool,
      Username: correo,
      GroupName: grupo,
    }),
  )
  return { identidad, creado }
}

async function poner(modelo: string, id: string, campos: Record<string, unknown>) {
  const ahora = new Date().toISOString()
  const sinNulos = Object.fromEntries(Object.entries(campos).filter(([, v]) => v != null))
  await dynamo.send(
    new PutCommand({
      TableName: tabla(modelo),
      Item: { id, __typename: modelo, createdAt: ahora, updatedAt: ahora, ...sinNulos },
    }),
  )
}

const borrar = (modelo: string, id: string) =>
  dynamo.send(new DeleteCommand({ TableName: tabla(modelo), Key: { id } }))

async function eliminarUsuario(correo: string) {
  try {
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: pool, Username: correo }))
    return true
  } catch (error) {
    if (error instanceof UserNotFoundException) return false
    throw error
  }
}

async function retirar() {
  let usuarios = 0
  for (const a of ABOGADOS_DEMO) {
    await borrar('PerfilAbogado', a.id)
    await borrar('PerfilPublico', a.id)
    if (await eliminarUsuario(a.correo)) usuarios++
  }
  await borrar('PerfilCliente', ID_PERFIL_CLIENTE_DEMO)
  for (const cuenta of Object.values(CUENTAS_DEMO)) {
    if (await eliminarUsuario(cuenta.correo)) usuarios++
  }
  console.log(
    `Retirados: ${ABOGADOS_DEMO.length} perfiles de abogado y ${usuarios} usuarios.`,
  )
}

async function sembrar() {
  const clave = process.env.SEED_DEMO_PASSWORD ?? ''
  if (clave.length < MIN_CLAVE) {
    console.error(`Define SEED_DEMO_PASSWORD en .env (mínimo ${MIN_CLAVE} caracteres).`)
    process.exit(1)
  }

  const resumen = { cuentas: 0, abogados: 0, publicados: 0, pendientes: 0 }

  for (const cuenta of Object.values(CUENTAS_DEMO)) {
    const { identidad, creado } = await asegurarUsuario(
      cuenta.correo,
      cuenta.nombre,
      cuenta.grupo,
      clave,
    )
    if (creado) resumen.cuentas++
    if (cuenta.grupo === 'CLIENTE') {
      await poner('PerfilCliente', ID_PERFIL_CLIENTE_DEMO, {
        owner: identidad,
        nombre: cuenta.nombre,
        ciudad: 'Puebla',
      })
    }
  }

  for (const abogado of ABOGADOS_DEMO) {
    const validacion = validarPerfil(abogado.formulario)
    if (!validacion.ok) throw new Error(`Perfil inválido: ${abogado.formulario.nombre}`)
    const datos = validacion.datos

    const { identidad, creado } = await asegurarUsuario(
      abogado.correo,
      datos.nombre,
      'ABOGADO',
      clave,
    )
    if (creado) resumen.cuentas++

    const publicado = abogado.situacion !== 'pendiente'
    const verificado = abogado.situacion === 'verificado'

    await poner('PerfilAbogado', abogado.id, {
      ...datos,
      owner: identidad,
      estadoVerificacion: verificado ? 'VERIFICADO_MANUAL' : undefined,
      publicado: publicado ? true : undefined,
    })
    resumen.abogados++

    if (publicado) {
      await poner('PerfilPublico', abogado.id, { ...aPerfilPublico(datos, verificado) })
      resumen.publicados++
    } else {
      await borrar('PerfilPublico', abogado.id)
      resumen.pendientes++
    }
  }

  console.log(
    `Listo: ${resumen.abogados} abogados (${resumen.publicados} publicados, ${resumen.pendientes} ` +
      `pendientes de revisión) y ${resumen.cuentas} cuentas nuevas.`,
  )
  console.log('Cuentas de demostración (contraseña: SEED_DEMO_PASSWORD):')
  console.log(`  administración  ${CUENTAS_DEMO.admin.correo}`)
  console.log(`  cliente         ${CUENTAS_DEMO.cliente.correo}`)
  console.log(`  abogado         ${ABOGADOS_DEMO[0].correo} (y los demás abogadoNN)`)
}

await (limpiar ? retirar() : sembrar())
