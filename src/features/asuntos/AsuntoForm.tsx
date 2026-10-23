import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Schema } from '../../../amplify/data/resource'
import { datosComoUsuario } from '../../app/datos'
import { Campo } from '../../ui/Campo'
import { MATERIAS, MODALIDADES } from '../../../shared/domain/catalogos'
import {
  LIMITES_ASUNTO,
  estadoDeAsunto,
  validarAsunto,
  type ErroresAsunto,
  type FormularioAsunto,
} from '../../../shared/domain/asunto'
import { etiquetaMateria } from '../perfiles/formato'
import { etiquetaModalidadAsunto } from './formato'

type Asunto = Schema['Asunto']['type']

const texto = (valor: string | number | null | undefined) =>
  valor == null ? '' : String(valor)

function aFormulario(a?: Asunto): FormularioAsunto {
  return {
    titulo: texto(a?.titulo),
    descripcion: texto(a?.descripcion),
    materia: texto(a?.materia),
    ubicacion: texto(a?.ubicacion),
    modalidad: texto(a?.modalidad),
    presupuestoMin: texto(a?.presupuestoMin),
    presupuestoMax: texto(a?.presupuestoMax),
  }
}

/** Formulario para describir un asunto nuevo o editar uno existente. */
export function AsuntoForm({ asunto }: { asunto?: Asunto }) {
  const navegar = useNavigate()
  const [form, setForm] = useState(() => aFormulario(asunto))
  const [errores, setErrores] = useState<ErroresAsunto>({})
  const [estado, setEstado] = useState<'inactivo' | 'guardando' | 'error'>('inactivo')

  const abierto = asunto ? estadoDeAsunto(asunto) === 'ABIERTO' : false

  const cambiar = <K extends keyof FormularioAsunto>(campo: K, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setEstado('inactivo')
  }

  async function guardar(publicar: boolean, evento?: FormEvent) {
    evento?.preventDefault()
    const validacion = validarAsunto(form)
    if (!validacion.ok) {
      setErrores(validacion.errores)
      return
    }
    setErrores({})
    setEstado('guardando')
    try {
      const modelo = datosComoUsuario().models.Asunto
      const respuesta = asunto
        ? await modelo.update({ id: asunto.id, ...validacion.datos, abierto: publicar })
        : await modelo.create({ ...validacion.datos, abierto: publicar })
      if (respuesta.errors?.length || !respuesta.data) throw new Error('no se guardó')
      navegar(`/mi-espacio/asuntos/${respuesta.data.id}`)
    } catch {
      setEstado('error')
    }
  }

  const props = (id: keyof FormularioAsunto) => ({
    id: `a-${id}`,
    'aria-invalid': errores[id] ? true : undefined,
    'aria-describedby': errores[id] ? `a-${id}-error` : undefined,
  })

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">
          {asunto ? 'Editar asunto' : 'Describe tu asunto'}
        </h1>
        <p className="entrada">
          ¿Qué problema legal necesitas resolver? Cuéntalo con tus palabras; no necesitas
          usar términos jurídicos.
        </p>
        <p className="nota">
          En esta demostración no escribas datos reales tuyos ni de otras personas.
        </p>

        <form className="formulario" onSubmit={(e) => guardar(abierto, e)} noValidate>
          {Object.keys(errores).length > 0 && (
            <p className="campo__error" role="alert">
              Revisa los campos marcados antes de guardar.
            </p>
          )}

          <Campo
            id="a-titulo"
            etiqueta="Título"
            ayuda="Resume tu asunto en una frase. Por ejemplo: «Mi arrendador quiere subir la renta»."
            error={errores.titulo}
          >
            <input
              {...props('titulo')}
              value={form.titulo}
              onChange={(e) => cambiar('titulo', e.target.value)}
            />
          </Campo>

          <Campo
            id="a-descripcion"
            etiqueta="¿Qué pasó?"
            ayuda={`Cuenta qué ocurrió, desde cuándo, qué quieres lograr y si hay fechas límite. No incluyas contraseñas ni datos bancarios. ${form.descripcion.length} de ${LIMITES_ASUNTO.descripcionMax} caracteres.`}
            error={errores.descripcion}
          >
            <textarea
              {...props('descripcion')}
              rows={8}
              value={form.descripcion}
              onChange={(e) => cambiar('descripcion', e.target.value)}
            />
          </Campo>

          <Campo
            id="a-materia"
            etiqueta="Materia"
            ayuda="Elige la que más se parezca. Si no estás seguro, elige «Otra»: el abogado te ayudará a precisarla."
            error={errores.materia}
          >
            <select
              {...props('materia')}
              value={form.materia}
              onChange={(e) => cambiar('materia', e.target.value)}
            >
              <option value="">Elige una opción</option>
              {MATERIAS.map((m) => (
                <option key={m} value={m}>
                  {m === 'OTRA' ? 'Otra o no estoy seguro' : etiquetaMateria(m)}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="a-ubicacion"
            etiqueta="Ciudad donde necesitas el servicio"
            error={errores.ubicacion}
          >
            <input
              {...props('ubicacion')}
              value={form.ubicacion}
              onChange={(e) => cambiar('ubicacion', e.target.value)}
            />
          </Campo>

          <Campo
            id="a-modalidad"
            etiqueta="¿Cómo prefieres que te atiendan?"
            error={errores.modalidad}
          >
            <select
              {...props('modalidad')}
              value={form.modalidad}
              onChange={(e) => cambiar('modalidad', e.target.value)}
            >
              <option value="">Elige una opción</option>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>
                  {etiquetaModalidadAsunto(m)}
                </option>
              ))}
            </select>
          </Campo>

          <div className="par">
            <Campo
              id="a-presupuestoMin"
              etiqueta="Presupuesto desde (MXN)"
              ayuda="Opcional."
              error={errores.presupuestoMin}
            >
              <input
                {...props('presupuestoMin')}
                inputMode="decimal"
                value={form.presupuestoMin}
                onChange={(e) => cambiar('presupuestoMin', e.target.value)}
              />
            </Campo>
            <Campo
              id="a-presupuestoMax"
              etiqueta="Presupuesto hasta (MXN)"
              ayuda="Opcional."
              error={errores.presupuestoMax}
            >
              <input
                {...props('presupuestoMax')}
                inputMode="decimal"
                value={form.presupuestoMax}
                onChange={(e) => cambiar('presupuestoMax', e.target.value)}
              />
            </Campo>
          </div>

          <div className="acciones">
            {asunto && abierto ? (
              <button
                className="boton boton--primario"
                type="submit"
                disabled={estado === 'guardando'}
              >
                Guardar cambios
              </button>
            ) : (
              <>
                <button
                  className="boton boton--primario"
                  type="button"
                  disabled={estado === 'guardando'}
                  onClick={() => void guardar(true)}
                >
                  Guardar y publicar
                </button>
                <button
                  className="boton boton--secundario"
                  type="submit"
                  disabled={estado === 'guardando'}
                >
                  Guardar borrador
                </button>
              </>
            )}
          </div>
          <p className="nota">
            Publicar tu asunto permite que te mostremos abogados compatibles. Ningún
            abogado ve tu asunto hasta que tú le envíes una solicitud.
          </p>
          {estado === 'error' && (
            <p role="alert" className="campo__error">
              No pudimos guardar tu asunto. Revisa tu conexión e inténtalo de nuevo.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
