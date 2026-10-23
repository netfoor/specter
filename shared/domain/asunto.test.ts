import {
  asuntoEditable,
  estadoDeAsunto,
  etapaDe,
  validarAsunto,
  type FormularioAsunto,
} from './asunto'

describe('estadoDeAsunto', () => {
  it('distingue borrador y abierto antes de contratar', () => {
    expect(estadoDeAsunto({ abierto: false, etapa: 'SIN_CONTRATAR' })).toBe('BORRADOR')
    expect(estadoDeAsunto({ abierto: true, etapa: 'SIN_CONTRATAR' })).toBe('ABIERTO')
  })

  it('la etapa contratada o concluida manda sobre el indicador abierto', () => {
    expect(estadoDeAsunto({ abierto: true, etapa: 'CONTRATADO' })).toBe('CONTRATADO')
    expect(estadoDeAsunto({ abierto: false, etapa: 'CONCLUIDO' })).toBe('CONCLUIDO')
  })
})

describe('etapaDe', () => {
  it('interpreta vacío o desconocido como sin contratar', () => {
    expect(etapaDe(undefined)).toBe('SIN_CONTRATAR')
    expect(etapaDe(null)).toBe('SIN_CONTRATAR')
    expect(etapaDe('OTRA_COSA')).toBe('SIN_CONTRATAR')
    expect(etapaDe('CONTRATADO')).toBe('CONTRATADO')
  })

  it('un asunto sin datos es un borrador', () => {
    expect(estadoDeAsunto({})).toBe('BORRADOR')
  })
})

const formulario = (cambios: Partial<FormularioAsunto> = {}): FormularioAsunto => ({
  titulo: 'Contrato de arrendamiento',
  descripcion: 'Mi arrendador quiere subir la renta antes de que termine el contrato.',
  materia: 'CIVIL',
  ubicacion: 'Puebla',
  modalidad: 'AMBAS',
  presupuestoMin: '3,000',
  presupuestoMax: '10000',
  ...cambios,
})

describe('validarAsunto', () => {
  it('acepta un formulario completo y normaliza los datos', () => {
    const res = validarAsunto(formulario({ titulo: '  Contrato de arrendamiento  ' }))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.datos).toMatchObject({
      titulo: 'Contrato de arrendamiento',
      materia: 'CIVIL',
      modalidad: 'AMBAS',
      presupuestoMin: 3000,
      presupuestoMax: 10000,
    })
  })

  it('el presupuesto es opcional', () => {
    const res = validarAsunto(formulario({ presupuestoMin: '', presupuestoMax: '' }))
    expect(res.ok && res.datos.presupuestoMin).toBeNull()
    expect(res.ok && res.datos.presupuestoMax).toBeNull()
  })

  it('pide título, descripción, materia, ciudad y modalidad', () => {
    const res = validarAsunto(
      formulario({
        titulo: 'Hi',
        descripcion: 'corto',
        materia: '',
        ubicacion: ' ',
        modalidad: '',
      }),
    )
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(Object.keys(res.errores).sort()).toEqual([
      'descripcion',
      'materia',
      'modalidad',
      'titulo',
      'ubicacion',
    ])
  })

  it('aplica los límites de longitud', () => {
    expect(validarAsunto(formulario({ titulo: 'x'.repeat(121) })).ok).toBe(false)
    expect(validarAsunto(formulario({ descripcion: 'x'.repeat(3001) })).ok).toBe(false)
  })

  it('descarta materias fuera del catálogo', () => {
    expect(validarAsunto(formulario({ materia: 'INVENTADA' })).ok).toBe(false)
  })

  it('valida el presupuesto', () => {
    expect(validarAsunto(formulario({ presupuestoMin: 'poco' })).ok).toBe(false)
    expect(validarAsunto(formulario({ presupuestoMax: '-1' })).ok).toBe(false)
    const invertido = validarAsunto(
      formulario({ presupuestoMin: '9000', presupuestoMax: '1000' }),
    )
    expect(invertido.ok).toBe(false)
    if (!invertido.ok) expect(invertido.errores.presupuestoMax).toMatch(/menor/)
  })
})

describe('asuntoEditable', () => {
  it('solo se edita antes de contratar', () => {
    expect(asuntoEditable({})).toBe(true)
    expect(asuntoEditable({ etapa: 'SIN_CONTRATAR' })).toBe(true)
    expect(asuntoEditable({ etapa: 'CONTRATADO' })).toBe(false)
    expect(asuntoEditable({ etapa: 'CONCLUIDO' })).toBe(false)
  })
})
