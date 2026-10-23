import { useId, useRef, useState, type FormEvent } from 'react'
import { datosComoUsuario } from '../../app/datos'
import { MATERIAS } from '../../../shared/domain/catalogos'
import {
  AVISO_NIA,
  NIA_LIMITES,
  hayAlgoQueUsar,
  type MensajeNia,
  type RespuestaNia,
} from '../../../shared/domain/nia'
import { etiquetaMateria } from '../perfiles/formato'

const SALUDO =
  'Hola, soy NIA. Cuéntame con tus palabras qué problema legal necesitas resolver y te ayudo a ordenarlo.'

type Fallo = 'limite' | 'no_disponible' | 'invalido' | 'otro'

const TEXTO_FALLO: Record<Fallo, string> = {
  limite:
    'Llegaste al límite de mensajes de hoy. Puedes seguir llenando el formulario y volver con NIA mañana.',
  no_disponible:
    'NIA no está disponible en este momento. Puedes llenar el formulario por tu cuenta.',
  invalido:
    'No pude leer tu mensaje. Revisa que no sea demasiado largo e inténtalo de nuevo.',
  otro: 'No pudimos enviar tu mensaje. Revisa tu conexión e inténtalo de nuevo.',
}

function clasificar(errores: readonly { message?: string }[] | undefined): Fallo {
  const texto = errores?.map((e) => e.message ?? '').join(' ') ?? ''
  if (texto.includes('LIMITE_DIARIO')) return 'limite'
  if (texto.includes('NIA_NO_DISPONIBLE')) return 'no_disponible'
  if (texto.includes('MENSAJE_INVALIDO')) return 'invalido'
  return 'otro'
}

type Props = { onUsar: (respuesta: RespuestaNia) => void }

/** Chat de orientación: ayuda a poner en palabras el asunto y sugiere materia, título y resumen. */
export function NiaChat({ onUsar }: Props) {
  const idEntrada = useId()
  const [historial, setHistorial] = useState<MensajeNia[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<Fallo | null>(null)
  const [ultima, setUltima] = useState<RespuestaNia | null>(null)
  const [restantes, setRestantes] = useState<number | null>(null)
  const [aplicada, setAplicada] = useState(false)
  const fin = useRef<HTMLDivElement>(null)

  const sinMensajes = restantes === 0 || fallo === 'limite'

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const mensaje = texto.trim()
    if (!mensaje || enviando || sinMensajes) return

    const conversacion: MensajeNia[] = [...historial, { rol: 'usuario', texto: mensaje }]
    setHistorial(conversacion)
    setTexto('')
    setFallo(null)
    setAplicada(false)
    setEnviando(true)
    try {
      const { data, errors } = await datosComoUsuario().mutations.nia({
        mensajes: JSON.stringify(conversacion),
      })
      if (errors?.length || !data) {
        setFallo(clasificar(errors))
        return
      }
      const respuesta: RespuestaNia = {
        respuesta: data.respuesta,
        materia: MATERIAS.find((m) => m === data.materia) ?? null,
        titulo: data.titulo ?? null,
        resumen: data.resumen ?? null,
        datosFaltantes: (data.datosFaltantes ?? []).filter((d): d is string =>
          Boolean(d),
        ),
        derivarAAbogado: data.derivarAAbogado,
      }
      setHistorial([...conversacion, { rol: 'nia', texto: respuesta.respuesta }])
      setUltima(respuesta)
      setRestantes(data.restantes)
    } catch {
      setFallo('otro')
    } finally {
      setEnviando(false)
      fin.current?.scrollIntoView?.({ block: 'nearest' })
    }
  }

  return (
    <section className="nia" aria-labelledby="nia-titulo">
      <h2 id="nia-titulo" className="subtitulo">
        Cuéntaselo a NIA
      </h2>
      <p className="nota">
        NIA te ayuda a poner tu asunto en palabras. <strong>{AVISO_NIA}</strong>
      </p>

      <div
        className="nia__mensajes"
        role="log"
        aria-live="polite"
        aria-label="Conversación con NIA"
      >
        <p className="nia__mensaje nia__mensaje--nia">
          <strong>NIA</strong>
          {SALUDO}
        </p>
        {historial.map((m, i) => (
          <p key={i} className={`nia__mensaje nia__mensaje--${m.rol}`}>
            <strong>{m.rol === 'usuario' ? 'Tú' : 'NIA'}</strong>
            {m.texto}
          </p>
        ))}
        {enviando && (
          <p className="nia__mensaje nia__mensaje--nia" role="status">
            <strong>NIA</strong>Pensando…
          </p>
        )}
        <div ref={fin} />
      </div>

      {ultima && !enviando && (
        <div className="nia__sugerencia">
          {ultima.datosFaltantes.length > 0 && (
            <>
              <p className="nia__etiqueta">Te ayudaría tener a la mano</p>
              <ul>
                {ultima.datosFaltantes.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          )}
          {ultima.derivarAAbogado && (
            <p className="nota">
              Para tu situación conviene que la revise un abogado. Al publicar tu asunto
              te mostramos abogados compatibles.
            </p>
          )}
          {hayAlgoQueUsar(ultima) && (
            <>
              <p className="nia__etiqueta">Lo que NIA entendió</p>
              <dl className="ficha">
                {ultima.materia && (
                  <div>
                    <dt>Materia</dt>
                    <dd>{etiquetaMateria(ultima.materia)}</dd>
                  </div>
                )}
                {ultima.titulo && (
                  <div>
                    <dt>Título</dt>
                    <dd>{ultima.titulo}</dd>
                  </div>
                )}
                {ultima.resumen && (
                  <div>
                    <dt>Resumen</dt>
                    <dd>{ultima.resumen}</dd>
                  </div>
                )}
              </dl>
              <div className="acciones">
                <button
                  type="button"
                  className="boton boton--secundario"
                  onClick={() => {
                    onUsar(ultima)
                    setAplicada(true)
                  }}
                >
                  Usar en el formulario
                </button>
              </div>
              {aplicada && (
                <p role="status" className="nota">
                  Llené los campos que estaban vacíos. Revísalos y complétalos abajo.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {fallo && (
        <p role="alert" className="campo__error">
          {TEXTO_FALLO[fallo]}
        </p>
      )}

      <form className="nia__form" onSubmit={enviar}>
        <label htmlFor={idEntrada}>Escribe tu mensaje</label>
        <textarea
          id={idEntrada}
          rows={3}
          maxLength={NIA_LIMITES.maxCaracteresMensaje}
          value={texto}
          disabled={sinMensajes}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="acciones">
          <button
            type="submit"
            className="boton boton--primario"
            disabled={enviando || sinMensajes || !texto.trim()}
          >
            Enviar
          </button>
          {restantes !== null && (
            <p className="nota" role="status">
              {restantes === 1
                ? 'Te queda 1 mensaje hoy.'
                : `Te quedan ${restantes} mensajes hoy.`}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
