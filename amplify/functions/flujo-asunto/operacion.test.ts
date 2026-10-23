// El manejador lee tablas del entorno al cargarse; se prueba solo cómo identifica la operación.
vi.mock('./servicio', () => ({ Servicio: class {} }))
for (const nombre of [
  'ASUNTO',
  'SOLICITUD',
  'PROPUESTA',
  'PERFILABOGADO',
  'PERFILPUBLICO',
]) {
  process.env[`TABLA_${nombre}`] = 'tabla'
}

describe('operacionDe', () => {
  it('lee el nombre de la operación como lo envía Amplify Gen 2 y como lo envía AppSync', async () => {
    const { operacionDe } = await import('./handler')
    expect(operacionDe({ fieldName: 'enviarSolicitud' })).toBe('enviarSolicitud')
    expect(operacionDe({ info: { fieldName: 'retirarSolicitud' } })).toBe(
      'retirarSolicitud',
    )
    expect(operacionDe({})).toBeUndefined()
  })
})
