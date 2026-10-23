import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import type { Schema } from '../../data/resource'
import { contarFilas, contarUsuariosEnGrupo } from './conteo'

const db = new DynamoDBClient()
const cognito = new CognitoIdentityProviderClient()

function entorno(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`)
  return valor
}

export const handler: Schema['indicadores']['functionHandler'] = async () => {
  const pool = entorno('USER_POOL_ID')
  const tabla = (modelo: string) => entorno(`TABLA_${modelo.toUpperCase()}`)

  const [
    abogadosRegistrados,
    clientesRegistrados,
    abogadosVerificados,
    abogadosPublicados,
    asuntos,
    solicitudes,
    contrataciones,
    concluidos,
  ] = await Promise.all([
    contarUsuariosEnGrupo(cognito, pool, 'ABOGADO'),
    contarUsuariosEnGrupo(cognito, pool, 'CLIENTE'),
    contarFilas(db, tabla('PerfilAbogado'), {
      campo: 'estadoVerificacion',
      valor: 'VERIFICADO_MANUAL',
    }),
    contarFilas(db, tabla('PerfilPublico')),
    contarFilas(db, tabla('Asunto')),
    contarFilas(db, tabla('Solicitud')),
    contarFilas(db, tabla('Expediente')),
    contarFilas(db, tabla('Expediente'), { campo: 'estado', valor: 'CONCLUIDO' }),
  ])

  return {
    abogadosRegistrados,
    clientesRegistrados,
    abogadosVerificados,
    abogadosPublicados,
    asuntos,
    solicitudes,
    contrataciones,
    concluidos,
  }
}
