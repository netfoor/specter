import { Link, useParams } from 'react-router-dom'
import { datosComoInvitado, datosComoUsuario } from '../../app/datos'
import { backendConfigurado } from '../../app/amplify'
import { useConsulta } from '../../app/useConsulta'
import { useSesion } from '../auth/useSesion'
import { Aviso, Sello } from './Directorio'
import { etiquetaMateria, etiquetaModalidad, rangoHonorarios } from './formato'

export function PerfilDetalle() {
  const { id = '' } = useParams()
  const sesion = useSesion()
  const autenticado = sesion.estado === 'autenticado'
  const clave =
    !backendConfigurado || sesion.estado === 'cargando' ? null : `${id}:${autenticado}`
  const consulta = useConsulta(clave, async () => {
    const cliente = autenticado ? datosComoUsuario() : datosComoInvitado()
    const { data, errors } = await cliente.models.PerfilPublico.get({ id })
    if (errors?.length) throw new Error('consulta fallida')
    return data
  })

  if (!backendConfigurado) {
    return (
      <Aviso titulo="El directorio no está disponible aquí">
        Este entorno todavía no tiene conectado el servicio de datos.
      </Aviso>
    )
  }
  if (consulta.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Cargando perfil…</p>
        </div>
      </section>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar el perfil">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }
  const perfil = consulta.datos
  if (!perfil) {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <h1 className="titulo-pagina">Este perfil no está disponible</h1>
          <p className="entrada">Puede que no exista o que ya no esté publicado.</p>
          <div className="acciones">
            <Link className="boton boton--primario" to="/abogados">
              Ver todos los abogados
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const honorarios = rangoHonorarios(perfil.honorariosDesde, perfil.honorariosHasta)
  const datos: [string, string | null][] = [
    ['Materias', perfil.materias.map(etiquetaMateria).join(', ')],
    ['Especialidades', perfil.especialidades?.filter(Boolean).join(', ') || null],
    ['Ubicación', perfil.ubicacion],
    ['Jurisdicciones', perfil.jurisdicciones?.filter(Boolean).join(', ') || null],
    ['Modalidad de atención', etiquetaModalidad(perfil.modalidad)],
    ['Idiomas', perfil.idiomas?.filter(Boolean).join(', ') || null],
    [
      'Experiencia',
      perfil.aniosExperiencia != null ? `${perfil.aniosExperiencia} años` : null,
    ],
    ['Honorarios orientativos', honorarios],
    ['Disponibilidad', perfil.disponibilidad ?? null],
  ]

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <p className="nota">
          <Link to="/abogados">Volver a los abogados</Link>
        </p>
        <h1 className="titulo-pagina">{perfil.nombre}</h1>
        {perfil.verificadoManual && <Sello />}

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

        {perfil.semblanza && (
          <>
            <h2 className="subtitulo">Semblanza</h2>
            <p className="texto-largo">{perfil.semblanza}</p>
          </>
        )}

        <p className="aviso">
          El rango de honorarios es orientativo: el monto de tu asunto lo propone el
          abogado. Podrás solicitar su contratación cuando se active el flujo de
          contratación, en una próxima entrega.
        </p>
      </div>
    </section>
  )
}
