import {
  MAX_SOLICITUDES_ACTIVAS,
  asuntoDisponible,
  codigoDeErrores,
  quitarLector,
  transicion,
  validarPropuesta,
  verificarEnvio,
  type AccionSolicitud,
  type AsuntoDelFlujo,
} from './flujo'

const CLIENTE = 'sub-c::sub-c'
const ABOGADO = 'sub-a::sub-a'
const abierto = (cambios: Partial<AsuntoDelFlujo> = {}): AsuntoDelFlujo => ({
  owner: CLIENTE,
  abierto: true,
  etapa: null,
  lectores: [],
  ...cambios,
})

describe('verificarEnvio', () => {
  it('permite enviar un asunto abierto propio a un abogado nuevo', () => {
    expect(verificarEnvio(abierto(), CLIENTE, ABOGADO)).toBeNull()
  })

  it('trata un asunto ajeno o inexistente como no encontrado', () => {
    expect(verificarEnvio(null, CLIENTE, ABOGADO)).toBe('NO_ENCONTRADO')
    expect(verificarEnvio(abierto({ owner: 'otra::otra' }), CLIENTE, ABOGADO)).toBe(
      'NO_ENCONTRADO',
    )
  })

  it('no encuentra a un abogado sin perfil publicado', () => {
    expect(verificarEnvio(abierto(), CLIENTE, null)).toBe('NO_ENCONTRADO')
  })

  it('no permite enviarse una solicitud a sí mismo', () => {
    expect(verificarEnvio(abierto(), CLIENTE, CLIENTE)).toBe('NO_PERMITIDO')
  })

  it('exige que el asunto esté abierto y sin contratar', () => {
    expect(verificarEnvio(abierto({ abierto: false }), CLIENTE, ABOGADO)).toBe(
      'ASUNTO_NO_DISPONIBLE',
    )
    expect(verificarEnvio(abierto({ etapa: 'CONTRATADO' }), CLIENTE, ABOGADO)).toBe(
      'ASUNTO_NO_DISPONIBLE',
    )
  })

  it('no permite una segunda solicitud activa al mismo abogado', () => {
    expect(verificarEnvio(abierto({ lectores: [ABOGADO] }), CLIENTE, ABOGADO)).toBe(
      'SOLICITUD_DUPLICADA',
    )
  })

  it(`limita a ${MAX_SOLICITUDES_ACTIVAS} solicitudes activas`, () => {
    const lleno = abierto({ lectores: ['a::a', 'b::b', 'c::c'] })
    expect(verificarEnvio(lleno, CLIENTE, ABOGADO)).toBe('LIMITE_SOLICITUDES')
    const casi = abierto({ lectores: ['a::a', 'b::b'] })
    expect(verificarEnvio(casi, CLIENTE, ABOGADO)).toBeNull()
  })

  it('ignora entradas vacías en lectores', () => {
    expect(
      verificarEnvio(abierto({ lectores: [null, undefined, 'a::a'] }), CLIENTE, ABOGADO),
    ).toBeNull()
  })
})

describe('asuntoDisponible', () => {
  it('solo un asunto abierto y sin contratar', () => {
    expect(asuntoDisponible(abierto())).toBe(true)
    expect(asuntoDisponible(abierto({ abierto: false }))).toBe(false)
    expect(asuntoDisponible(abierto({ etapa: 'CONTRATADO' }))).toBe(false)
  })
})

describe('transicion', () => {
  const solicitud = (estado: string) => ({
    clienteId: CLIENTE,
    abogadoId: ABOGADO,
    estado,
  })

  it.each([
    ['ENVIADA', 'ACEPTAR', ABOGADO, 'ACEPTADA', false],
    ['ENVIADA', 'RECHAZAR', ABOGADO, 'RECHAZADA', true],
    ['ENVIADA', 'RETIRAR', CLIENTE, 'RETIRADA', true],
    ['ACEPTADA', 'RETIRAR', CLIENTE, 'RETIRADA', true],
  ] as const)(
    '%s + %s por quien corresponde → %s',
    (desde, accion, quien, hacia, libera) => {
      expect(transicion(solicitud(desde), accion, quien)).toEqual({
        ok: true,
        desde,
        hacia,
        liberaLector: libera,
      })
    },
  )

  it('el abogado no puede rechazar una solicitud ya aceptada', () => {
    expect(transicion(solicitud('ACEPTADA'), 'RECHAZAR', ABOGADO)).toEqual({
      ok: false,
      codigo: 'ESTADO_INVALIDO',
    })
  })

  it('cada acción solo la hace su actor', () => {
    expect(transicion(solicitud('ENVIADA'), 'ACEPTAR', CLIENTE)).toEqual({
      ok: false,
      codigo: 'NO_PERMITIDO',
    })
    expect(transicion(solicitud('ENVIADA'), 'RECHAZAR', CLIENTE)).toEqual({
      ok: false,
      codigo: 'NO_PERMITIDO',
    })
    expect(transicion(solicitud('ENVIADA'), 'RETIRAR', ABOGADO)).toEqual({
      ok: false,
      codigo: 'NO_PERMITIDO',
    })
  })

  it('una persona ajena ni siquiera ve la solicitud', () => {
    for (const accion of ['ACEPTAR', 'RECHAZAR', 'RETIRAR'] as AccionSolicitud[]) {
      expect(transicion(solicitud('ENVIADA'), accion, 'otra::otra')).toEqual({
        ok: false,
        codigo: 'NO_ENCONTRADO',
      })
    }
  })

  it('los estados finales no admiten ninguna acción', () => {
    for (const final of ['RECHAZADA', 'RETIRADA']) {
      expect(transicion(solicitud(final), 'ACEPTAR', ABOGADO).ok).toBe(false)
      expect(transicion(solicitud(final), 'RECHAZAR', ABOGADO).ok).toBe(false)
      expect(transicion(solicitud(final), 'RETIRAR', CLIENTE).ok).toBe(false)
    }
  })

  it('aceptar dos veces no es posible', () => {
    expect(transicion(solicitud('ACEPTADA'), 'ACEPTAR', ABOGADO)).toEqual({
      ok: false,
      codigo: 'ESTADO_INVALIDO',
    })
  })

  it('rechaza estados desconocidos', () => {
    expect(transicion(solicitud('INVENTADO'), 'RETIRAR', CLIENTE)).toEqual({
      ok: false,
      codigo: 'ESTADO_INVALIDO',
    })
  })
})

describe('quitarLector', () => {
  it('quita solo a la persona indicada y limpia vacíos', () => {
    expect(quitarLector(['a::a', null, 'b::b', 'a::a'], 'a::a')).toEqual(['b::b'])
    expect(quitarLector([], 'a::a')).toEqual([])
  })
})

describe('validarPropuesta', () => {
  const valida = {
    monto: '10,000',
    alcance: 'Revisión del contrato y negociación con el arrendador.',
    formaDePago: '50% al inicio y 50% al terminar',
  }

  it('acepta una propuesta completa y normaliza el monto', () => {
    expect(validarPropuesta(valida)).toEqual({
      ok: true,
      datos: { monto: 10000, alcance: valida.alcance, formaDePago: valida.formaDePago },
    })
    expect(validarPropuesta({ ...valida, monto: '1234.567' })).toMatchObject({
      datos: { monto: 1234.57 },
    })
  })

  it.each(['', 'mucho', '0', '-5', '10000001'])('rechaza el monto «%s»', (monto) => {
    const res = validarPropuesta({ ...valida, monto })
    expect(res.ok).toBe(false)
  })

  it('pide alcance y forma de pago suficientes', () => {
    const res = validarPropuesta({ ...valida, alcance: 'corto', formaDePago: 'x' })
    expect(res.ok).toBe(false)
    if (!res.ok)
      expect(Object.keys(res.errores).sort()).toEqual(['alcance', 'formaDePago'])
  })

  it('limita la longitud', () => {
    expect(validarPropuesta({ ...valida, alcance: 'x'.repeat(2001) }).ok).toBe(false)
    expect(validarPropuesta({ ...valida, formaDePago: 'x'.repeat(301) }).ok).toBe(false)
  })
})

describe('codigoDeErrores', () => {
  it('reconoce los códigos del servidor dentro del mensaje', () => {
    expect(codigoDeErrores([{ message: 'LIMITE_SOLICITUDES' }])).toBe(
      'LIMITE_SOLICITUDES',
    )
    expect(codigoDeErrores([{ message: 'algo ESTADO_INVALIDO algo' }])).toBe(
      'ESTADO_INVALIDO',
    )
    expect(codigoDeErrores([{ message: 'Network error' }])).toBeNull()
    expect(codigoDeErrores(undefined)).toBeNull()
  })
})
