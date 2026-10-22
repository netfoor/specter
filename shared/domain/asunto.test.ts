import { estadoDeAsunto, etapaDe } from './asunto'

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
