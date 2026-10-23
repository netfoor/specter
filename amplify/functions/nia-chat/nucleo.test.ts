import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { RESPUESTA_DE_RESPALDO, type MensajeNia } from '../../../shared/domain/nia'
import { orientar } from './nucleo'
import { REFUERZO_REINTENTO } from './prompt'

const conversacion: MensajeNia[] = [
  { rol: 'usuario', texto: 'Mi arrendador quiere subir la renta y no sé si puede.' },
]

const salida = (input: object | undefined) => ({
  output: {
    message: {
      role: 'assistant',
      content: input
        ? [{ toolUse: { toolUseId: 'x', name: 'responder', input } }]
        : [{ text: 'sin herramienta' }],
    },
  },
})

const buena = {
  respuesta:
    'Parece un tema de arrendamiento. Las reglas cambian según tu contrato y tu estado; un abogado puede revisarlo.',
  materia: 'CIVIL',
  titulo: 'Aumento de renta',
  resumen: 'Mi arrendador quiere subir la renta.',
  datos_faltantes: ['¿Tienes contrato por escrito?'],
  derivar_a_abogado: true,
}

function simular(...respuestas: (object | Error)[]) {
  const send = vi.fn()
  for (const r of respuestas) {
    if (r instanceof Error) send.mockRejectedValueOnce(r)
    else send.mockResolvedValueOnce(r)
  }
  return { send } as unknown as Pick<BedrockRuntimeClient, 'send'> & {
    send: ReturnType<typeof vi.fn>
  }
}

describe('orientar', () => {
  it('devuelve la respuesta segura del modelo con una sola llamada', async () => {
    const bedrock = simular(salida(buena))
    const res = await orientar(bedrock, 'modelo-x', conversacion)
    expect(res).toMatchObject({
      materia: 'CIVIL',
      titulo: 'Aumento de renta',
      derivarAAbogado: true,
    })
    expect(bedrock.send).toHaveBeenCalledTimes(1)
  })

  it('pide una salida estructurada forzada y usa el modelo y la conversación indicados', async () => {
    const bedrock = simular(salida(buena))
    await orientar(bedrock, 'modelo-x', [
      { rol: 'usuario', texto: 'Hola' },
      { rol: 'nia', texto: '¿En qué te ayudo?' },
      { rol: 'usuario', texto: 'Mi renta' },
    ])
    const entrada = bedrock.send.mock.calls[0][0].input
    expect(entrada.modelId).toBe('modelo-x')
    expect(entrada.toolConfig.toolChoice).toEqual({ tool: { name: 'responder' } })
    expect(entrada.messages.map((m: { role: string }) => m.role)).toEqual([
      'user',
      'assistant',
      'user',
    ])
    expect(entrada.system[0].text).toContain('No eres abogada')
  })

  it('reintenta con un refuerzo cuando la primera respuesta cita la ley', async () => {
    const bedrock = simular(
      salida({ ...buena, respuesta: 'Según el artículo 2448 no puede subirla.' }),
      salida(buena),
    )
    const res = await orientar(bedrock, 'm', conversacion)
    expect(bedrock.send).toHaveBeenCalledTimes(2)
    expect(bedrock.send.mock.calls[1][0].input.system[0].text).toContain(
      REFUERZO_REINTENTO.trim(),
    )
    expect(res.respuesta).toBe(buena.respuesta)
  })

  it('si ambos intentos incumplen, entrega la respuesta de respaldo y deriva a un abogado', async () => {
    const insegura = {
      ...buena,
      respuesta: 'Te garantizo que ganarás el juicio.',
      resumen: 'Tienes 30 días.',
    }
    const bedrock = simular(salida(insegura), salida(insegura))
    const res = await orientar(bedrock, 'm', conversacion)
    expect(res).toEqual({
      respuesta: RESPUESTA_DE_RESPALDO,
      materia: 'CIVIL',
      titulo: null,
      resumen: null,
      datosFaltantes: [],
      derivarAAbogado: true,
    })
  })

  it('una salida inválida en ambos intentos también cae al respaldo, sin materia', async () => {
    const bedrock = simular(salida(undefined), salida({ respuesta: '' }))
    const res = await orientar(bedrock, 'm', conversacion)
    expect(res.respuesta).toBe(RESPUESTA_DE_RESPALDO)
    expect(res.materia).toBeNull()
    expect(res.derivarAAbogado).toBe(true)
  })

  it('descarta un resumen inseguro pero conserva una respuesta segura', async () => {
    const bedrock = simular(
      salida({ ...buena, resumen: 'Tienes 30 días para demandar.' }),
    )
    const res = await orientar(bedrock, 'm', conversacion)
    expect(res.resumen).toBeNull()
    expect(res.titulo).toBe('Aumento de renta')
    expect(res.respuesta).toBe(buena.respuesta)
  })

  it('permite repetir una cifra que la persona dijo', async () => {
    const bedrock = simular(
      salida({
        ...buena,
        respuesta: 'Mencionas un aumento de 30%; un abogado puede revisarlo.',
      }),
    )
    const res = await orientar(bedrock, 'm', [
      { rol: 'usuario', texto: 'Quiere subirme la renta 30%' },
    ])
    expect(res.respuesta).toContain('30%')
  })

  it('propaga los errores de Bedrock para que el manejador los traduzca', async () => {
    const bedrock = simular(new Error('ThrottlingException'))
    await expect(orientar(bedrock, 'm', conversacion)).rejects.toThrow(
      'ThrottlingException',
    )
  })
})
