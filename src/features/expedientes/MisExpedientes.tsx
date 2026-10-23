import { Link } from 'react-router-dom'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import { ETIQUETA_ESTADO_EXPEDIENTE } from '../../../shared/domain/expediente'
import { ProtegerRol } from '../auth/ProtegerRol'
import { fechaLarga } from '../asuntos/formato'
import { cargarExpedientes } from './cargar'

export function MisExpedientes() {
  return (
    <ProtegerRol
      rol={['CLIENTE', 'ABOGADO']}
      sinAcceso="Esta sección es para clientes y abogados"
    >
      <Lista />
    </ProtegerRol>
  )
}

function Lista() {
  const consulta = useConsulta('expedientes', cargarExpedientes)
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar tus expedientes">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }
  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">Mis expedientes</h1>
        <p className="entrada">
          Cada asunto contratado tiene su expediente: la conversación entre las partes y
          la bitácora de lo que ocurre.
        </p>
        {consulta.estado === 'cargando' ? (
          <p role="status" className="nota">
            Cargando expedientes…
          </p>
        ) : consulta.datos.length === 0 ? (
          <p className="nota">
            Todavía no tienes expedientes. Se abren cuando ambas partes aceptan un
            contrato.
          </p>
        ) : (
          <ul className="directorio">
            {consulta.datos.map(({ expediente, titulo }) => (
              <li key={expediente.id}>
                <h2 className="directorio__nombre">
                  <Link to={`/expedientes/${expediente.id}`}>{titulo}</Link>
                </h2>
                <p className="estado">
                  {ETIQUETA_ESTADO_EXPEDIENTE[expediente.estado ?? ''] ??
                    expediente.estado}
                </p>
                <p className="nota">Abierto el {fechaLarga(expediente.createdAt)}.</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
