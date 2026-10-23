import { aPerfilPublico } from '../../shared/domain/perfil'
import { MATERIAS } from '../../shared/domain/catalogos'
import { validarPerfil } from '../../shared/domain/perfil'
import { ABOGADOS_DEMO, CUENTAS_DEMO, DOMINIO_DEMO } from './datos'

describe('datos de demostración', () => {
  it('son 12 abogados con identificadores y correos únicos', () => {
    expect(ABOGADOS_DEMO).toHaveLength(12)
    expect(new Set(ABOGADOS_DEMO.map((a) => a.id)).size).toBe(12)
    expect(new Set(ABOGADOS_DEMO.map((a) => a.correo)).size).toBe(12)
    expect(new Set(ABOGADOS_DEMO.map((a) => a.formulario.nombre)).size).toBe(12)
  })

  it('todos los perfiles pasan la validación del formulario', () => {
    for (const abogado of ABOGADOS_DEMO) {
      const resultado = validarPerfil(abogado.formulario)
      expect(resultado.ok, abogado.formulario.nombre).toBe(true)
    }
  })

  it('usan solo correos del subdominio sin buzones y cédulas marcadas como demo', () => {
    const correos = [
      ...ABOGADOS_DEMO.map((a) => a.correo),
      ...Object.values(CUENTAS_DEMO).map((c) => c.correo),
    ]
    for (const correo of correos) expect(correo.endsWith(`@${DOMINIO_DEMO}`)).toBe(true)
    for (const a of ABOGADOS_DEMO) expect(a.formulario.cedula).toMatch(/^DEMO-\d+$/)
  })

  it('cubren todas las materias del catálogo', () => {
    const cubiertas = new Set(ABOGADOS_DEMO.flatMap((a) => a.formulario.materias))
    for (const materia of MATERIAS.filter((m) => m !== 'OTRA'))
      expect(cubiertas.has(materia)).toBe(true)
  })

  it('dejan perfiles de cada situación para probar el panel', () => {
    const cuenta = (s: string) => ABOGADOS_DEMO.filter((a) => a.situacion === s).length
    expect(cuenta('verificado')).toBe(8)
    expect(cuenta('publicado')).toBe(2)
    expect(cuenta('pendiente')).toBe(2)
  })

  it('la copia pública de cada perfil no lleva la cédula', () => {
    for (const abogado of ABOGADOS_DEMO) {
      const resultado = validarPerfil(abogado.formulario)
      if (!resultado.ok) throw new Error('perfil inválido')
      const copia = aPerfilPublico(resultado.datos, true)
      expect(JSON.stringify(copia)).not.toContain(abogado.formulario.cedula)
    }
  })
})
