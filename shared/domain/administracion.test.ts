import {
  accionesDisponibles,
  grupoDePerfil,
  planDeAccion,
  type AccionPerfil,
  type SituacionPerfil,
} from './administracion'

const pendiente: SituacionPerfil = {}
const oculto: SituacionPerfil = {
  estadoVerificacion: 'VERIFICADO_MANUAL',
  publicado: false,
}
const publicadoSinVerificar: SituacionPerfil = { publicado: true }
const publicadoVerificado: SituacionPerfil = {
  estadoVerificacion: 'VERIFICADO_MANUAL',
  publicado: true,
}
const rechazado: SituacionPerfil = { estadoVerificacion: 'RECHAZADO', publicado: false }

describe('grupoDePerfil', () => {
  it('clasifica cada situación', () => {
    expect(grupoDePerfil(pendiente)).toBe('PENDIENTE')
    expect(grupoDePerfil({ estadoVerificacion: null, publicado: null })).toBe('PENDIENTE')
    expect(grupoDePerfil(oculto)).toBe('OCULTO')
    expect(grupoDePerfil(publicadoSinVerificar)).toBe('PUBLICADO')
    expect(grupoDePerfil(publicadoVerificado)).toBe('PUBLICADO')
    expect(grupoDePerfil(rechazado)).toBe('RECHAZADO')
  })
})

describe('accionesDisponibles', () => {
  it('ofrece solo lo que tiene sentido en cada situación', () => {
    expect(accionesDisponibles(pendiente)).toEqual([
      'VERIFICAR_Y_PUBLICAR',
      'PUBLICAR',
      'RECHAZAR',
    ])
    expect(accionesDisponibles(oculto)).toEqual(['PUBLICAR', 'RECHAZAR'])
    expect(accionesDisponibles(rechazado)).toEqual(['REABRIR'])
    expect(accionesDisponibles(publicadoSinVerificar)).toContain('VERIFICAR')
    expect(accionesDisponibles(publicadoVerificado)).not.toContain('VERIFICAR')
  })

  it('un perfil publicado y rechazado a la vez solo puede ocultarse', () => {
    expect(
      accionesDisponibles({ estadoVerificacion: 'RECHAZADO', publicado: true }),
    ).toEqual(['OCULTAR'])
  })
})

describe('planDeAccion', () => {
  it('verificar y publicar deja el perfil público y verificado', () => {
    expect(planDeAccion(pendiente, 'VERIFICAR_Y_PUBLICAR')).toEqual({
      estadoVerificacion: 'VERIFICADO_MANUAL',
      publicado: true,
      copiaPublica: 'publicar',
      verificadoManual: true,
    })
  })

  it('publicar sin verificar no otorga el sello', () => {
    const plan = planDeAccion(pendiente, 'PUBLICAR')
    expect(plan).toMatchObject({
      estadoVerificacion: 'PENDIENTE',
      publicado: true,
      verificadoManual: false,
    })
  })

  it('publicar un perfil ya verificado conserva el sello', () => {
    expect(planDeAccion(oculto, 'PUBLICAR')?.verificadoManual).toBe(true)
  })

  it('ocultar y rechazar retiran la copia pública', () => {
    expect(planDeAccion(publicadoVerificado, 'OCULTAR')).toMatchObject({
      publicado: false,
      copiaPublica: 'retirar',
      estadoVerificacion: 'VERIFICADO_MANUAL',
    })
    expect(planDeAccion(publicadoVerificado, 'RECHAZAR')).toMatchObject({
      estadoVerificacion: 'RECHAZADO',
      publicado: false,
      copiaPublica: 'retirar',
      verificadoManual: false,
    })
  })

  it('reabrir un rechazado lo devuelve a pendiente sin publicarlo', () => {
    expect(planDeAccion(rechazado, 'REABRIR')).toMatchObject({
      estadoVerificacion: 'PENDIENTE',
      publicado: false,
      copiaPublica: 'ninguna',
    })
  })

  it('verificar un perfil publicado actualiza la copia con el sello', () => {
    expect(planDeAccion(publicadoSinVerificar, 'VERIFICAR')).toMatchObject({
      publicado: true,
      copiaPublica: 'publicar',
      verificadoManual: true,
    })
  })

  it('rechaza acciones que no corresponden a la situación', () => {
    const casos: [SituacionPerfil, AccionPerfil][] = [
      [rechazado, 'PUBLICAR'],
      [pendiente, 'OCULTAR'],
      [publicadoVerificado, 'REABRIR'],
      [publicadoVerificado, 'VERIFICAR'],
    ]
    for (const [situacion, accion] of casos)
      expect(planDeAccion(situacion, accion)).toBeNull()
  })

  it('ninguna acción deja a la vez un perfil publicado y sin copia pública', () => {
    const situaciones = [
      pendiente,
      oculto,
      publicadoSinVerificar,
      publicadoVerificado,
      rechazado,
    ]
    for (const situacion of situaciones) {
      for (const accion of accionesDisponibles(situacion)) {
        const plan = planDeAccion(situacion, accion)!
        if (plan.publicado) expect(plan.copiaPublica).toBe('publicar')
        else expect(plan.copiaPublica).not.toBe('publicar')
      }
    }
  })
})
