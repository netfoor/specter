import { Link } from 'react-router-dom'
import { datosComoUsuario } from '../../app/datos'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import { ETIQUETA_ESTADO_ASUNTO, estadoDeAsunto } from '../../../shared/domain/asunto'
import { ProtegerRol } from '../auth/ProtegerRol'
import { etiquetaMateria } from '../perfiles/formato'
import { fechaLarga } from './formato'

export function MisAsuntos() {
  return (
    <ProtegerRol rol="CLIENTE" sinAcceso="Esta sección es para clientes">
      <Lista />
    </ProtegerRol>
  )
}

function Lista() {
  const consulta = useConsulta('mis-asuntos', async () => {
    const { data, errors } = await datosComoUsuario().models.Asunto.list({ limit: 200 })
    if (errors?.length) throw new Error('consulta fallida')
    return [...data].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  })

  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar tus asuntos">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">Mis asuntos</h1>
        <div className="acciones">
          <Link className="boton boton--primario" to="/mi-espacio/asuntos/nuevo">
            Describir un asunto
          </Link>
        </div>

        {consulta.estado === 'cargando' ? (
          <p role="status" className="nota">
            Cargando tus asuntos…
          </p>
        ) : consulta.datos.length === 0 ? (
          <p className="entrada">
            Todavía no has descrito ningún asunto. Empieza contándonos qué problema legal
            necesitas resolver.
          </p>
        ) : (
          <ul className="directorio">
            {consulta.datos.map((a) => (
              <li key={a.id}>
                <h2 className="directorio__nombre">
                  <Link to={`/mi-espacio/asuntos/${a.id}`}>{a.titulo}</Link>
                </h2>
                <p className="estado">{ETIQUETA_ESTADO_ASUNTO[estadoDeAsunto(a)]}</p>
                <p className="nota">
                  {etiquetaMateria(a.materia)}. {a.ubicacion}. Creado el{' '}
                  {fechaLarga(a.createdAt)}.
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
