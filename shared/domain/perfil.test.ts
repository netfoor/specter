import {
  aPerfilPublico,
  filtrarDirectorio,
  listaDeTexto,
  validarPerfil,
  type FormularioPerfil,
  type PerfilCompleto,
  type ResumenDirectorio,
} from './perfil'

const formulario = (cambios: Partial<FormularioPerfil> = {}): FormularioPerfil => ({
  nombre: 'Ana Pérez López',
  materias: ['CIVIL', 'FAMILIAR'],
  especialidades: 'Arrendamiento, Divorcios',
  ubicacion: 'Puebla',
  jurisdicciones: 'Puebla',
  idiomas: 'Español, Inglés',
  aniosExperiencia: '8',
  modalidad: 'AMBAS',
  honorariosDesde: '5,000',
  honorariosHasta: '20000',
  disponibilidad: 'Lunes a viernes',
  semblanza: 'Litigante.',
  cedula: '1234567',
  ...cambios,
})

describe('listaDeTexto', () => {
  it('separa por comas y saltos de línea, sin vacíos ni repetidos', () => {
    expect(listaDeTexto(' a, b\nc,, a ')).toEqual(['a', 'b', 'c'])
    expect(listaDeTexto('')).toEqual([])
  })
})

describe('validarPerfil', () => {
  it('acepta un formulario completo y normaliza los datos', () => {
    const res = validarPerfil(formulario())
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.datos).toMatchObject({
      nombre: 'Ana Pérez López',
      materias: ['CIVIL', 'FAMILIAR'],
      especialidades: ['Arrendamiento', 'Divorcios'],
      aniosExperiencia: 8,
      honorariosDesde: 5000,
      honorariosHasta: 20000,
      modalidad: 'AMBAS',
    })
  })

  it('los campos opcionales vacíos quedan en null', () => {
    const res = validarPerfil(
      formulario({
        aniosExperiencia: '',
        honorariosDesde: '',
        honorariosHasta: '',
        disponibilidad: '',
        semblanza: '',
        cedula: '',
      }),
    )
    expect(res.ok && res.datos.aniosExperiencia).toBeNull()
    expect(res.ok && res.datos.cedula).toBeNull()
  })

  it('pide nombre, ubicación, materia y modalidad', () => {
    const res = validarPerfil(
      formulario({ nombre: 'A', ubicacion: ' ', materias: [], modalidad: '' }),
    )
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(Object.keys(res.errores).sort()).toEqual([
      'materias',
      'modalidad',
      'nombre',
      'ubicacion',
    ])
  })

  it('descarta materias que no están en el catálogo', () => {
    expect(validarPerfil(formulario({ materias: ['INVENTADA'] })).ok).toBe(false)
  })

  it.each([['-1'], ['71'], ['2.5'], ['diez']])(
    'rechaza %s como años de experiencia',
    (valor) => {
      const res = validarPerfil(formulario({ aniosExperiencia: valor }))
      expect(res.ok).toBe(false)
    },
  )

  it('valida los honorarios', () => {
    expect(validarPerfil(formulario({ honorariosDesde: 'mucho' })).ok).toBe(false)
    expect(validarPerfil(formulario({ honorariosDesde: '-5' })).ok).toBe(false)
    const invertido = validarPerfil(
      formulario({ honorariosDesde: '9000', honorariosHasta: '1000' }),
    )
    expect(invertido.ok).toBe(false)
    if (!invertido.ok) expect(invertido.errores.honorariosHasta).toMatch(/menor/)
  })

  it('limita la semblanza', () => {
    expect(validarPerfil(formulario({ semblanza: 'x'.repeat(1501) })).ok).toBe(false)
  })
})

describe('aPerfilPublico', () => {
  const completo: PerfilCompleto = {
    nombre: 'Ana',
    materias: ['CIVIL'],
    especialidades: [],
    ubicacion: 'Puebla',
    jurisdicciones: [],
    idiomas: [],
    aniosExperiencia: 3,
    modalidad: 'VIRTUAL',
    honorariosDesde: null,
    honorariosHasta: null,
    disponibilidad: null,
    semblanza: null,
    cedula: '1234567',
  }

  it('nunca incluye la cédula', () => {
    const publico = aPerfilPublico(completo, true)
    expect(publico).not.toHaveProperty('cedula')
    expect(JSON.stringify(publico)).not.toContain('1234567')
  })

  it('conserva la marca de verificación indicada', () => {
    expect(aPerfilPublico(completo, true).verificadoManual).toBe(true)
    expect(aPerfilPublico(completo, false).verificadoManual).toBe(false)
  })
})

describe('filtrarDirectorio', () => {
  const lista: ResumenDirectorio[] = [
    {
      id: '1',
      nombre: 'Zoe Ruiz',
      materias: ['CIVIL'],
      ubicacion: 'Puebla',
      modalidad: 'PRESENCIAL',
      verificadoManual: false,
    },
    {
      id: '2',
      nombre: 'Ángel Mora',
      materias: ['LABORAL', 'CIVIL'],
      especialidades: ['Despidos'],
      ubicacion: 'Cholula',
      modalidad: 'VIRTUAL',
      verificadoManual: true,
    },
    {
      id: '3',
      nombre: 'Beto Gil',
      materias: ['PENAL'],
      ubicacion: 'Puebla',
      modalidad: 'AMBAS',
      verificadoManual: false,
    },
  ]
  const ids = (r: ResumenDirectorio[]) => r.map((p) => p.id)

  it('ordena primero a los verificados y luego por nombre', () => {
    expect(ids(filtrarDirectorio(lista, {}))).toEqual(['2', '3', '1'])
  })

  it('filtra por materia', () => {
    expect(ids(filtrarDirectorio(lista, { materia: 'CIVIL' }))).toEqual(['2', '1'])
  })

  it('un perfil que atiende ambas modalidades coincide con cualquiera', () => {
    expect(ids(filtrarDirectorio(lista, { modalidad: 'VIRTUAL' }))).toEqual(['2', '3'])
    expect(ids(filtrarDirectorio(lista, { modalidad: 'PRESENCIAL' }))).toEqual(['3', '1'])
  })

  it('busca texto sin distinguir acentos ni mayúsculas', () => {
    expect(ids(filtrarDirectorio(lista, { texto: 'angel' }))).toEqual(['2'])
    expect(ids(filtrarDirectorio(lista, { texto: 'DESPIDOS' }))).toEqual(['2'])
    expect(ids(filtrarDirectorio(lista, { texto: 'cholula' }))).toEqual(['2'])
  })
})
