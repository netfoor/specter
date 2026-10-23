import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { datosComoUsuario, esNoAutorizado } from '../../app/datos'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import {
  ETIQUETA_ESTADO_ASUNTO,
  asuntoEditable,
  estadoDeAsunto,
} from '../../../shared/domain/asunto'
import { ProtegerRol } from '../auth/ProtegerRol'
import { SolicitudesDelAsunto } from '../solicitudes/SolicitudesDelAsunto'
import { etiquetaMateria, rangoHonorarios } from '../perfiles/formato'
import { etiquetaModalidadAsunto, fechaLarga } from './formato'

export function AsuntoDetalle() {
  return (
    <ProtegerRol rol="CLIENTE" sinAcceso="Esta sección es para clientes">
      <Detalle />
    </ProtegerRol>
  )
}

function Detalle() {
  const { id = '' } = useParams()
  const [version, setVersion] = useState(0)
  const [trabajando, setTrabajando] = useState(false)
  const [fallo, setFallo] = useState(false)

  const consulta = useConsulta(
    `${id}:${version}`,
    async () => {
      const { data, errors } = await datosComoUsuario().models.Asunto.get({ id })
      if (esNoAutorizado(errors)) return null
      if (errors?.length) throw new Error('consulta fallida')
      return data
    },
    { conservar: true },
  )

  async function ejecutar(
    accion: () => Promise<{ errors?: readonly unknown[] }>,
    alTerminar: () => void,
  ) {
    setTrabajando(true)
    setFallo(false)
    try {
      const respuesta = await accion()
      if (respuesta.errors?.length) throw new Error('no se aplicó')
      alTerminar()
    } catch {
      setFallo(true)
    } finally {
      setTrabajando(false)
    }
  }

  if (consulta.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Cargando tu asunto…</p>
        </div>
      </section>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar tu asunto">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }
  const asunto = consulta.datos
  if (!asunto) {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <h1 className="titulo-pagina">No encontramos este asunto</h1>
          <p className="entrada">Puede que no exista o que no sea tuyo.</p>
          <div className="acciones">
            <Link className="boton boton--primario" to="/mi-espacio/asuntos">
              Ver mis asuntos
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const estado = estadoDeAsunto(asunto)
  const editable = asuntoEditable(asunto)
  const presupuesto = rangoHonorarios(asunto.presupuestoMin, asunto.presupuestoMax)
  const modelo = datosComoUsuario().models.Asunto
  const cambiarAbierto = (abierto: boolean) =>
    ejecutar(
      () => modelo.update({ id: asunto.id, abierto }),
      () => setVersion((v) => v + 1),
    )

  const datos: [string, string | null][] = [
    ['Estado', ETIQUETA_ESTADO_ASUNTO[estado]],
    ['Materia', etiquetaMateria(asunto.materia)],
    ['Ciudad', asunto.ubicacion],
    ['Atención', etiquetaModalidadAsunto(asunto.modalidad)],
    ['Presupuesto', presupuesto],
    ['Creado el', fechaLarga(asunto.createdAt)],
  ]

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <p className="nota">
          <Link to="/mi-espacio/asuntos">Volver a mis asuntos</Link>
        </p>
        <h1 className="titulo-pagina">{asunto.titulo}</h1>

        <dl className="ficha">
          {datos
            .filter((fila): fila is [string, string] => Boolean(fila[1]))
            .map(([etiqueta, valor]) => (
              <div key={etiqueta}>
                <dt>{etiqueta}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
        </dl>

        <h2 className="subtitulo">Descripción</h2>
        <p className="texto-largo">{asunto.descripcion}</p>

        {editable && (
          <div className="acciones">
            {estado === 'BORRADOR' ? (
              <button
                className="boton boton--primario"
                disabled={trabajando}
                onClick={() => void cambiarAbierto(true)}
              >
                Publicar
              </button>
            ) : (
              <button
                className="boton boton--secundario"
                disabled={trabajando}
                onClick={() => void cambiarAbierto(false)}
              >
                Volver a borrador
              </button>
            )}
            <Link
              className="boton boton--secundario"
              to={`/mi-espacio/asuntos/${asunto.id}/editar`}
            >
              Editar
            </Link>
          </div>
        )}

        {fallo && (
          <p role="alert" className="campo__error">
            No pudimos aplicar el cambio. Inténtalo de nuevo.
          </p>
        )}

        {estado === 'ABIERTO' && (
          <>
            <div className="acciones">
              <Link
                className="boton boton--primario"
                to={`/mi-espacio/asuntos/${asunto.id}/coincidencias`}
              >
                Ver abogados compatibles
              </Link>
            </div>
            <p className="aviso">
              Tu asunto está abierto. Ningún abogado lo ve todavía, salvo aquellos a
              quienes les envíes una solicitud.
            </p>
          </>
        )}
        {estado === 'CONTRATADO' && (
          <p className="aviso">
            Asunto contratado. Se abrió su expediente, donde puedes conversar con tu
            abogado. <Link to="/mi-espacio/expedientes">Ir a mis expedientes</Link>
          </p>
        )}

        <SolicitudesDelAsunto
          asuntoId={asunto.id}
          alCambiar={() => setVersion((v) => v + 1)}
          contratado={estado === 'CONTRATADO' || estado === 'CONCLUIDO'}
        />

        {estado === 'BORRADOR' && (
          <p className="nota">
            Es un borrador: solo tú lo ves. Publícalo cuando esté listo para buscar
            abogados.
          </p>
        )}
      </div>
    </section>
  )
}
