import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Schema } from '../../../amplify/data/resource'
import { datosComoUsuario, esNoAutorizado } from '../../app/datos'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import { Campo } from '../../ui/Campo'
import type { EstadoSolicitud } from '../../../shared/domain/asunto'
import {
  ETIQUETA_ESTADO_SOLICITUD,
  validarPropuesta,
  type ErroresPropuesta,
  type FormularioPropuesta,
} from '../../../shared/domain/flujo'
import { aceptadoPorAlguien } from '../../../shared/domain/contrato'
import { ProtegerRol } from '../auth/ProtegerRol'
import { fechaLarga, etiquetaModalidadAsunto } from '../asuntos/formato'
import { etiquetaMateria, formatoPesos, rangoHonorarios } from '../perfiles/formato'
import { proponerHonorarios, responderSolicitud } from './acciones'

type Propuesta = Schema['Propuesta']['type']

async function cargar() {
  const cliente = datosComoUsuario()
  const { data, errors } = await cliente.models.Solicitud.list({ limit: 200 })
  if (errors?.length) throw new Error('consulta fallida')
  const ordenadas = [...data].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
  return Promise.all(
    ordenadas.map(async (s) => {
      const [asunto, propuesta, contrato] = await Promise.all([
        cliente.models.Asunto.get(
          { id: s.asuntoId },
          {
            selectionSet: [
              'id',
              'titulo',
              'descripcion',
              'materia',
              'ubicacion',
              'modalidad',
              'presupuestoMin',
              'presupuestoMax',
            ],
          },
        ),
        cliente.models.Propuesta.get({ id: s.id }),
        cliente.models.Contrato.get({ id: s.id }),
      ])
      // Tras retirarse o rechazarse, el abogado ya no lee el asunto.
      const visible = !esNoAutorizado(asunto.errors) && asunto.data ? asunto.data : null
      return {
        solicitud: s,
        asunto: visible,
        propuesta: propuesta.data ?? null,
        contrato: contrato.data ?? null,
      }
    }),
  )
}

export function SolicitudesAbogado() {
  return (
    <ProtegerRol rol="ABOGADO" sinAcceso="Esta sección es para abogados">
      <Bandeja />
    </ProtegerRol>
  )
}

function Bandeja() {
  const [version, setVersion] = useState(0)
  const consulta = useConsulta(`solicitudes:${version}`, cargar, { conservar: true })
  const recargar = () => setVersion((v) => v + 1)

  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar tus solicitudes">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">Solicitudes recibidas</h1>
        <p className="entrada">
          Clientes que te enviaron su asunto. Revísalo, decláralo libre de conflicto de
          interés antes de aceptarlo y envía tu propuesta de honorarios.
        </p>
        {consulta.estado === 'cargando' ? (
          <p role="status" className="nota">
            Cargando solicitudes…
          </p>
        ) : consulta.datos.length === 0 ? (
          <p className="nota">Todavía no recibes solicitudes.</p>
        ) : (
          <ul className="directorio">
            {consulta.datos.map((d) => (
              <Solicitud key={d.solicitud.id} {...d} alCambiar={recargar} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

type Datos = Awaited<ReturnType<typeof cargar>>[number]

function Solicitud({
  solicitud,
  asunto,
  propuesta,
  contrato,
  alCambiar,
}: Datos & { alCambiar: () => void }) {
  const estado = solicitud.estado as EstadoSolicitud
  const [declara, setDeclara] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function responder(aceptar: boolean) {
    setTrabajando(true)
    setMensaje(null)
    const r = await responderSolicitud(solicitud.id, aceptar, aceptar && declara)
    setTrabajando(false)
    if (!r.ok) setMensaje(r.mensaje)
    alCambiar()
  }

  return (
    <li>
      <h2 className="directorio__nombre">{asunto?.titulo ?? 'Asunto no disponible'}</h2>
      <p className="estado">{ETIQUETA_ESTADO_SOLICITUD[estado]}</p>
      <p className="nota">Recibida el {fechaLarga(solicitud.createdAt)}.</p>

      {asunto ? (
        <>
          <dl className="ficha">
            <div>
              <dt>Materia</dt>
              <dd>{etiquetaMateria(asunto.materia)}</dd>
            </div>
            <div>
              <dt>Ciudad</dt>
              <dd>{asunto.ubicacion}</dd>
            </div>
            <div>
              <dt>Atención</dt>
              <dd>{etiquetaModalidadAsunto(asunto.modalidad)}</dd>
            </div>
            {rangoHonorarios(asunto.presupuestoMin, asunto.presupuestoMax) && (
              <div>
                <dt>Presupuesto del cliente</dt>
                <dd>{rangoHonorarios(asunto.presupuestoMin, asunto.presupuestoMax)}</dd>
              </div>
            )}
          </dl>
          <p className="texto-largo">{asunto.descripcion}</p>
        </>
      ) : (
        <p className="nota">
          {estado === 'RETIRADA'
            ? 'El cliente retiró la solicitud; ya no puedes ver su asunto.'
            : 'Ya no puedes ver este asunto.'}
        </p>
      )}

      {estado === 'ENVIADA' && asunto && (
        <div className="decision">
          <label className="opcion">
            <input
              type="checkbox"
              checked={declara}
              onChange={(e) => setDeclara(e.target.checked)}
            />
            Declaro que no tengo conflicto de interés con este asunto ni con sus partes.
          </label>
          <div className="acciones">
            <button
              type="button"
              className="boton boton--primario"
              disabled={!declara || trabajando}
              onClick={() => void responder(true)}
            >
              Aceptar solicitud
            </button>
            <button
              type="button"
              className="boton boton--secundario"
              disabled={trabajando}
              onClick={() => void responder(false)}
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {estado === 'ACEPTADA' && asunto && contrato && (
        <div className="acciones">
          <Link className="boton boton--primario" to={`/contratos/${solicitud.id}`}>
            {contrato.estado === 'ACEPTADO'
              ? 'Ver el contrato aceptado'
              : 'Revisar el contrato'}
          </Link>
        </div>
      )}

      {estado === 'ACEPTADA' && asunto && contrato && aceptadoPorAlguien(contrato) ? (
        <p className="nota">
          La propuesta quedó fija porque el contrato ya tiene una aceptación.
        </p>
      ) : (
        estado === 'ACEPTADA' &&
        asunto && (
          <FormularioPropuestaHonorarios
            solicitudId={solicitud.id}
            propuesta={propuesta}
            alGuardar={alCambiar}
          />
        )
      )}

      {mensaje && (
        <p role="alert" className="campo__error">
          {mensaje}
        </p>
      )}
    </li>
  )
}

function FormularioPropuestaHonorarios({
  solicitudId,
  propuesta,
  alGuardar,
}: {
  solicitudId: string
  propuesta: Propuesta | null
  alGuardar: () => void
}) {
  const [form, setForm] = useState<FormularioPropuesta>({
    monto: propuesta ? String(propuesta.monto) : '',
    alcance: propuesta?.alcance ?? '',
    formaDePago: propuesta?.formaDePago ?? '',
  })
  const [errores, setErrores] = useState<ErroresPropuesta>({})
  const [estado, setEstado] = useState<'inactivo' | 'guardando' | 'listo'>('inactivo')
  const [mensaje, setMensaje] = useState<string | null>(null)
  const id = (campo: string) => `prop-${solicitudId}-${campo}`

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    const v = validarPropuesta(form)
    if (!v.ok) {
      setErrores(v.errores)
      return
    }
    setErrores({})
    setMensaje(null)
    setEstado('guardando')
    const r = await proponerHonorarios(solicitudId, v.datos)
    if (!r.ok) {
      setMensaje(r.mensaje)
      setEstado('inactivo')
      return
    }
    setEstado('listo')
    alGuardar()
  }

  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      <h3 className="subtitulo">
        {propuesta ? 'Tu propuesta de honorarios' : 'Propón tus honorarios'}
      </h3>
      {propuesta && (
        <p className="nota">
          Propuesta actual: {formatoPesos(propuesta.monto)}. Puedes actualizarla mientras
          no haya contrato.
        </p>
      )}
      <Campo id={id('monto')} etiqueta="Honorarios (MXN)" error={errores.monto}>
        <input
          id={id('monto')}
          inputMode="decimal"
          value={form.monto}
          aria-invalid={errores.monto ? true : undefined}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
        />
      </Campo>
      <Campo
        id={id('alcance')}
        etiqueta="Qué incluye tu servicio"
        error={errores.alcance}
      >
        <textarea
          id={id('alcance')}
          rows={4}
          value={form.alcance}
          aria-invalid={errores.alcance ? true : undefined}
          onChange={(e) => setForm({ ...form, alcance: e.target.value })}
        />
      </Campo>
      <Campo
        id={id('forma')}
        etiqueta="Forma de pago"
        ayuda="Por ejemplo: mitad al inicio y mitad al terminar."
        error={errores.formaDePago}
      >
        <input
          id={id('forma')}
          value={form.formaDePago}
          aria-invalid={errores.formaDePago ? true : undefined}
          onChange={(e) => setForm({ ...form, formaDePago: e.target.value })}
        />
      </Campo>
      <div className="acciones">
        <button
          className="boton boton--primario"
          type="submit"
          disabled={estado === 'guardando'}
        >
          {propuesta ? 'Actualizar propuesta' : 'Enviar propuesta'}
        </button>
      </div>
      {estado === 'listo' && (
        <p role="status" className="nota">
          Propuesta guardada. El cliente ya puede verla.
        </p>
      )}
      {mensaje && (
        <p role="alert" className="campo__error">
          {mensaje}
        </p>
      )}
    </form>
  )
}
