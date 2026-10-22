import { estadoVerificacionDe } from './catalogos'

describe('estadoVerificacionDe', () => {
  it('nadie queda verificado por omisión', () => {
    expect(estadoVerificacionDe(undefined)).toBe('PENDIENTE')
    expect(estadoVerificacionDe(null)).toBe('PENDIENTE')
    expect(estadoVerificacionDe('cualquier cosa')).toBe('PENDIENTE')
  })

  it('respeta los estados válidos', () => {
    expect(estadoVerificacionDe('VERIFICADO_MANUAL')).toBe('VERIFICADO_MANUAL')
    expect(estadoVerificacionDe('RECHAZADO')).toBe('RECHAZADO')
  })
})
