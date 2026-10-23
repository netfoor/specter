import type { FormularioAsunto } from './asunto'
import {
  NIA_LIMITES,
  esRespuestaSegura,
  fechaDelDia,
  hayAlgoQueUsar,
  interpretarSalida,
  prellenarAsunto,
  validarMensajes,
  type RespuestaNia,
} from './nia'

describe('validarMensajes', () => {
  it('acepta una conversación válida y la devuelve limpia', () => {
    const res = validarMensajes([
      { rol: 'usuario', texto: '  Hola  ' },
      { rol: 'nia', texto: '¿En qué te ayudo?' },
      { rol: 'usuario', texto: 'Tengo un problema con mi renta' },
    ])
    expect(res).toEqual({
      ok: true,
      mensajes: [
        { rol: 'usuario', texto: 'Hola' },
        { rol: 'nia', texto: '¿En qué te ayudo?' },
        { rol: 'usuario', texto: 'Tengo un problema con mi renta' },
      ],
    })
  })

  it('acepta el JSON como texto, que es como llega de la API', () => {
    expect(validarMensajes(JSON.stringify([{ rol: 'usuario', texto: 'Hola' }])).ok).toBe(
      true,
    )
    expect(validarMensajes('no es json').ok).toBe(false)
  })

  it('rechaza entradas vacías o con formato incorrecto', () => {
    for (const entrada of [
      null,
      undefined,
      [],
      'x',
      5,
      [{ rol: 'otro', texto: 'a' }],
      [{ rol: 'usuario' }],
      [{ rol: 'usuario', texto: '   ' }],
    ]) {
      expect(validarMensajes(entrada).ok).toBe(false)
    }
  })

  it('exige que el último mensaje sea de la persona', () => {
    expect(
      validarMensajes([
        { rol: 'usuario', texto: 'Hola' },
        { rol: 'nia', texto: 'Hola' },
      ]).ok,
    ).toBe(false)
  })

  it('descarta mensajes de NIA al inicio y une los consecutivos del mismo autor', () => {
    const res = validarMensajes([
      { rol: 'nia', texto: 'Bienvenida' },
      { rol: 'usuario', texto: 'uno' },
      { rol: 'usuario', texto: 'dos' },
    ])
    expect(res).toEqual({ ok: true, mensajes: [{ rol: 'usuario', texto: 'uno\ndos' }] })
  })

  it('conserva solo los últimos mensajes', () => {
    const muchos = Array.from({ length: 25 }, (_, i) => ({
      rol: i % 2 === 0 ? 'usuario' : 'nia',
      texto: `m${i}`,
    }))
    muchos.push({ rol: 'usuario', texto: 'último' })
    const res = validarMensajes(muchos)
    expect(res.ok && res.mensajes.length).toBeLessThanOrEqual(NIA_LIMITES.maxMensajes)
    expect(res.ok && res.mensajes.at(-1)?.texto).toContain('último')
  })

  it('limita el tamaño de cada mensaje', () => {
    const res = validarMensajes([
      { rol: 'usuario', texto: 'x'.repeat(NIA_LIMITES.maxCaracteresMensaje + 1) },
    ])
    expect(res.ok).toBe(false)
  })
})

describe('interpretarSalida', () => {
  it('convierte una salida completa', () => {
    const res = interpretarSalida({
      respuesta: 'Parece un asunto civil.',
      materia: 'CIVIL',
      titulo: 'Aumento de renta',
      resumen: 'Mi arrendador quiere subir la renta.',
      datos_faltantes: ['¿Tienes contrato?', ' ', '¿Desde cuándo rentas?'],
      derivar_a_abogado: true,
    })
    expect(res).toEqual({
      respuesta: 'Parece un asunto civil.',
      materia: 'CIVIL',
      titulo: 'Aumento de renta',
      resumen: 'Mi arrendador quiere subir la renta.',
      datosFaltantes: ['¿Tienes contrato?', '¿Desde cuándo rentas?'],
      derivarAAbogado: true,
    })
  })

  it('descarta una materia fuera del catálogo y limita los datos faltantes', () => {
    const res = interpretarSalida({
      respuesta: 'ok',
      materia: 'INVENTADA',
      datos_faltantes: ['a', 'b', 'c', 'd', 'e', 'f'],
    })!
    expect(res.materia).toBeNull()
    expect(res.datosFaltantes).toHaveLength(4)
    expect(res.derivarAAbogado).toBe(false)
  })

  it('rechaza salidas sin respuesta o que no son objetos', () => {
    for (const salida of [null, undefined, 'texto', 3, {}, { respuesta: '  ' }]) {
      expect(interpretarSalida(salida)).toBeNull()
    }
  })
})

describe('esRespuestaSegura', () => {
  const seguras = [
    'Parece un asunto de arrendamiento. Un abogado puede revisar tu contrato.',
    'Las reglas cambian según el estado y lo que diga tu contrato, así que conviene que lo revise un abogado.',
  ]
  it.each(seguras)('acepta: %s', (texto) => {
    expect(esRespuestaSegura(texto, 'Mi arrendador quiere subir la renta')).toBe(true)
  })

  it.each([
    'Te garantizo que ganarás.',
    'Seguro que ganas el juicio.',
    'Vas a ganar este caso.',
    'Según el artículo 2448 del código civil, no puede hacerlo.',
    'En México, la ley establece que debe avisarte.',
    'El Código Civil establece un plazo para eso.',
    'Tienes 30 días para demandar.',
    'Debe avisarte con al menos 2 meses de anticipación.',
    'La indemnización es de 3 meses de salario.',
  ])('rechaza: %s', (texto) => {
    expect(esRespuestaSegura(texto, 'Mi arrendador quiere subir la renta')).toBe(false)
  })

  it('permite repetir cifras que la persona ya dijo', () => {
    const conversacion = 'Mi arrendador quiere subir la renta un 30% y llevo 6 años aquí'
    expect(
      esRespuestaSegura(
        'Mencionas un aumento de 30% y 6 años de antigüedad.',
        conversacion,
      ),
    ).toBe(true)
    expect(esRespuestaSegura('Tienes 15 días para responder.', conversacion)).toBe(false)
  })
})

describe('fechaDelDia', () => {
  it('usa el día calendario de la zona indicada', () => {
    const instante = new Date('2026-10-23T03:30:00Z')
    expect(fechaDelDia(instante, 'America/Mexico_City')).toBe('2026-10-22')
    expect(fechaDelDia(instante, 'UTC')).toBe('2026-10-23')
  })
})

describe('prellenarAsunto', () => {
  const vacio: FormularioAsunto = {
    titulo: '',
    descripcion: '',
    materia: '',
    ubicacion: '',
    modalidad: '',
    presupuestoMin: '',
    presupuestoMax: '',
  }
  const nia: RespuestaNia = {
    respuesta: 'x',
    materia: 'CIVIL',
    titulo: 'Aumento de renta',
    resumen: 'Mi arrendador quiere subir la renta.',
    datosFaltantes: [],
    derivarAAbogado: true,
  }

  it('llena los campos vacíos', () => {
    expect(prellenarAsunto(vacio, nia)).toMatchObject({
      titulo: 'Aumento de renta',
      descripcion: 'Mi arrendador quiere subir la renta.',
      materia: 'CIVIL',
    })
  })

  it('no pisa lo que la persona ya escribió', () => {
    const escrito = { ...vacio, titulo: 'Mi título', materia: 'PENAL' }
    expect(prellenarAsunto(escrito, nia)).toMatchObject({
      titulo: 'Mi título',
      materia: 'PENAL',
      descripcion: 'Mi arrendador quiere subir la renta.',
    })
  })

  it('detecta cuándo NIA no entendió nada que usar', () => {
    expect(hayAlgoQueUsar(nia)).toBe(true)
    expect(hayAlgoQueUsar({ ...nia, materia: null, titulo: null, resumen: null })).toBe(
      false,
    )
  })
})
