import { useState } from 'react'
import { Link } from 'react-router-dom'
import { datosComoInvitado, datosComoUsuario } from '../../app/datos'
import { backendConfigurado } from '../../app/amplify'
import { useConsulta } from '../../app/useConsulta'
import { useSesion } from '../auth/useSesion'
import {
  MATERIAS,
  MODALIDADES,
  type Materia,
  type Modalidad,
} from '../../../shared/domain/catalogos'
import { filtrarDirectorio } from '../../../shared/domain/perfil'
import { etiquetaMateria, etiquetaModalidad } from './formato'

export function Directorio() {
  const sesion = useSesion()
  const [materia, setMateria] = useState<Materia | ''>('')
  const [modalidad, setModalidad] = useState<Modalidad | ''>('')
  const [texto, setTexto] = useState('')

  const autenticado = sesion.estado === 'autenticado'
  const clave =
    !backendConfigurado || sesion.estado === 'cargando' ? null : String(autenticado)
  const consulta = useConsulta(clave, async () => {
    const cliente = autenticado ? datosComoUsuario() : datosComoInvitado()
    const { data, errors } = await cliente.models.PerfilPublico.list({ limit: 200 })
    if (errors?.length) throw new Error('consulta fallida')
    return data
  })

  if (!backendConfigurado) {
    return (
      <Aviso titulo="El directorio no está disponible aquí">
        Este entorno todavía no tiene conectado el servicio de datos. Vuelve más tarde.
      </Aviso>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar el directorio">
        Revisa tu conexión y recarga la página. Si sigue igual, vuelve a intentarlo más
        tarde.
      </Aviso>
    )
  }

  const perfiles = consulta.estado === 'listo' ? consulta.datos : []
  const visibles = filtrarDirectorio(perfiles, { materia, modalidad, texto })
  const hayFiltros = Boolean(materia || modalidad || texto)

  return (
    <section className="seccion">
      <div className="contenedor">
        <h1 className="titulo-pagina">Abogados</h1>
        <p className="entrada">
          Perfiles que un administrador de Specter revisó y publicó. Consulta su
          experiencia antes de decidir.
        </p>

        <form
          className="filtros"
          role="search"
          aria-label="Filtrar abogados"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="campo">
            <label htmlFor="f-texto">Buscar por nombre, ciudad o especialidad</label>
            <input
              id="f-texto"
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-materia">Materia</label>
            <select
              id="f-materia"
              value={materia}
              onChange={(e) => setMateria(e.target.value as Materia | '')}
            >
              <option value="">Todas</option>
              {MATERIAS.map((m) => (
                <option key={m} value={m}>
                  {etiquetaMateria(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-modalidad">Modalidad</label>
            <select
              id="f-modalidad"
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as Modalidad | '')}
            >
              <option value="">Todas</option>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>
                  {etiquetaModalidad(m)}
                </option>
              ))}
            </select>
          </div>
        </form>

        {consulta.estado === 'cargando' ? (
          <p role="status" className="nota">
            Cargando abogados…
          </p>
        ) : visibles.length === 0 ? (
          <div className="vacio">
            <p>
              {hayFiltros
                ? 'Ningún abogado coincide con tu búsqueda.'
                : 'Todavía no hay abogados publicados.'}
            </p>
            {hayFiltros && (
              <button
                type="button"
                className="boton boton--secundario"
                onClick={() => {
                  setMateria('')
                  setModalidad('')
                  setTexto('')
                }}
              >
                Borrar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="nota" role="status">
              {visibles.length} {visibles.length === 1 ? 'abogado' : 'abogados'}
            </p>
            <ul className="directorio">
              {visibles.map((p) => (
                <li key={p.id}>
                  <h2 className="directorio__nombre">
                    <Link to={`/abogados/${p.id}`}>{p.nombre}</Link>
                  </h2>
                  {p.verificadoManual && <Sello />}
                  <p>{p.materias.map(etiquetaMateria).join(', ')}</p>
                  <p className="nota">
                    {p.ubicacion}. {etiquetaModalidad(p.modalidad)}.
                    {p.aniosExperiencia != null &&
                      ` ${p.aniosExperiencia} años de experiencia.`}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

export function Sello() {
  return (
    <p className="sello">
      <span className="sello__marca" aria-hidden="true" />
      Verificado manualmente por Specter
    </p>
  )
}

export function Aviso({ titulo, children }: { titulo: string; children: string }) {
  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">{titulo}</h1>
        <p className="entrada">{children}</p>
      </div>
    </section>
  )
}
