import { PESTANAS, pestanaActiva } from './Pestanas'

describe('pestanaActiva', () => {
  it.each([
    ['/mi-espacio', '/mi-espacio'],
    ['/mi-espacio/asuntos/abc/coincidencias', '/mi-espacio/asuntos'],
    ['/expedientes/x', '/mi-espacio/expedientes'],
    ['/contratos/x', '/mi-espacio/expedientes'],
    ['/abogados/123', '/abogados'],
    ['/privacidad', null],
  ])('cliente en %s → %s', (ruta, esperada) => {
    expect(pestanaActiva(PESTANAS.CLIENTE, ruta)).toBe(esperada)
  })
})
