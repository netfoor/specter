import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NiaChat } from './NiaChat'

const simulado = vi.hoisted(() => ({ nia: vi.fn() }))

vi.mock('../../app/datos', () => ({
  datosComoUsuario: () => ({ mutations: { nia: simulado.nia } }),
}))

const respuesta = (extra: object = {}) => ({
  data: {
    respuesta: 'Parece un tema de arrendamiento. Un abogado puede revisar tu contrato.',
    materia: 'CIVIL',
    titulo: 'Aumento de renta',
    resumen: 'Mi arrendador quiere subir la renta.',
    datosFaltantes: ['¿Tienes contrato por escrito?'],
    derivarAAbogado: true,
    restantes: 29,
    ...extra,
  },
})

async function escribir(mensaje: string) {
  await userEvent.type(screen.getByLabelText('Escribe tu mensaje'), mensaje)
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
}

beforeEach(() => {
  simulado.nia.mockReset()
})

describe('NiaChat', () => {
  it('siempre aclara que NIA no sustituye a un abogado y saluda', () => {
    render(<NiaChat onUsar={vi.fn()} />)
    expect(
      screen.getByText(/NIA no sustituye a un abogado ni presta servicios jurídicos/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Hola, soy NIA/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('envía la conversación como JSON y muestra la respuesta y los mensajes restantes', async () => {
    simulado.nia.mockResolvedValue(respuesta())
    render(<NiaChat onUsar={vi.fn()} />)
    await escribir('Mi arrendador quiere subir la renta')

    expect(await screen.findByText(/Parece un tema de arrendamiento/)).toBeInTheDocument()
    expect(JSON.parse(simulado.nia.mock.calls[0][0].mensajes)).toEqual([
      { rol: 'usuario', texto: 'Mi arrendador quiere subir la renta' },
    ])
    expect(screen.getByText('Te quedan 29 mensajes hoy.')).toBeInTheDocument()
    expect(screen.getByText('¿Tienes contrato por escrito?')).toBeInTheDocument()
    expect(screen.getByText(/conviene que la revise un abogado/)).toBeInTheDocument()
  })

  it('conserva el historial en el segundo mensaje, sin el saludo local', async () => {
    simulado.nia.mockResolvedValue(respuesta())
    render(<NiaChat onUsar={vi.fn()} />)
    await escribir('Primero')
    await screen.findByText(/Parece un tema de arrendamiento/)
    await escribir('Segundo')
    await screen.findByText('Te quedan 29 mensajes hoy.')
    const segundo = JSON.parse(simulado.nia.mock.calls[1][0].mensajes)
    expect(segundo.map((m: { rol: string }) => m.rol)).toEqual([
      'usuario',
      'nia',
      'usuario',
    ])
    expect(segundo[0].texto).toBe('Primero')
  })

  it('ofrece usar lo que NIA entendió y avisa que solo llena lo vacío', async () => {
    simulado.nia.mockResolvedValue(respuesta())
    const alUsar = vi.fn()
    render(<NiaChat onUsar={alUsar} />)
    await escribir('Mi arrendador quiere subir la renta')
    expect(await screen.findByText('Aumento de renta')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Usar en el formulario' }))
    expect(alUsar).toHaveBeenCalledWith(
      expect.objectContaining({ materia: 'CIVIL', titulo: 'Aumento de renta' }),
    )
    expect(screen.getByText(/Llené los campos que estaban vacíos/)).toBeInTheDocument()
  })

  it('no ofrece usar nada cuando NIA no entendió el asunto', async () => {
    simulado.nia.mockResolvedValue(
      respuesta({ materia: null, titulo: null, resumen: null, derivarAAbogado: false }),
    )
    render(<NiaChat onUsar={vi.fn()} />)
    await escribir('Hola')
    await screen.findByText(/Parece un tema de arrendamiento/)
    expect(
      screen.queryByRole('button', { name: 'Usar en el formulario' }),
    ).not.toBeInTheDocument()
  })

  it('al llegar al límite diario avisa y bloquea el envío', async () => {
    simulado.nia.mockResolvedValue({ data: null, errors: [{ message: 'LIMITE_DIARIO' }] })
    render(<NiaChat onUsar={vi.fn()} />)
    await escribir('Hola')
    expect(
      await screen.findByText(/Llegaste al límite de mensajes de hoy/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Escribe tu mensaje')).toBeDisabled()
  })

  it('cuando se agota el último mensaje restante bloquea el envío', async () => {
    simulado.nia.mockResolvedValue(respuesta({ restantes: 0 }))
    render(<NiaChat onUsar={vi.fn()} />)
    await escribir('Hola')
    await screen.findByText(/Parece un tema de arrendamiento/)
    expect(screen.getByLabelText('Escribe tu mensaje')).toBeDisabled()
  })

  it.each([
    ['NIA_NO_DISPONIBLE', /NIA no está disponible en este momento/],
    ['MENSAJE_INVALIDO: algo', /No pude leer tu mensaje/],
    ['otra cosa', /No pudimos enviar tu mensaje/],
  ])('traduce el error %s a un mensaje útil', async (codigo, esperado) => {
    simulado.nia.mockResolvedValue({ data: null, errors: [{ message: codigo }] })
    render(<NiaChat onUsar={vi.fn()} />)
    await escribir('Hola')
    expect(await screen.findByText(esperado)).toBeInTheDocument()
  })

  it('un fallo de red no rompe el chat', async () => {
    simulado.nia.mockImplementation(() => {
      throw new Error('red')
    })
    render(<NiaChat onUsar={vi.fn()} />)
    await escribir('Hola')
    expect(await screen.findByText(/No pudimos enviar tu mensaje/)).toBeInTheDocument()
  })
})
