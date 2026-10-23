import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { backendConfigurado } from '../../app/amplify'
import { datosComoUsuario } from '../../app/datos'
import { useConsulta } from '../../app/useConsulta'
import { useSesion } from '../auth/useSesion'
import { Aviso } from '../../ui/Aviso'
import { etiquetaMateria, etiquetaModalidad } from '../perfiles/formato'
import {
  ETIQUETAS_INDICADORES,
  accionesDisponibles,
  grupoDePerfil,
  type AccionPerfil,
  type GrupoPerfil,
  type Indicadores,
} from '../../../shared/domain/administracion'
import { aplicarAccion, type PerfilAbogado } from './acciones'

const GRUPOS: { grupo: GrupoPerfil; titulo: string; vacio: string }[] = [
  {
    grupo: 'PENDIENTE',
    titulo: 'Pendientes de revisión',
    vacio: 'No hay perfiles pendientes.',
  },
  {
    grupo: 'PUBLICADO',
    titulo: 'Publicados',
    vacio: 'Todavía no hay perfiles publicados.',
  },
  { grupo: 'OCULTO', titulo: 'Verificados y ocultos', vacio: 'No hay perfiles ocultos.' },
  { grupo: 'RECHAZADO', titulo: 'Rechazados', vacio: 'No hay perfiles rechazados.' },
]

function etiquetaAccion(accion: AccionPerfil, grupo: GrupoPerfil): string {
  switch (accion) {
    case 'VERIFICAR_Y_PUBLICAR':
      return 'Verificar y publicar'
    case 'PUBLICAR':
      return grupo === 'PENDIENTE' ? 'Publicar sin verificar' : 'Publicar de nuevo'
    case 'VERIFICAR':
      return 'Marcar como verificado'
    case 'ACTUALIZAR_COPIA':
      return 'Actualizar copia pública'
    case 'OCULTAR':
      return 'Ocultar'
    case 'RECHAZAR':
      return 'Rechazar'
    case 'REABRIR':
      return 'Volver a pendiente'
  }
}

export function Panel() {
  const sesion = useSesion()

  if (!backendConfigurado) {
    return (
      <Aviso titulo="La administración no está disponible aquí">
        Este entorno todavía no tiene conectado el servicio de datos.
      </Aviso>
    )
  }
  if (sesion.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Cargando tu cuenta…</p>
        </div>
      </section>
    )
  }
  if (sesion.estado === 'anonimo') return <Navigate to="/ingresar" replace />
  if (sesion.rol !== 'ADMIN') {
    return (
      <Aviso titulo="Esta sección es para administradores">
        Tu cuenta no tiene permisos de administración.
      </Aviso>
    )
  }

  return (
    <section className="seccion">
      <div className="contenedor">
        <h1 className="titulo-pagina">Administración</h1>
        <IndicadoresPanel />
        <PerfilesPanel />
      </div>
    </section>
  )
}

function IndicadoresPanel() {
  const consulta = useConsulta('indicadores', async () => {
    const { data, errors } = await datosComoUsuario().queries.indicadores()
    if (errors?.length || !data) throw new Error('consulta fallida')
    return data as Indicadores
  })

  return (
    <>
      <h2 className="subtitulo">Indicadores</h2>
      {consulta.estado === 'cargando' && <p role="status">Calculando indicadores…</p>}
      {consulta.estado === 'error' && (
        <p role="alert" className="campo__error">
          No pudimos calcular los indicadores. Recarga la página.
        </p>
      )}
      {consulta.estado === 'listo' && (
        <dl className="indicadores">
          {(Object.keys(ETIQUETAS_INDICADORES) as (keyof Indicadores)[]).map((clave) => (
            <div key={clave}>
              <dt>{ETIQUETAS_INDICADORES[clave]}</dt>
              <dd>{consulta.datos[clave]}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  )
}

function PerfilesPanel() {
  const [version, setVersion] = useState(0)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)

  const consulta = useConsulta(`perfiles:${version}`, async () => {
    const { data, errors } = await datosComoUsuario().models.PerfilAbogado.list({
      limit: 500,
    })
    if (errors?.length) throw new Error('consulta fallida')
    return data
  })

  async function ejecutar(perfil: PerfilAbogado, accion: AccionPerfil) {
    setTrabajando(perfil.id)
    setFallo(false)
    try {
      await aplicarAccion(perfil, accion)
      setVersion((v) => v + 1)
    } catch {
      setFallo(true)
    } finally {
      setTrabajando(null)
    }
  }

  return (
    <>
      <h2 className="subtitulo">Perfiles de abogados</h2>
      <p className="nota">
        Antes de marcar un perfil como verificado, comprueba su cédula en el Registro
        Nacional de Profesionistas de la SEP. Specter no hace esa consulta de forma
        automática.
      </p>
      {fallo && (
        <p role="alert" className="campo__error">
          No pudimos aplicar el cambio. Inténtalo de nuevo.
        </p>
      )}
      {consulta.estado === 'cargando' && <p role="status">Cargando perfiles…</p>}
      {consulta.estado === 'error' && (
        <p role="alert" className="campo__error">
          No pudimos cargar los perfiles. Recarga la página.
        </p>
      )}
      {consulta.estado === 'listo' &&
        GRUPOS.map(({ grupo, titulo, vacio }) => {
          const perfiles = consulta.datos.filter((p) => grupoDePerfil(p) === grupo)
          return (
            <div key={grupo}>
              <h3 className="grupo-titulo">
                {titulo} ({perfiles.length})
              </h3>
              {perfiles.length === 0 ? (
                <p className="nota">{vacio}</p>
              ) : (
                <ul className="directorio">
                  {perfiles.map((p) => (
                    <li key={p.id} className="fila-perfil">
                      <div>
                        <h4 className="directorio__nombre">{p.nombre}</h4>
                        <p>{p.materias.map(etiquetaMateria).join(', ')}</p>
                        <p className="nota">
                          {p.ubicacion}. {etiquetaModalidad(p.modalidad)}.
                          {p.aniosExperiencia != null &&
                            ` ${p.aniosExperiencia} años de experiencia.`}
                        </p>
                        <p className="nota">Cédula: {p.cedula ?? 'no capturada'}</p>
                      </div>
                      <div className="acciones-fila">
                        {accionesDisponibles(p).map((accion) => (
                          <button
                            key={accion}
                            type="button"
                            className={`boton ${accion === 'VERIFICAR_Y_PUBLICAR' ? 'boton--primario' : 'boton--secundario'}`}
                            disabled={trabajando === p.id}
                            onClick={() => void ejecutar(p, accion)}
                          >
                            {etiquetaAccion(accion, grupo)}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
    </>
  )
}
