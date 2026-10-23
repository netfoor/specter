import { Link } from 'react-router-dom'
import { Aviso } from '../../ui/Aviso'
import { ETIQUETA_ESTADO_ASUNTO } from '../../../shared/domain/asunto'
import type { ResultadoCoincidencias } from './cargar'

/** Pantallas para los casos en que no hay coincidencias que mostrar. */
export function SinCoincidencias({
  resultado,
  id,
}: {
  resultado: ResultadoCoincidencias
  id: string
}) {
  if (resultado.tipo === 'no_encontrado') {
    return (
      <Aviso titulo="No encontramos este asunto">
        Puede que no exista o que no sea tuyo.
      </Aviso>
    )
  }
  if (resultado.tipo === 'no_abierto') {
    const estado = ETIQUETA_ESTADO_ASUNTO[resultado.estado].toLowerCase()
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <h1 className="titulo-pagina">Todavía no hay abogados para este asunto</h1>
          <p className="entrada">
            Tu asunto está en estado «{estado}». Solo mostramos abogados compatibles
            cuando el asunto está abierto.
          </p>
          <div className="acciones">
            <Link className="boton boton--primario" to={`/mi-espacio/asuntos/${id}`}>
              Ver el asunto
            </Link>
          </div>
        </div>
      </section>
    )
  }
  return null
}
