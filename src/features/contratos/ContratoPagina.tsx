import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { datosComoUsuario, esNoAutorizado } from '../../app/datos'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import { LEYENDA_DEMO } from '../../../shared/domain/contrato'
import { codigoDeErrores, MENSAJE_FLUJO } from '../../../shared/domain/flujo'
import { ProtegerRol } from '../auth/ProtegerRol'
import { useSesion } from '../auth/useSesion'
import { fechaLarga } from '../asuntos/formato'
import { Desglose } from './Desglose'

export function ContratoPagina() {
  return (
    <ProtegerRol
      rol={['CLIENTE', 'ABOGADO']}
      sinAcceso="Esta sección es para clientes y abogados"
    >
      <Contrato />
    </ProtegerRol>
  )
}

function Contrato() {
  const { id = '' } = useParams()
  const sesion = useSesion()
  const [version, setVersion] = useState(0)
  const [confirma, setConfirma] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const consulta = useConsulta(
    `${id}:${version}`,
    async () => {
      const { data, errors } = await datosComoUsuario().models.Contrato.get({ id })
      if (esNoAutorizado(errors)) return null
      if (errors?.length) throw new Error('consulta fallida')
      return data
    },
    { conservar: true },
  )

  if (consulta.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Cargando el contrato…</p>
        </div>
      </section>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar el contrato">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }
  const contrato = consulta.datos
  if (!contrato) {
    return (
      <Aviso titulo="No encontramos este contrato">
        Puede que no exista o que no seas parte de él.
      </Aviso>
    )
  }

  const esCliente = sesion.estado === 'autenticado' && sesion.rol === 'CLIENTE'
  const yaAcepte = Boolean(
    esCliente ? contrato.aceptadoCliente : contrato.aceptadoAbogado,
  )
  const aceptado = contrato.estado === 'ACEPTADO'

  async function aceptar() {
    setTrabajando(true)
    setMensaje(null)
    try {
      const r = await datosComoUsuario().mutations.aceptarContrato({
        solicitudId: id,
        aceptoDemostracion: confirma,
      })
      if (r.errors?.length || !r.data) {
        const codigo = codigoDeErrores(r.errors)
        setMensaje(
          codigo
            ? MENSAJE_FLUJO[codigo]
            : 'No pudimos registrar tu aceptación. Inténtalo de nuevo.',
        )
      }
    } catch {
      setMensaje(
        'No pudimos registrar tu aceptación. Revisa tu conexión e inténtalo de nuevo.',
      )
    } finally {
      setTrabajando(false)
      setVersion((v) => v + 1)
    }
  }

  const estadoParte = (fecha?: string | null) =>
    fecha ? `Aceptó el ${fechaLarga(fecha)}` : 'Pendiente'

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <p className="nota">
          <Link
            to={
              esCliente
                ? `/mi-espacio/asuntos/${contrato.asuntoId}`
                : '/mi-espacio/solicitudes'
            }
          >
            {esCliente ? 'Volver a mi asunto' : 'Volver a mis solicitudes'}
          </Link>
        </p>
        <h1 className="titulo-pagina">Contrato de prestación de servicios</h1>
        <p className="aviso">{LEYENDA_DEMO}</p>

        <h2 className="subtitulo">Desglose</h2>
        <Desglose
          honorarios={contrato.honorarios}
          leyenda="En esta demostración no se cobra ni se mueve dinero."
        />

        <h2 className="subtitulo">Aceptaciones</h2>
        <dl className="ficha">
          <div>
            <dt>Cliente</dt>
            <dd>{estadoParte(contrato.aceptadoCliente)}</dd>
          </div>
          <div>
            <dt>Abogado</dt>
            <dd>{estadoParte(contrato.aceptadoAbogado)}</dd>
          </div>
        </dl>

        {aceptado ? (
          <p className="aviso" role="status">
            Ambas partes aceptaron el contrato y se abrió el expediente del asunto.{' '}
            <Link to="/mi-espacio/expedientes">Ir a mis expedientes</Link>
          </p>
        ) : yaAcepte ? (
          <p className="nota" role="status">
            Ya aceptaste. Falta la aceptación de la otra parte.
          </p>
        ) : (
          <div className="decision">
            <label className="opcion">
              <input
                type="checkbox"
                checked={confirma}
                onChange={(e) => setConfirma(e.target.checked)}
              />
              Leí el contrato y entiendo que esta aceptación es de demostración y no tiene
              validez jurídica.
            </label>
            <div className="acciones">
              <button
                type="button"
                className="boton boton--primario"
                disabled={!confirma || trabajando}
                onClick={() => void aceptar()}
              >
                Aceptar contrato
              </button>
            </div>
          </div>
        )}
        {mensaje && (
          <p role="alert" className="campo__error">
            {mensaje}
          </p>
        )}

        <h2 className="subtitulo">Texto del contrato</h2>
        <div className="contrato-texto">{contrato.texto}</div>
      </div>
    </section>
  )
}
