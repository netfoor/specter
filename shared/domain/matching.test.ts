import {
  MAX_COMPARACION,
  coincidencias,
  evaluarPerfil,
  type AsuntoParaMatching,
  type PerfilParaMatching,
} from './matching'

const asunto = (cambios: Partial<AsuntoParaMatching> = {}): AsuntoParaMatching => ({
  materia: 'CIVIL',
  ubicacion: 'Puebla',
  modalidad: 'PRESENCIAL',
  presupuestoMin: 3000,
  presupuestoMax: 9000,
  ...cambios,
})

const perfil = (cambios: Partial<PerfilParaMatching> = {}): PerfilParaMatching => ({
  id: 'p1',
  nombre: 'Ana',
  materias: ['CIVIL'],
  ubicacion: 'Puebla',
  modalidad: 'PRESENCIAL',
  honorariosDesde: 4000,
  honorariosHasta: 8000,
  verificadoManual: true,
  aniosExperiencia: 5,
  ...cambios,
})

const criterio = (a: AsuntoParaMatching, p: PerfilParaMatching, clave: string) =>
  evaluarPerfil(a, p)!.criterios.find((c) => c.clave === clave)!

describe('evaluarPerfil', () => {
  it('un perfil que cumple todo obtiene 100 y explica cada criterio', () => {
    const res = evaluarPerfil(asunto(), perfil())!
    expect(res.puntuacion).toBe(100)
    expect(res.criterios.map((c) => [c.clave, c.estado])).toEqual([
      ['MATERIA', 'cumple'],
      ['UBICACION', 'cumple'],
      ['MODALIDAD', 'cumple'],
      ['PRESUPUESTO', 'cumple'],
      ['VERIFICACION', 'cumple'],
    ])
    for (const c of res.criterios) expect(c.detalle.length).toBeGreaterThan(0)
  })

  it('excluye a quien no atiende la materia del asunto', () => {
    expect(evaluarPerfil(asunto(), perfil({ materias: ['PENAL', 'FISCAL'] }))).toBeNull()
  })

  it('con materia «otra» el criterio no aplica y nadie queda excluido por materia', () => {
    const res = evaluarPerfil(
      asunto({ materia: 'OTRA' }),
      perfil({ materias: ['PENAL'] }),
    )!
    expect(res.criterios[0].estado).toBe('no_aplica')
    expect(res.puntuacion).toBe(100)
  })

  describe('ubicación', () => {
    it('ignora acentos y mayúsculas', () => {
      expect(
        criterio(
          asunto({ ubicacion: 'san andres cholula' }),
          perfil({ ubicacion: 'San Andrés Cholula' }),
          'UBICACION',
        ).estado,
      ).toBe('cumple')
    })

    it('otra ciudad pero atención a distancia es coincidencia parcial', () => {
      const c = criterio(
        asunto({ modalidad: 'VIRTUAL' }),
        perfil({ ubicacion: 'Atlixco', modalidad: 'VIRTUAL' }),
        'UBICACION',
      )
      expect(c).toMatchObject({ estado: 'parcial', puntos: 13 })
    })

    it('otra ciudad sin atención a distancia no cumple', () => {
      expect(
        criterio(
          asunto(),
          perfil({ ubicacion: 'Atlixco', modalidad: 'PRESENCIAL' }),
          'UBICACION',
        ).estado,
      ).toBe('no_cumple')
    })

    it('si el cliente quiere presencial, la atención a distancia no compensa otra ciudad', () => {
      expect(
        criterio(
          asunto({ modalidad: 'PRESENCIAL' }),
          perfil({ ubicacion: 'Atlixco', modalidad: 'VIRTUAL' }),
          'UBICACION',
        ).estado,
      ).toBe('no_cumple')
    })
  })

  describe('modalidad', () => {
    it('sin preferencia no aplica', () => {
      expect(criterio(asunto({ modalidad: 'AMBAS' }), perfil(), 'MODALIDAD').estado).toBe(
        'no_aplica',
      )
    })

    it('un perfil que ofrece ambas cumple con cualquier preferencia', () => {
      expect(
        criterio(
          asunto({ modalidad: 'VIRTUAL' }),
          perfil({ modalidad: 'AMBAS' }),
          'MODALIDAD',
        ).estado,
      ).toBe('cumple')
      expect(
        criterio(
          asunto({ modalidad: 'PRESENCIAL' }),
          perfil({ modalidad: 'AMBAS' }),
          'MODALIDAD',
        ).estado,
      ).toBe('cumple')
    })

    it('no cumple si el perfil no ofrece lo pedido', () => {
      expect(
        criterio(
          asunto({ modalidad: 'VIRTUAL' }),
          perfil({ modalidad: 'PRESENCIAL' }),
          'MODALIDAD',
        ).estado,
      ).toBe('no_cumple')
    })
  })

  describe('presupuesto', () => {
    it('no aplica si el cliente no indicó presupuesto o el perfil no publica rango', () => {
      expect(
        criterio(
          asunto({ presupuestoMin: null, presupuestoMax: null }),
          perfil(),
          'PRESUPUESTO',
        ).estado,
      ).toBe('no_aplica')
      expect(
        criterio(
          asunto(),
          perfil({ honorariosDesde: null, honorariosHasta: null }),
          'PRESUPUESTO',
        ).estado,
      ).toBe('no_aplica')
    })

    it('cumple cuando los rangos se traslapan, aunque sea en un extremo', () => {
      expect(
        criterio(
          asunto({ presupuestoMin: 8000, presupuestoMax: 12000 }),
          perfil(),
          'PRESUPUESTO',
        ).estado,
      ).toBe('cumple')
    })

    it('no cumple cuando el rango del perfil queda por encima o por debajo', () => {
      expect(
        criterio(
          asunto({ presupuestoMin: 1000, presupuestoMax: 3000 }),
          perfil(),
          'PRESUPUESTO',
        ).estado,
      ).toBe('no_cumple')
      expect(
        criterio(
          asunto({ presupuestoMin: 20000, presupuestoMax: null }),
          perfil(),
          'PRESUPUESTO',
        ).estado,
      ).toBe('no_cumple')
    })

    it('acepta rangos abiertos de un solo extremo', () => {
      expect(
        criterio(
          asunto({ presupuestoMin: null, presupuestoMax: 5000 }),
          perfil({ honorariosDesde: 4000, honorariosHasta: null }),
          'PRESUPUESTO',
        ).estado,
      ).toBe('cumple')
    })
  })

  it('la verificación suma poco pero cuenta', () => {
    const verificado = evaluarPerfil(
      asunto(),
      perfil({ verificadoManual: true }),
    )!.puntuacion
    const sinVerificar = evaluarPerfil(asunto(), perfil({ verificadoManual: false }))!
    expect(verificado - sinVerificar.puntuacion).toBe(5)
    expect(sinVerificar.criterios.at(-1)?.estado).toBe('no_cumple')
  })

  it('la puntuación se calcula solo sobre los criterios que aplican', () => {
    const res = evaluarPerfil(
      asunto({ modalidad: 'AMBAS', presupuestoMin: null, presupuestoMax: null }),
      perfil({ ubicacion: 'Atlixco', modalidad: 'PRESENCIAL' }),
    )!
    // aplican materia (40), ubicación (25, sin cumplir) y verificación (5): 45 de 70
    expect(res.puntuacion).toBe(64)
  })

  it('la puntuación siempre queda entre 0 y 100', () => {
    const peor = evaluarPerfil(
      asunto({ modalidad: 'VIRTUAL', presupuestoMin: 50000, presupuestoMax: 60000 }),
      perfil({ ubicacion: 'Atlixco', modalidad: 'PRESENCIAL', verificadoManual: false }),
    )!
    expect(peor.puntuacion).toBeGreaterThanOrEqual(0)
    expect(peor.puntuacion).toBeLessThan(100)
  })
})

describe('coincidencias', () => {
  it('ordena por puntuación y descarta a quien no atiende la materia', () => {
    const lista = coincidencias(asunto(), [
      perfil({ id: 'lejos', nombre: 'Lejos', ubicacion: 'Atlixco' }),
      perfil({ id: 'penal', nombre: 'Penal', materias: ['PENAL'] }),
      perfil({ id: 'ideal', nombre: 'Ideal' }),
    ])
    expect(lista.map((c) => c.perfil.id)).toEqual(['ideal', 'lejos'])
    expect(lista[0].puntuacion).toBeGreaterThan(lista[1].puntuacion)
  })

  it('desempata por verificado, luego experiencia y luego nombre', () => {
    const base = { honorariosDesde: null, honorariosHasta: null }
    const lista = coincidencias(asunto({ presupuestoMin: null, presupuestoMax: null }), [
      perfil({
        id: 'c',
        nombre: 'Carla',
        verificadoManual: false,
        aniosExperiencia: 20,
        ...base,
      }),
      perfil({
        id: 'b',
        nombre: 'Beto',
        verificadoManual: true,
        aniosExperiencia: 3,
        ...base,
      }),
      perfil({
        id: 'a',
        nombre: 'Ana',
        verificadoManual: true,
        aniosExperiencia: 10,
        ...base,
      }),
      perfil({
        id: 'z',
        nombre: 'Zoe',
        verificadoManual: true,
        aniosExperiencia: 10,
        ...base,
      }),
    ])
    expect(lista.map((c) => c.perfil.id)).toEqual(['a', 'z', 'b', 'c'])
  })

  it('devuelve una lista vacía si nadie atiende la materia', () => {
    expect(coincidencias(asunto({ materia: 'FISCAL' }), [perfil()])).toEqual([])
  })

  it('no modifica la lista original', () => {
    const perfiles = [perfil({ id: 'b', nombre: 'B' }), perfil({ id: 'a', nombre: 'A' })]
    coincidencias(asunto(), perfiles)
    expect(perfiles.map((p) => p.id)).toEqual(['b', 'a'])
  })
})

it('se comparan hasta tres perfiles', () => {
  expect(MAX_COMPARACION).toBe(3)
})
