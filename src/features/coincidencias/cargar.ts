import { datosComoUsuario, esNoAutorizado } from '../../app/datos'
import { estadoDeAsunto, type EstadoAsunto } from '../../../shared/domain/asunto'
import { coincidencias, type Coincidencia } from '../../../shared/domain/matching'
import type { Schema } from '../../../amplify/data/resource'

export type PerfilPublico = Schema['PerfilPublico']['type']
export type Asunto = Schema['Asunto']['type']

export type ResultadoCoincidencias =
  | { tipo: 'no_encontrado' }
  | { tipo: 'no_abierto'; asunto: Asunto; estado: EstadoAsunto }
  | {
      tipo: 'listo'
      asunto: Asunto
      coincidencias: Coincidencia<PerfilPublico>[]
    }

/** Carga el asunto de la persona y los perfiles públicos compatibles con él. */
export async function cargarCoincidencias(id: string): Promise<ResultadoCoincidencias> {
  const cliente = datosComoUsuario()

  const respuesta = await cliente.models.Asunto.get({ id })
  if (
    esNoAutorizado(respuesta.errors) ||
    (!respuesta.errors?.length && !respuesta.data)
  ) {
    return { tipo: 'no_encontrado' }
  }
  if (respuesta.errors?.length || !respuesta.data) throw new Error('consulta fallida')

  const asunto = respuesta.data
  const estado = estadoDeAsunto(asunto)
  if (estado !== 'ABIERTO') return { tipo: 'no_abierto', asunto, estado }

  const perfiles = await cliente.models.PerfilPublico.list({ limit: 200 })
  if (perfiles.errors?.length) throw new Error('consulta fallida')
  return { tipo: 'listo', asunto, coincidencias: coincidencias(asunto, perfiles.data) }
}
