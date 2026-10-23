import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import { MAX_COMPARACION } from '../../../shared/domain/matching'
import { ProtegerRol } from '../auth/ProtegerRol'
import { etiquetaMateria, etiquetaModalidad, rangoHonorarios } from '../perfiles/formato'
import { cargarCoincidencias, type PerfilPublico } from './cargar'
import { SinCoincidencias } from './Encabezado'
import { ETIQUETA_ESTADO_CRITERIO } from './Coincidencias'

const SIN_DATO = 'No indica'
const lista = (valores?: readonly (string | null)[] | null) =>
  (valores ?? []).filter(Boolean).join(', ') || SIN_DATO

const FILAS: [string, (p: PerfilPublico) => string][] = [
  [
    'Verificación',
    (p) => (p.verificadoManual ? 'Verificado manualmente por Specter' : 'Sin verificar'),
  ],
  ['Materias', (p) => p.materias.map(etiquetaMateria).join(', ')],
  ['Especialidades', (p) => lista(p.especialidades)],
  ['Ubicación', (p) => p.ubicacion],
  ['Jurisdicciones', (p) => lista(p.jurisdicciones)],
  ['Modalidad de atención', (p) => etiquetaModalidad(p.modalidad)],
  ['Idiomas', (p) => lista(p.idiomas)],
  [
    'Experiencia',
    (p) => (p.aniosExperiencia != null ? `${p.aniosExperiencia} años` : SIN_DATO),
  ],
  [
    'Honorarios orientativos',
    (p) => rangoHonorarios(p.honorariosDesde, p.honorariosHasta) ?? SIN_DATO,
  ],
  ['Disponibilidad', (p) => p.disponibilidad ?? SIN_DATO],
]

export function Comparar() {
  return (
    <ProtegerRol rol="CLIENTE" sinAcceso="Esta sección es para clientes">
      <Comparacion />
    </ProtegerRol>
  )
}

function Comparacion() {
  const { id = '' } = useParams()
  const [parametros] = useSearchParams()
  const consulta = useConsulta(id, () => cargarCoincidencias(id))

  if (consulta.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Preparando la comparación…</p>
        </div>
      </section>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos preparar la comparación">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }
  const resultado = consulta.datos
  if (resultado.tipo !== 'listo')
    return <SinCoincidencias resultado={resultado} id={id} />

  const pedidos = (parametros.get('perfiles') ?? '').split(',').filter(Boolean)
  const elegidos = [...new Set(pedidos)]
    .slice(0, MAX_COMPARACION)
    .flatMap((perfilId) =>
      resultado.coincidencias.filter((c) => c.perfil.id === perfilId),
    )

  if (elegidos.length < 2) {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <h1 className="titulo-pagina">Elige al menos dos abogados</h1>
          <p className="entrada">
            Para comparar necesitas elegir de 2 a {MAX_COMPARACION} abogados compatibles.
          </p>
          <div className="acciones">
            <Link
              className="boton boton--primario"
              to={`/mi-espacio/asuntos/${id}/coincidencias`}
            >
              Ver abogados compatibles
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const criterios = elegidos[0].criterios.map((c) => ({
    clave: c.clave,
    etiqueta: c.etiqueta,
  }))

  return (
    <section className="seccion">
      <div className="contenedor">
        <p className="nota">
          <Link to={`/mi-espacio/asuntos/${id}/coincidencias`}>
            Volver a los abogados compatibles
          </Link>
        </p>
        <h1 className="titulo-pagina">Comparar abogados</h1>
        <p className="entrada">Para «{resultado.asunto.titulo}».</p>

        <table className="comparacion">
          <caption className="solo-lectores">
            Comparación de los abogados elegidos
          </caption>
          <thead>
            <tr>
              <td />
              {elegidos.map(({ perfil }) => (
                <th scope="col" key={perfil.id}>
                  <Link to={`/abogados/${perfil.id}`}>{perfil.nombre}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="comparacion__destacada">
              <th scope="row">Coincidencia con tu asunto</th>
              {elegidos.map(({ perfil, puntuacion }) => (
                <td key={perfil.id} data-perfil={perfil.nombre}>
                  <strong>{puntuacion}</strong> de 100
                </td>
              ))}
            </tr>
            {criterios.map(({ clave, etiqueta }) => (
              <tr key={clave}>
                <th scope="row">Criterio: {etiqueta.toLowerCase()}</th>
                {elegidos.map(({ perfil, criterios: cs }) => {
                  const c = cs.find((x) => x.clave === clave)!
                  return (
                    <td key={perfil.id} data-perfil={perfil.nombre}>
                      {ETIQUETA_ESTADO_CRITERIO[c.estado]}
                    </td>
                  )
                })}
              </tr>
            ))}
            {FILAS.map(([etiqueta, valor]) => (
              <tr key={etiqueta}>
                <th scope="row">{etiqueta}</th>
                {elegidos.map(({ perfil }) => (
                  <td key={perfil.id} data-perfil={perfil.nombre}>
                    {valor(perfil)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="nota">
          La puntuación es una guía y sus pesos son provisionales. Envía tu solicitud
          desde la lista de abogados compatibles.
        </p>
      </div>
    </section>
  )
}
