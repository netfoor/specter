import type { Schema } from '../../../amplify/data/resource'
import { datosComoUsuario } from '../../app/datos'
import { planDeAccion, type AccionPerfil } from '../../../shared/domain/administracion'
import { MATERIAS, MODALIDADES } from '../../../shared/domain/catalogos'
import { aPerfilPublico, type PerfilCompleto } from '../../../shared/domain/perfil'

export type PerfilAbogado = Schema['PerfilAbogado']['type']

const sinNulos = (lista: readonly (string | null)[] | null | undefined): string[] =>
  (lista ?? []).filter((x): x is string => x != null)

function aPerfilCompleto(p: PerfilAbogado): PerfilCompleto {
  return {
    nombre: p.nombre,
    fotoUrl: p.fotoUrl,
    materias: MATERIAS.filter((m) => p.materias.includes(m)),
    especialidades: sinNulos(p.especialidades),
    ubicacion: p.ubicacion,
    jurisdicciones: sinNulos(p.jurisdicciones),
    idiomas: sinNulos(p.idiomas),
    aniosExperiencia: p.aniosExperiencia ?? null,
    modalidad: MODALIDADES.find((m) => m === p.modalidad) ?? 'AMBAS',
    honorariosDesde: p.honorariosDesde ?? null,
    honorariosHasta: p.honorariosHasta ?? null,
    disponibilidad: p.disponibilidad ?? null,
    semblanza: p.semblanza ?? null,
  }
}

function verificar(respuesta: { errors?: readonly unknown[] }) {
  if (respuesta.errors?.length) throw new Error('El servicio rechazó el cambio')
}

async function publicarCopia(perfil: PerfilAbogado, verificadoManual: boolean) {
  const { PerfilPublico } = datosComoUsuario().models
  const copia = {
    id: perfil.id,
    ...aPerfilPublico(aPerfilCompleto(perfil), verificadoManual),
  }
  const existente = await PerfilPublico.get({ id: perfil.id })
  verificar(existente)
  verificar(
    existente.data
      ? await PerfilPublico.update(copia)
      : await PerfilPublico.create(copia),
  )
}

async function retirarCopia(id: string) {
  verificar(await datosComoUsuario().models.PerfilPublico.delete({ id }))
}

/**
 * Aplica una acción del panel. La copia pública se cambia antes que el perfil: es lo que
 * expone al abogado, así que nunca debe quedar visible algo marcado como oculto.
 */
export async function aplicarAccion(perfil: PerfilAbogado, accion: AccionPerfil) {
  const plan = planDeAccion(perfil, accion)
  if (!plan) throw new Error('Acción no permitida para este perfil')

  if (plan.copiaPublica === 'publicar') await publicarCopia(perfil, plan.verificadoManual)
  if (plan.copiaPublica === 'retirar') await retirarCopia(perfil.id)

  verificar(
    await datosComoUsuario().models.PerfilAbogado.update({
      id: perfil.id,
      estadoVerificacion: plan.estadoVerificacion,
      publicado: plan.publicado,
    }),
  )
}
