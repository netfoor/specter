import { iniciales } from './Avatar'

describe('iniciales', () => {
  it.each([
    ['Ana Pérez', 'AP'],
    ['Lic. Mariana Robles', 'MR'],
    ['Lic. Ana María Pérez López', 'AL'],
    ['beto', 'B'],
    ['  ', '?'],
  ])('%s → %s', (nombre, esperado) => {
    expect(iniciales(nombre)).toBe(esperado)
  })
})
