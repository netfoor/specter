import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import type { Schema } from '../../../amplify/data/resource'
import { datosComoUsuario } from '../../app/datos'
import { backendConfigurado } from '../../app/amplify'
import { useConsulta } from '../../app/useConsulta'
import { Campo } from '../../ui/Campo'
import { useSesion } from '../auth/useSesion'
import {
  MATERIAS,
  MODALIDADES,
  estadoVerificacionDe,
} from '../../../shared/domain/catalogos'
import {
  MAX_SEMBLANZA,
  validarPerfil,
  type ErroresPerfil,
  type FormularioPerfil,
} from '../../../shared/domain/perfil'
import { Aviso } from './Directorio'
import { etiquetaMateria, etiquetaModalidad } from './formato'

type Perfil = Schema['PerfilAbogado']['type']

const texto = (valor: string | number | null | undefined) =>
  valor == null ? '' : String(valor)
const lista = (valor: readonly (string | null)[] | null | undefined) =>
  (valor ?? []).filter(Boolean).join(', ')

function aFormulario(p: Perfil | null, nombre: string): FormularioPerfil {
  return {
    nombre: p?.nombre ?? nombre,
    materias: (p?.materias ?? []).filter((m): m is NonNullable<typeof m> => m != null),
    especialidades: lista(p?.especialidades),
    ubicacion: texto(p?.ubicacion),
    jurisdicciones: lista(p?.jurisdicciones),
    idiomas: lista(p?.idiomas),
    aniosExperiencia: texto(p?.aniosExperiencia),
    modalidad: texto(p?.modalidad),
    honorariosDesde: texto(p?.honorariosDesde),
    honorariosHasta: texto(p?.honorariosHasta),
    disponibilidad: texto(p?.disponibilidad),
    semblanza: texto(p?.semblanza),
    cedula: texto(p?.cedula),
  }
}

function describirEstado(p: Perfil | null): string {
  if (!p) return 'Aún no tienes perfil. Complétalo y guárdalo para enviarlo a revisión.'
  const verificacion = estadoVerificacionDe(p.estadoVerificacion)
  if (verificacion === 'RECHAZADO') {
    return 'Tu perfil no pasó la revisión. Corrige tus datos y contacta al equipo de Specter.'
  }
  if (p.publicado) {
    return verificacion === 'VERIFICADO_MANUAL'
      ? 'Tu perfil es público y está verificado manualmente.'
      : 'Tu perfil es público.'
  }
  return 'Tu perfil está pendiente de revisión. Aparecerá en el directorio cuando un administrador lo publique.'
}

export function EditarPerfil() {
  const sesion = useSesion()

  if (!backendConfigurado) {
    return (
      <Aviso titulo="Tu perfil no está disponible aquí">
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
  if (sesion.rol !== 'ABOGADO') {
    return (
      <Aviso titulo="Esta sección es para abogados">
        Tu cuenta no es de abogado, por eso no tiene perfil profesional.
      </Aviso>
    )
  }
  return <CargarPerfil nombre={sesion.nombre} />
}

function CargarPerfil({ nombre }: { nombre: string }) {
  const consulta = useConsulta('mio', async () => {
    const { data, errors } = await datosComoUsuario().models.PerfilAbogado.list()
    if (errors?.length) throw new Error('consulta fallida')
    return data[0] ?? null
  })

  if (consulta.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Cargando tu perfil…</p>
        </div>
      </section>
    )
  }
  if (consulta.estado === 'error') {
    return (
      <Aviso titulo="No pudimos cargar tu perfil">
        Recarga la página o vuelve más tarde.
      </Aviso>
    )
  }
  return <Formulario inicial={consulta.datos} nombre={nombre} />
}

function Formulario({ inicial, nombre }: { inicial: Perfil | null; nombre: string }) {
  const [perfil, setPerfil] = useState<Perfil | null>(inicial)
  const [form, setForm] = useState(() => aFormulario(inicial, nombre))
  const [errores, setErrores] = useState<ErroresPerfil>({})
  const [guardado, setGuardado] = useState<'inactivo' | 'guardando' | 'listo' | 'error'>(
    'inactivo',
  )

  const cambiar = <K extends keyof FormularioPerfil>(
    campo: K,
    valor: FormularioPerfil[K],
  ) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setGuardado('inactivo')
  }

  const alternarMateria = (materia: string) =>
    cambiar(
      'materias',
      form.materias.includes(materia)
        ? form.materias.filter((m) => m !== materia)
        : [...form.materias, materia],
    )

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    const validacion = validarPerfil(form)
    if (!validacion.ok) {
      setErrores(validacion.errores)
      setGuardado('inactivo')
      return
    }
    setErrores({})
    setGuardado('guardando')
    try {
      const modelo = datosComoUsuario().models.PerfilAbogado
      const respuesta = perfil
        ? await modelo.update({ id: perfil.id, ...validacion.datos })
        : await modelo.create(validacion.datos)
      if (respuesta.errors?.length || !respuesta.data) throw new Error('no se guardó')
      setPerfil(respuesta.data)
      setGuardado('listo')
    } catch {
      setGuardado('error')
    }
  }

  const campoProps = (id: keyof FormularioPerfil) => ({
    id: `p-${id}`,
    'aria-invalid': errores[id] ? true : undefined,
    'aria-describedby': errores[id] ? `p-${id}-error` : undefined,
  })

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">Mi perfil profesional</h1>
        <p className="aviso" role="status">
          {describirEstado(perfil)}
        </p>
        {perfil?.publicado && (
          <p className="nota">
            Los cambios que guardes llegan al directorio cuando un administrador vuelva a
            publicarlos.
          </p>
        )}

        <form className="formulario" onSubmit={guardar} noValidate>
          {Object.keys(errores).length > 0 && (
            <p className="campo__error" role="alert">
              Revisa los campos marcados antes de guardar.
            </p>
          )}

          <Campo id="p-nombre" etiqueta="Nombre completo" error={errores.nombre}>
            <input
              {...campoProps('nombre')}
              value={form.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
              autoComplete="name"
            />
          </Campo>

          <fieldset className="campo grupo">
            <legend>Materias en las que ejerces</legend>
            {MATERIAS.map((m) => (
              <label key={m} className="opcion">
                <input
                  type="checkbox"
                  checked={form.materias.includes(m)}
                  onChange={() => alternarMateria(m)}
                />
                {etiquetaMateria(m)}
              </label>
            ))}
            {errores.materias && (
              <p className="campo__error" role="alert">
                {errores.materias}
              </p>
            )}
          </fieldset>

          <Campo
            id="p-especialidades"
            etiqueta="Especialidades"
            ayuda="Sepáralas con comas. Por ejemplo: arrendamiento, divorcios."
          >
            <textarea
              {...campoProps('especialidades')}
              rows={2}
              value={form.especialidades}
              onChange={(e) => cambiar('especialidades', e.target.value)}
            />
          </Campo>

          <Campo
            id="p-ubicacion"
            etiqueta="Ciudad donde ejerces"
            error={errores.ubicacion}
          >
            <input
              {...campoProps('ubicacion')}
              value={form.ubicacion}
              onChange={(e) => cambiar('ubicacion', e.target.value)}
            />
          </Campo>

          <Campo
            id="p-jurisdicciones"
            etiqueta="Jurisdicciones"
            ayuda="Estados o fueros donde litigas, separados por comas."
          >
            <input
              {...campoProps('jurisdicciones')}
              value={form.jurisdicciones}
              onChange={(e) => cambiar('jurisdicciones', e.target.value)}
            />
          </Campo>

          <Campo
            id="p-modalidad"
            etiqueta="Modalidad de atención"
            error={errores.modalidad}
          >
            <select
              {...campoProps('modalidad')}
              value={form.modalidad}
              onChange={(e) => cambiar('modalidad', e.target.value)}
            >
              <option value="">Elige una opción</option>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>
                  {etiquetaModalidad(m)}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="p-idiomas" etiqueta="Idiomas" ayuda="Separados por comas.">
            <input
              {...campoProps('idiomas')}
              value={form.idiomas}
              onChange={(e) => cambiar('idiomas', e.target.value)}
            />
          </Campo>

          <Campo
            id="p-aniosExperiencia"
            etiqueta="Años de experiencia"
            error={errores.aniosExperiencia}
          >
            <input
              {...campoProps('aniosExperiencia')}
              inputMode="numeric"
              value={form.aniosExperiencia}
              onChange={(e) => cambiar('aniosExperiencia', e.target.value)}
            />
          </Campo>

          <div className="par">
            <Campo
              id="p-honorariosDesde"
              etiqueta="Honorarios desde (MXN)"
              error={errores.honorariosDesde}
            >
              <input
                {...campoProps('honorariosDesde')}
                inputMode="decimal"
                value={form.honorariosDesde}
                onChange={(e) => cambiar('honorariosDesde', e.target.value)}
              />
            </Campo>
            <Campo
              id="p-honorariosHasta"
              etiqueta="Honorarios hasta (MXN)"
              error={errores.honorariosHasta}
            >
              <input
                {...campoProps('honorariosHasta')}
                inputMode="decimal"
                value={form.honorariosHasta}
                onChange={(e) => cambiar('honorariosHasta', e.target.value)}
              />
            </Campo>
          </div>

          <Campo id="p-disponibilidad" etiqueta="Disponibilidad">
            <input
              {...campoProps('disponibilidad')}
              value={form.disponibilidad}
              onChange={(e) => cambiar('disponibilidad', e.target.value)}
            />
          </Campo>

          <Campo
            id="p-semblanza"
            etiqueta="Semblanza"
            ayuda={`Cuéntale al cliente tu trayectoria. ${form.semblanza.length} de ${MAX_SEMBLANZA} caracteres.`}
            error={errores.semblanza}
          >
            <textarea
              {...campoProps('semblanza')}
              rows={6}
              value={form.semblanza}
              onChange={(e) => cambiar('semblanza', e.target.value)}
            />
          </Campo>

          <Campo
            id="p-cedula"
            etiqueta="Número de cédula profesional"
            ayuda="Solo la ve el equipo de Specter al revisar tu perfil. No se publica."
            error={errores.cedula}
          >
            <input
              {...campoProps('cedula')}
              value={form.cedula}
              onChange={(e) => cambiar('cedula', e.target.value)}
            />
          </Campo>

          <div className="acciones">
            <button
              className="boton boton--primario"
              type="submit"
              disabled={guardado === 'guardando'}
            >
              {guardado === 'guardando' ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </div>
          {guardado === 'listo' && (
            <p role="status" className="nota">
              Perfil guardado.
            </p>
          )}
          {guardado === 'error' && (
            <p role="alert" className="campo__error">
              No pudimos guardar tu perfil. Revisa tu conexión e inténtalo de nuevo.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
