import { useId, useRef, useState } from 'react'
import {
  ACEPTA_DOCUMENTOS,
  TIPOS_DOCUMENTO,
  formatoTamano,
  type TipoDocumento,
} from '../../../shared/domain/documento'
import { fechaYHora } from '../asuntos/formato'
import type { Documento } from './cargar'
import { enlaceDeDescarga, subirDocumento } from './subir'

type Props = {
  expedienteId: string
  documentos: Documento[]
  concluido: boolean
  quien: (autor: string) => string
  alCambiar: () => void
}

/** Documentos del expediente: lista, descarga con enlace temporal y subida (si sigue en gestión). */
export function Documentos({
  expedienteId,
  documentos,
  concluido,
  quien,
  alCambiar,
}: Props) {
  const idArchivo = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function subir() {
    if (!archivo) return
    setSubiendo(true)
    setMensaje(null)
    setListo(false)
    const r = await subirDocumento(expedienteId, archivo)
    setSubiendo(false)
    if (!r.ok) {
      setMensaje(r.mensaje)
      return
    }
    setListo(true)
    setArchivo(null)
    if (entrada.current) entrada.current.value = ''
    alCambiar()
  }

  async function descargar(id: string) {
    setMensaje(null)
    const url = await enlaceDeDescarga(id)
    if (url) window.location.assign(url)
    else setMensaje('No pudimos preparar la descarga. Inténtalo de nuevo.')
  }

  return (
    <>
      <h2 className="subtitulo">Documentos</h2>
      {documentos.length === 0 ? (
        <p className="nota">Todavía no hay documentos.</p>
      ) : (
        <ul className="directorio">
          {documentos.map((d) => (
            <li key={d.id} className="fila-perfil">
              <div>
                <p>
                  <strong>{d.nombre}</strong>
                </p>
                <p className="nota">
                  {TIPOS_DOCUMENTO[d.tipo as TipoDocumento] ?? d.tipo},{' '}
                  {formatoTamano(d.tamano)}. Subido por{' '}
                  {quien(d.subidoPor) === 'Tú' ? 'ti' : quien(d.subidoPor).toLowerCase()},{' '}
                  {fechaYHora(d.creadoEn)}
                </p>
              </div>
              <div className="acciones-fila">
                <button
                  type="button"
                  className="boton boton--secundario"
                  onClick={() => void descargar(d.id)}
                >
                  Descargar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!concluido && (
        <div className="nia__form">
          <label htmlFor={idArchivo}>Agregar un documento</label>
          <p className="campo__ayuda">
            PDF, JPG, PNG o Word (DOCX), hasta 10 MB. En esta demostración no subas
            documentos reales.
          </p>
          <input
            ref={entrada}
            id={idArchivo}
            type="file"
            accept={ACEPTA_DOCUMENTOS}
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null)
              setMensaje(null)
              setListo(false)
            }}
          />
          <div className="acciones">
            <button
              type="button"
              className="boton boton--primario"
              disabled={!archivo || subiendo}
              onClick={() => void subir()}
            >
              {subiendo ? 'Subiendo…' : 'Subir documento'}
            </button>
          </div>
        </div>
      )}
      {listo && (
        <p role="status" className="nota">
          Documento agregado al expediente.
        </p>
      )}
      {mensaje && (
        <p role="alert" className="campo__error">
          {mensaje}
        </p>
      )}
    </>
  )
}
