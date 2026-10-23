import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { datosComoUsuario } from '../../app/datos'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import {
  ETIQUETA_ESTADO_EXPEDIENTE,
  LIMITE_MENSAJE,
  etiquetaActuacion,
  fusionarPorFecha,
  validarMensaje,
} from '../../../shared/domain/expediente'
import { codigoDeErrores, MENSAJE_FLUJO } from '../../../shared/domain/flujo'
import { ProtegerRol } from '../auth/ProtegerRol'
import { useSesion } from '../auth/useSesion'
import { fechaYHora } from '../asuntos/formato'
import { cargarExpediente, subDe, type Mensaje } from './cargar'
import { Documentos } from './Documentos'

export function ExpedientePagina() {
  return (
    <ProtegerRol
      rol={['CLIENTE', 'ABOGADO']}
      sinAcceso="Esta sección es para clientes y abogados"
    >
      <Expediente />
    </ProtegerRol>
  )
}

const mensajeDeError = (errores?: readonly { message?: string }[]) => {
  const codigo = codigoDeErrores(errores)
  return codigo
    ? MENSAJE_FLUJO[codigo]
    : 'No pudimos completar la acción. Inténtalo de nuevo.'
}

function Expediente() {
  const { id = '' } = useParams()
  const sesion = useSesion()
  const idEntrada = useId()
  const [version, setVersion] = useState(0)
  const [recibidos, setRecibidos] = useState<Mensaje[]>([])
  const [enVivo, setEnVivo] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const consulta = useConsulta(`${id}:${version}`, () => cargarExpediente(id), {
    conservar: true,
  })

  // Mensajes nuevos en vivo: AppSync solo los entrega a los participantes del expediente.
  useEffect(() => {
    const suscripcion = datosComoUsuario()
      .models.Mensaje.onCreate({ filter: { expedienteId: { eq: id } } })
      .subscribe({
        next: (nuevo) => setRecibidos((actuales) => fusionarPorFecha(actuales, [nuevo])),
        error: () => setEnVivo(false),
      })
    return () => suscripcion.unsubscribe()
  }, [id])

  if (consulta.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Cargando el expediente…</p>
        </div>
      </section>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar el expediente">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }
  if (!consulta.datos) {
    return (
      <Aviso titulo="No encontramos este expediente">
        Puede que no exista o que no seas parte de él.
      </Aviso>
    )
  }

  const { expediente, titulo, actuaciones, documentos } = consulta.datos
  const mensajes = fusionarPorFecha(consulta.datos.mensajes, recibidos)
  const participantes = expediente.participantes.map(subDe)
  const rol = sesion.estado === 'autenticado' ? sesion.rol : null
  const miSub = rol === 'CLIENTE' ? participantes[0] : participantes[1]
  const concluido = expediente.estado === 'CONCLUIDO'

  const quien = (autor: string) => {
    const sub = subDe(autor)
    if (sub === miSub) return 'Tú'
    return sub === participantes[0] ? 'Cliente' : 'Abogado'
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const v = validarMensaje(texto)
    if (!v.ok || enviando) return
    setEnviando(true)
    setMensaje(null)
    try {
      const r = await datosComoUsuario().mutations.enviarMensaje({
        expedienteId: id,
        texto: v.texto,
      })
      if (r.errors?.length || !r.data) setMensaje(mensajeDeError(r.errors))
      else {
        setTexto('')
        // Sin conexión en vivo, se recarga para ver el mensaje propio.
        if (!enVivo) setVersion((x) => x + 1)
      }
    } catch {
      setMensaje('No pudimos enviar tu mensaje. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  async function concluir() {
    setEnviando(true)
    setMensaje(null)
    try {
      const r = await datosComoUsuario().mutations.concluirExpediente({
        expedienteId: id,
      })
      if (r.errors?.length || !r.data) setMensaje(mensajeDeError(r.errors))
    } catch {
      setMensaje('No pudimos concluir el expediente. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
      setConfirmando(false)
      setVersion((x) => x + 1)
    }
  }

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <p className="nota">
          <Link to="/mi-espacio/expedientes">Volver a mis expedientes</Link>
        </p>
        <h1 className="titulo-pagina">{titulo}</h1>
        <dl className="ficha">
          <div>
            <dt>Estado</dt>
            <dd>
              {ETIQUETA_ESTADO_EXPEDIENTE[expediente.estado ?? ''] ?? expediente.estado}
            </dd>
          </div>
          <div>
            <dt>Contrato</dt>
            <dd>
              <Link to={`/contratos/${expediente.contratoId}`}>
                Ver el contrato aceptado
              </Link>
            </dd>
          </div>
        </dl>

        <h2 className="subtitulo">Conversación</h2>
        {!enVivo && (
          <p className="nota" role="status">
            La conversación no se está actualizando sola.{' '}
            <button
              type="button"
              className="enlace"
              onClick={() => setVersion((x) => x + 1)}
            >
              Ver mensajes nuevos
            </button>
          </p>
        )}
        <div
          className="nia__mensajes"
          role="log"
          aria-live="polite"
          aria-label="Conversación del expediente"
        >
          {mensajes.length === 0 && <p className="nota">Todavía no hay mensajes.</p>}
          {mensajes.map((m) => (
            <p
              key={m.id}
              className={`nia__mensaje ${quien(m.autor) === 'Tú' ? 'nia__mensaje--usuario' : 'nia__mensaje--nia'}`}
            >
              <strong>
                {quien(m.autor)}, {fechaYHora(m.creadoEn)}
              </strong>
              {m.texto}
            </p>
          ))}
        </div>

        {concluido ? (
          <p className="nota">
            El expediente está concluido; la conversación queda como registro.
          </p>
        ) : (
          <form className="nia__form" onSubmit={enviar}>
            <label htmlFor={idEntrada}>Escribe un mensaje</label>
            <textarea
              id={idEntrada}
              rows={3}
              maxLength={LIMITE_MENSAJE}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <div className="acciones">
              <button
                type="submit"
                className="boton boton--primario"
                disabled={enviando || !texto.trim()}
              >
                Enviar
              </button>
            </div>
          </form>
        )}
        {mensaje && (
          <p role="alert" className="campo__error">
            {mensaje}
          </p>
        )}

        <Documentos
          expedienteId={id}
          documentos={documentos}
          concluido={concluido}
          quien={quien}
          alCambiar={() => setVersion((x) => x + 1)}
        />

        <h2 className="subtitulo">Bitácora</h2>
        <ul className="bitacora">
          {actuaciones.map((a) => (
            <li key={a.id}>
              <p className="estado">{etiquetaActuacion(a.tipo)}</p>
              <p>{a.detalle}</p>
              <p className="nota">{fechaYHora(a.creadoEn)}</p>
            </li>
          ))}
        </ul>

        {rol === 'ABOGADO' && !concluido && (
          <div className="decision">
            {confirmando ? (
              <>
                <p>
                  ¿Concluir el expediente? El asunto quedará concluido y ya no se podrán
                  enviar mensajes.
                </p>
                <div className="acciones">
                  <button
                    type="button"
                    className="boton boton--primario"
                    disabled={enviando}
                    onClick={() => void concluir()}
                  >
                    Sí, concluir
                  </button>
                  <button
                    type="button"
                    className="boton boton--secundario"
                    onClick={() => setConfirmando(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="boton boton--secundario"
                onClick={() => setConfirmando(true)}
              >
                Concluir expediente
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
