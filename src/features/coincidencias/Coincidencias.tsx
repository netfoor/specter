import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useConsulta } from '../../app/useConsulta'
import { Aviso } from '../../ui/Aviso'
import { Avatar } from '../../ui/Avatar'
import { Verificado } from '../../ui/Verificado'
import { MAX_COMPARACION, type EstadoCriterio } from '../../../shared/domain/matching'
import {
  ESTADOS_ACTIVOS,
  ETIQUETA_ESTADO_SOLICITUD,
  MAX_SOLICITUDES_ACTIVAS,
} from '../../../shared/domain/flujo'
import type { EstadoSolicitud } from '../../../shared/domain/asunto'
import { enviarSolicitud } from '../solicitudes/acciones'
import { ProtegerRol } from '../auth/ProtegerRol'
import { Sello } from '../perfiles/Directorio'
import { etiquetaMateria, etiquetaModalidad } from '../perfiles/formato'
import { cargarCoincidencias } from './cargar'
import { SinCoincidencias } from './Encabezado'

export const ETIQUETA_ESTADO_CRITERIO: Record<EstadoCriterio, string> = {
  cumple: 'Cumple',
  parcial: 'Parcial',
  no_cumple: 'No cumple',
  no_aplica: 'No aplica',
}

export function Coincidencias() {
  return (
    <ProtegerRol rol="CLIENTE" sinAcceso="Esta sección es para clientes">
      <Lista />
    </ProtegerRol>
  )
}

function Lista() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const [elegidos, setElegidos] = useState<string[]>([])
  const [version, setVersion] = useState(0)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const consulta = useConsulta(`${id}:${version}`, () => cargarCoincidencias(id), {
    conservar: true,
  })

  if (consulta.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Buscando abogados compatibles…</p>
        </div>
      </section>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos buscar abogados">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }
  const resultado = consulta.datos
  if (resultado.tipo !== 'listo')
    return <SinCoincidencias resultado={resultado} id={id} />

  const alternar = (perfilId: string) =>
    setElegidos((actual) =>
      actual.includes(perfilId)
        ? actual.filter((x) => x !== perfilId)
        : actual.length < MAX_COMPARACION
          ? [...actual, perfilId]
          : actual,
    )

  const lista = resultado.coincidencias
  const activas = Object.values(resultado.solicitudes).filter((e) =>
    ESTADOS_ACTIVOS.includes(e as EstadoSolicitud),
  ).length

  async function enviar(perfilId: string) {
    setEnviando(perfilId)
    setMensaje(null)
    const r = await enviarSolicitud(id, perfilId)
    setEnviando(null)
    if (!r.ok) setMensaje(r.mensaje)
    setVersion((v) => v + 1)
  }
  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <p className="nota">
          <Link to={`/mi-espacio/asuntos/${id}`}>Volver a mi asunto</Link>
        </p>
        <h1 className="titulo-pagina">Abogados compatibles</h1>
        <p className="entrada">
          Para «{resultado.asunto.titulo}». Ordenamos por qué tanto coincide cada perfil
          con tu asunto y te explicamos cada criterio.
        </p>
        <p className="nota">
          La puntuación es una guía y sus pesos son provisionales. Puedes enviar tu asunto
          a hasta {MAX_SOLICITUDES_ACTIVAS} abogados a la vez; solo ellos podrán verlo.
        </p>
        {mensaje && (
          <p role="alert" className="campo__error">
            {mensaje}
          </p>
        )}

        {lista.length === 0 ? (
          <p className="vacio">
            Por ahora ningún abogado publicado atiende la materia de tu asunto. Vuelve a
            revisar más adelante.
          </p>
        ) : (
          <>
            <div className="barra-comparar">
              <p className="nota" role="status">
                {elegidos.length === 0
                  ? `Elige de 2 a ${MAX_COMPARACION} abogados para compararlos.`
                  : `${elegidos.length} de ${MAX_COMPARACION} elegidos.`}
              </p>
              <button
                type="button"
                className="boton boton--primario"
                disabled={elegidos.length < 2}
                onClick={() =>
                  navegar(
                    `/mi-espacio/asuntos/${id}/comparar?perfiles=${elegidos.join(',')}`,
                  )
                }
              >
                Comparar elegidos
              </button>
            </div>

            <ul className="directorio">
              {lista.map(({ perfil, puntuacion, criterios }) => {
                const elegido = elegidos.includes(perfil.id)
                return (
                  <li key={perfil.id}>
                    <div className="coincidencia__cabecera">
                      <div className="conversacion-cabecera">
                        <Avatar nombre={perfil.nombre} />
                        <h2 className="directorio__nombre">
                          <Link to={`/abogados/${perfil.id}`}>{perfil.nombre}</Link>
                          {perfil.verificadoManual && <Verificado />}
                        </h2>
                      </div>
                      <p
                        className="puntuacion"
                        aria-label={`Coincidencia: ${puntuacion} de 100`}
                      >
                        <strong>{puntuacion}</strong> de 100
                      </p>
                    </div>
                    {perfil.verificadoManual && <Sello />}
                    <p className="nota">
                      {perfil.materias.map(etiquetaMateria).join(', ')}.{' '}
                      {perfil.ubicacion}. {etiquetaModalidad(perfil.modalidad)}.
                      {perfil.aniosExperiencia != null &&
                        ` ${perfil.aniosExperiencia} años de experiencia.`}
                    </p>

                    <ul className="criterios">
                      {criterios.map((c) => (
                        <li key={c.clave} className={`criterio criterio--${c.estado}`}>
                          <span className="criterio__estado">
                            {ETIQUETA_ESTADO_CRITERIO[c.estado]}
                          </span>
                          <span>
                            <strong>{c.etiqueta}.</strong> {c.detalle}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <EnvioSolicitud
                      estado={resultado.solicitudes[perfil.id]}
                      lleno={activas >= MAX_SOLICITUDES_ACTIVAS}
                      enviando={enviando === perfil.id}
                      alEnviar={() => void enviar(perfil.id)}
                    />

                    <label className="opcion">
                      <input
                        type="checkbox"
                        checked={elegido}
                        disabled={!elegido && elegidos.length >= MAX_COMPARACION}
                        onChange={() => alternar(perfil.id)}
                      />
                      Comparar a {perfil.nombre}
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function EnvioSolicitud({
  estado,
  lleno,
  enviando,
  alEnviar,
}: {
  estado?: string
  lleno: boolean
  enviando: boolean
  alEnviar: () => void
}) {
  if (estado && ESTADOS_ACTIVOS.includes(estado as EstadoSolicitud)) {
    return (
      <p className="estado">
        Solicitud {ETIQUETA_ESTADO_SOLICITUD[estado as EstadoSolicitud].toLowerCase()}
      </p>
    )
  }
  return (
    <div className="acciones acciones--compactas">
      <button
        type="button"
        className="boton boton--primario"
        disabled={lleno || enviando}
        onClick={alEnviar}
      >
        {estado ? 'Enviar de nuevo' : 'Enviar solicitud'}
      </button>
      {lleno && (
        <p className="nota">Ya tienes {MAX_SOLICITUDES_ACTIVAS} solicitudes activas.</p>
      )}
    </div>
  )
}
