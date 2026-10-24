import {
  MAX_BYTES_DOCUMENTO,
  formatoTamano,
  limpiarNombre,
  validarArchivo,
} from './documento'

describe('validarArchivo', () => {
  const pdf = { nombre: 'contrato.pdf', tipo: 'application/pdf', tamano: 2048 }

  it('acepta los tipos permitidos dentro del límite', () => {
    expect(validarArchivo(pdf)).toEqual({
      ok: true,
      nombre: 'contrato.pdf',
      tipo: 'application/pdf',
      tamano: 2048,
    })
    for (const tipo of [
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]) {
      expect(validarArchivo({ ...pdf, tipo }).ok).toBe(true)
    }
  })

  it.each(['application/zip', 'text/html', 'application/x-msdownload', '', undefined])(
    'rechaza el tipo %s',
    (tipo) => {
      expect(validarArchivo({ ...pdf, tipo }).ok).toBe(false)
    },
  )

  it('rechaza vacíos y más de 10 MB', () => {
    expect(validarArchivo({ ...pdf, tamano: 0 }).ok).toBe(false)
    expect(validarArchivo({ ...pdf, tamano: 1.5 }).ok).toBe(false)
    expect(validarArchivo({ ...pdf, tamano: MAX_BYTES_DOCUMENTO }).ok).toBe(true)
    expect(validarArchivo({ ...pdf, tamano: MAX_BYTES_DOCUMENTO + 1 }).ok).toBe(false)
  })
})

describe('limpiarNombre', () => {
  it('quita rutas y caracteres de control', () => {
    expect(limpiarNombre('../../etc/passwd')).toBe('passwd')
    expect(limpiarNombre('C:\\docs\\acta.pdf')).toBe('acta.pdf')
    expect(limpiarNombre('a\u0000b\nc.pdf')).toBe('abc.pdf')
  })

  it('recorta conservando la extensión y nunca queda vacío', () => {
    const largo = limpiarNombre('x'.repeat(200) + '.pdf', 50)
    expect(largo).toHaveLength(50)
    expect(largo.endsWith('.pdf')).toBe(true)
    expect(limpiarNombre('   ')).toBe('documento')
  })
})

it('formatea tamaños', () => {
  expect(formatoTamano(500)).toBe('500 B')
  expect(formatoTamano(2048)).toBe('2 KB')
  expect(formatoTamano(3.5 * 1024 * 1024)).toBe('3.5 MB')
})
