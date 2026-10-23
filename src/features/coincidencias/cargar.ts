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
      /** Estado de la solicitud más reciente por perfil. */
      solicitudes: Record<string, string>
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

  const [perfiles, enviadas] = await Promise.all([
    cliente.models.PerfilPublico.list({ limit: 200 }),
    cliente.models.Solicitud.listSolicitudByAsuntoId({ asuntoId: id }),
  ])
  if (perfiles.errors?.length || enviadas.errors?.length)
    throw new Error('consulta fallida')

  const solicitudes: Record<string, string> = {}
  const recientes = [...enviadas.data].sort((a, b) =>
    (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  )
  for (const s of recientes) if (s.perfilId) solicitudes[s.perfilId] = s.estado ?? ''

  return {
    tipo: 'listo',
    asunto,
    coincidencias: coincidencias(asunto, perfiles.data),
    solicitudes,
  }
}
