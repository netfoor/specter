import {
  LEYENDA_DEMO,
  aceptadoPorAlguien,
  aceptadoPorAmbos,
  calcularDesglose,
  textoDeContrato,
} from './contrato'

describe('calcularDesglose', () => {
  it('10,000 de honorarios: 1,000 de comisión y 9,000 para el abogado', () => {
    expect(calcularDesglose(10000)).toEqual({
      honorarios: 10000,
      comision: 1000,
      abogadoRecibe: 9000,
      totalCliente: 10000,
    })
  })

  it('redondea a centavos y la suma siempre cuadra', () => {
    for (const monto of [12345.67, 0.05, 999.99, 3333.33, 1]) {
      const d = calcularDesglose(monto)
      expect(Math.round((d.comision + d.abogadoRecibe) * 100) / 100).toBe(d.honorarios)
      expect(Number.isInteger(Math.round(d.comision * 100))).toBe(true)
    }
    expect(calcularDesglose(12345.67)).toMatchObject({
      comision: 1234.57,
      abogadoRecibe: 11111.1,
    })
  })

  it('el cliente paga los honorarios: la comisión no se suma', () => {
    expect(calcularDesglose(5000).totalCliente).toBe(5000)
  })

  it.each([0, -1, Number.NaN, Infinity])('rechaza %s', (monto) => {
    expect(() => calcularDesglose(monto)).toThrow()
  })
})

describe('textoDeContrato', () => {
  const texto = textoDeContrato({
    fecha: new Date('2026-10-23T18:00:00Z'),
    cliente: 'Cliente Demo',
    abogado: 'Elena Rivas Cordero',
    asunto: {
      titulo: 'Aumento de renta',
      materia: 'CIVIL',
      descripcion: 'Mi arrendador quiere subir la renta.',
    },
    alcance: 'Revisión del contrato y negociación.',
    formaDePago: 'Mitad al inicio y mitad al terminar.',
    desglose: calcularDesglose(12500),
  })

  it('incluye la leyenda de demostración y a ambas partes', () => {
    expect(texto).toContain(LEYENDA_DEMO)
    expect(texto).toContain('Cliente Demo')
    expect(texto).toContain('Elena Rivas Cordero')
  })

  it('incluye el objeto, el alcance, la forma de pago y el desglose', () => {
    expect(texto).toContain('«Aumento de renta», de materia civil')
    expect(texto).toContain('Revisión del contrato y negociación.')
    expect(texto).toContain('Mitad al inicio y mitad al terminar.')
    expect(texto).toContain('$12,500.00')
    expect(texto).toContain('$1,250.00')
    expect(texto).toContain('$11,250.00')
    expect(texto).toContain('no se cobra ni se mueve dinero')
  })

  it('usa la fecha de la Ciudad de México y no deja huecos', () => {
    expect(texto).toContain('23 de octubre de 2026')
    expect(texto).not.toMatch(/undefined|null|NaN/)
  })
})

describe('estado de aceptación', () => {
  it('distingue sin aceptar, una parte y ambas', () => {
    expect(aceptadoPorAlguien({})).toBe(false)
    expect(aceptadoPorAlguien({ aceptadoCliente: '2026-10-23' })).toBe(true)
    expect(aceptadoPorAmbos({ aceptadoCliente: '2026-10-23' })).toBe(false)
    expect(aceptadoPorAmbos({ aceptadoCliente: 'x', aceptadoAbogado: 'y' })).toBe(true)
  })
})
