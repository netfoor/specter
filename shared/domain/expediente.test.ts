import {
  LIMITE_MENSAJE,
  etiquetaActuacion,
  fusionarPorFecha,
  validarMensaje,
} from './expediente'

describe('validarMensaje', () => {
  it('acepta texto y lo recorta', () => {
    expect(validarMensaje('  Hola  ')).toEqual({ ok: true, texto: 'Hola' })
  })

  it.each([undefined, null, 3, '', '   '])('rechaza %j', (texto) => {
    expect(validarMensaje(texto).ok).toBe(false)
  })

  it('limita la longitud', () => {
    expect(validarMensaje('x'.repeat(LIMITE_MENSAJE)).ok).toBe(true)
    expect(validarMensaje('x'.repeat(LIMITE_MENSAJE + 1)).ok).toBe(false)
  })
})

describe('fusionarPorFecha', () => {
  const m = (id: string, creadoEn: string) => ({ id, creadoEn })

  it('ordena cronológicamente y no duplica', () => {
    const resultado = fusionarPorFecha(
      [m('b', '2026-10-23T10:01:00Z'), m('a', '2026-10-23T10:00:00Z')],
      [m('b', '2026-10-23T10:01:00Z'), m('c', '2026-10-23T10:02:00Z')],
    )
    expect(resultado.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('con la misma fecha desempata por id para un orden estable', () => {
    const resultado = fusionarPorFecha([m('z', 'T'), m('y', 'T')], [])
    expect(resultado.map((x) => x.id)).toEqual(['y', 'z'])
  })
})

it('etiqueta las actuaciones conocidas y deja las demás como vienen', () => {
  expect(etiquetaActuacion('CONTRATACION')).toBe('Contratación')
  expect(etiquetaActuacion('OTRA')).toBe('OTRA')
})
