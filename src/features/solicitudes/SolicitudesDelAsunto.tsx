import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { datosComoUsuario } from '../../app/datos'
import { useConsulta } from '../../app/useConsulta'
import type { EstadoSolicitud } from '../../../shared/domain/asunto'
import { ESTADOS_ACTIVOS, ETIQUETA_ESTADO_SOLICITUD } from '../../../shared/domain/flujo'
import { formatoPesos } from '../perfiles/formato'
import { fechaLarga } from '../asuntos/formato'
import { prepararContrato, retirarSolicitud } from './acciones'

const EXPLICACION: Record<EstadoSolicitud, string> = {
  ENVIADA: 'El abogado puede ver tu asunto y aún no responde.',
  ACEPTADA: 'El abogado aceptó y declaró no tener conflicto de interés.',
  RECHAZADA: 'El abogado no tomará este asunto. Ya no ve tu asunto.',
  RETIRADA: 'La solicitud se retiró y el abogado ya no ve tu asunto.',
}

async function cargar(asuntoId: string) {
  const cliente = datosComoUsuario()
  const { data, errors } = await cliente.models.Solicitud.listSolicitudByAsuntoId({
    asuntoId,
  })
  if (errors?.length) throw new Error('consulta fallida')
  const ordenadas = [...data].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
  return Promise.all(
    ordenadas.map(async (s) => {
      const [perfil, propuesta, contrato] = await Promise.all([
        s.perfilId ? cliente.models.PerfilPublico.get({ id: s.perfilId }) : null,
        cliente.models.Propuesta.get({ id: s.id }),
        cliente.models.Contrato.get({ id: s.id }),
      ])
      return {
        solicitud: s,
        abogado: perfil?.data?.nombre ?? 'Abogado',
        propuesta: propuesta.data ?? null,
        contrato: contrato.data ?? null,
      }
    }),
  )
}

/** Solicitudes de un asunto, para su dueña: estado, propuesta, contrato y opción de retirar. */
export function SolicitudesDelAsunto({
  asuntoId,
  alCambiar,
  contratado = false,
}: {
  asuntoId: string
  alCambiar: () => void
  contratado?: boolean
}) {
  const navegar = useNavigate()
  const [version, setVersion] = useState(0)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const consulta = useConsulta(`${asuntoId}:${version}`, () => cargar(asuntoId), {
    conservar: true,
  })

  async function preparar(id: string) {
    setTrabajando(true)
    setMensaje(null)
    const r = await prepararContrato(id)
    setTrabajando(false)
    if (r.ok) navegar(`/contratos/${id}`)
    else setMensaje(r.mensaje)
  }

  async function retirar(id: string) {
    setTrabajando(true)
    setMensaje(null)
    const r = await retirarSolicitud(id)
    setTrabajando(false)
    setConfirmando(null)
    if (!r.ok) setMensaje(r.mensaje)
    setVersion((v) => v + 1)
    alCambiar()
  }

  return (
    <>
      <h2 className="subtitulo">Solicitudes</h2>
      {mensaje && (
        <p role="alert" className="campo__error">
          {mensaje}
        </p>
      )}
      {consulta.estado === 'cargando' && <p role="status">Cargando solicitudes…</p>}
      {consulta.estado === 'error' && (
        <p role="alert" className="campo__error">
          No pudimos cargar las solicitudes. Recarga la página.
        </p>
      )}
      {consulta.estado === 'listo' &&
        (consulta.datos.length === 0 ? (
          <p className="nota">Todavía no has enviado este asunto a ningún abogado.</p>
        ) : (
          <ul className="directorio">
            {consulta.datos.map(({ solicitud, abogado, propuesta, contrato }) => {
              const estado = solicitud.estado as EstadoSolicitud
              const activa = ESTADOS_ACTIVOS.includes(estado) && !contratado
              return (
                <li key={solicitud.id}>
                  <h3 className="directorio__nombre">
                    {solicitud.perfilId ? (
                      <Link to={`/abogados/${solicitud.perfilId}`}>{abogado}</Link>
                    ) : (
                      abogado
                    )}
                  </h3>
                  <p className="estado">{ETIQUETA_ESTADO_SOLICITUD[estado]}</p>
                  <p className="nota">
                    {EXPLICACION[estado]} Enviada el {fechaLarga(solicitud.createdAt)}.
                  </p>

                  {propuesta && estado === 'ACEPTADA' && (
                    <dl className="ficha">
                      <div>
                        <dt>Honorarios propuestos</dt>
                        <dd>{formatoPesos(propuesta.monto)}</dd>
                      </div>
                      <div>
                        <dt>Qué incluye</dt>
                        <dd className="texto-largo">{propuesta.alcance}</dd>
                      </div>
                      <div>
                        <dt>Forma de pago</dt>
                        <dd>{propuesta.formaDePago}</dd>
                      </div>
                    </dl>
                  )}
                  {estado === 'ACEPTADA' && !propuesta && (
                    <p className="nota">
                      El abogado todavía no envía su propuesta de honorarios.
                    </p>
                  )}
                  {propuesta && estado === 'ACEPTADA' && (
                    <div className="acciones">
                      {contrato ? (
                        <Link
                          className="boton boton--primario"
                          to={`/contratos/${solicitud.id}`}
                        >
                          {contrato.estado === 'ACEPTADO'
                            ? 'Ver el contrato aceptado'
                            : 'Revisar y aceptar el contrato'}
                        </Link>
                      ) : (
                        !contratado && (
                          <button
                            type="button"
                            className="boton boton--primario"
                            disabled={trabajando}
                            onClick={() => void preparar(solicitud.id)}
                          >
                            Preparar contrato
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {activa && confirmando !== solicitud.id && (
                    <div className="acciones">
                      <button
                        type="button"
                        className="boton boton--secundario"
                        onClick={() => setConfirmando(solicitud.id)}
                      >
                        Retirar solicitud
                      </button>
                    </div>
                  )}
                  {confirmando === solicitud.id && (
                    <div
                      className="aviso"
                      role="alertdialog"
                      aria-label="Confirmar retiro"
                    >
                      <p>¿Retirar la solicitud? El abogado dejará de ver tu asunto.</p>
                      <div className="acciones">
                        <button
                          type="button"
                          className="boton boton--primario"
                          disabled={trabajando}
                          onClick={() => void retirar(solicitud.id)}
                        >
                          Sí, retirar
                        </button>
                        <button
                          type="button"
                          className="boton boton--secundario"
                          onClick={() => setConfirmando(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ))}
    </>
  )
}
