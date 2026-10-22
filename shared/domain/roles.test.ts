import { rolDeGrupos, rolDeRegistro } from './roles'

describe('rolDeRegistro', () => {
  it('acepta CLIENTE y ABOGADO', () => {
    expect(rolDeRegistro('CLIENTE')).toBe('CLIENTE')
    expect(rolDeRegistro('ABOGADO')).toBe('ABOGADO')
  })

  it.each(['ADMIN', 'admin', 'cliente', '', undefined, null, 42, ['ADMIN']])(
    'descarta %j',
    (valor) => {
      expect(rolDeRegistro(valor)).toBeNull()
    },
  )
})

describe('rolDeGrupos', () => {
  it('devuelve null sin grupos', () => {
    expect(rolDeGrupos(undefined)).toBeNull()
    expect(rolDeGrupos([])).toBeNull()
    expect(rolDeGrupos(['OTRO'])).toBeNull()
  })

  it('elige el rol de mayor prioridad', () => {
    expect(rolDeGrupos(['CLIENTE'])).toBe('CLIENTE')
    expect(rolDeGrupos(['CLIENTE', 'ABOGADO'])).toBe('ABOGADO')
    expect(rolDeGrupos(['ABOGADO', 'ADMIN'])).toBe('ADMIN')
  })
})
