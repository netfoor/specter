import { Link, useParams } from 'react-router-dom'
import { datosComoUsuario, esNoAutorizado } from '../../app/datos'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import { asuntoEditable } from '../../../shared/domain/asunto'
import { ProtegerRol } from '../auth/ProtegerRol'
import { AsuntoForm } from './AsuntoForm'

export function NuevoAsunto() {
  return (
    <ProtegerRol rol="CLIENTE" sinAcceso="Esta sección es para clientes">
      <AsuntoForm />
    </ProtegerRol>
  )
}

export function EditarAsunto() {
  return (
    <ProtegerRol rol="CLIENTE" sinAcceso="Esta sección es para clientes">
      <Cargar />
    </ProtegerRol>
  )
}

function Cargar() {
  const { id = '' } = useParams()
  const consulta = useConsulta(id, async () => {
    const { data, errors } = await datosComoUsuario().models.Asunto.get({ id })
    if (esNoAutorizado(errors)) return null
    if (errors?.length) throw new Error('consulta fallida')
    return data
  })

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
  if (!consulta.datos) {
    return (
      <Aviso titulo="No encontramos este asunto">
        Puede que no exista o que no sea tuyo.
      </Aviso>
    )
  }
  if (!asuntoEditable(consulta.datos)) {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <h1 className="titulo-pagina">Este asunto ya no se puede editar</h1>
          <p className="entrada">Un asunto contratado o concluido queda como registro.</p>
          <div className="acciones">
            <Link
              className="boton boton--primario"
              to={`/mi-espacio/asuntos/${consulta.datos.id}`}
            >
              Ver el asunto
            </Link>
          </div>
        </div>
      </section>
    )
  }
  return <AsuntoForm asunto={consulta.datos} />
}
