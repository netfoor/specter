import type { Schema } from '../../../amplify/data/resource'
import { datosComoUsuario, esNoAutorizado } from '../../app/datos'

export type Mensaje = Schema['Mensaje']['type']
export type Actuacion = Schema['Actuacion']['type']

/** La API devuelve los campos de propietario solo con el `sub`; se compara en esa forma. */
export const subDe = (identidad: string | null | undefined) =>
  (identidad ?? '').split('::')[0]

export async function cargarExpediente(id: string) {
  const cliente = datosComoUsuario()
  const expediente = await cliente.models.Expediente.get({ id })
  if (
    esNoAutorizado(expediente.errors) ||
    (!expediente.errors?.length && !expediente.data)
  )
    return null
  if (expediente.errors?.length || !expediente.data) throw new Error('consulta fallida')

  const [asunto, mensajes, actuaciones] = await Promise.all([
    cliente.models.Asunto.get(
      { id: expediente.data.asuntoId },
      { selectionSet: ['id', 'titulo', 'materia', 'ubicacion'] },
    ),
    cliente.models.Mensaje.listMensajeByExpedienteIdAndCreadoEn(
      { expedienteId: id },
      { limit: 500 },
    ),
    cliente.models.Actuacion.listActuacionByExpedienteIdAndCreadoEn(
      { expedienteId: id },
      { limit: 200 },
    ),
  ])
  if (mensajes.errors?.length || actuaciones.errors?.length)
    throw new Error('consulta fallida')
  return {
    expediente: expediente.data,
    titulo: asunto.data?.titulo ?? 'Asunto',
    mensajes: mensajes.data,
    actuaciones: actuaciones.data,
  }
}

export async function cargarExpedientes() {
  const cliente = datosComoUsuario()
  const { data, errors } = await cliente.models.Expediente.list({ limit: 200 })
  if (errors?.length) throw new Error('consulta fallida')
  const ordenados = [...data].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
  return Promise.all(
    ordenados.map(async (e) => {
      const asunto = await cliente.models.Asunto.get(
        { id: e.asuntoId },
        { selectionSet: ['id', 'titulo'] },
      )
      return { expediente: e, titulo: asunto.data?.titulo ?? 'Asunto' }
    }),
  )
}
