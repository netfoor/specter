import {
  GetCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb'
import { ErrorFlujo } from '../../../shared/domain/flujo'
import { ServicioDocumentos, type AlmacenDocumentos } from './documentos'
import type { Tablas } from './servicio'

const tablas = {
  expediente: 'TExpediente',
  documento: 'TDocumento',
  actuacion: 'TActuacion',
} as Tablas
const CLIENTE = 'c::c'
const ABOGADO = 'a::a'
const DOC = '11111111-2222-4333-8444-555555555555'
const PDF = { nombre: 'Contrato firmado.pdf', tipo: 'application/pdf', tamano: 2048 }

function simular(
  opciones: {
    estado?: string
    objeto?: Awaited<ReturnType<AlmacenDocumentos['inspeccionar']>>
    documento?: object
  } = {},
) {
  const datos: Record<string, Record<string, unknown>> = {
    TExpediente: {
      e1: {
        id: 'e1',
        participantes: [CLIENTE, ABOGADO],
        estado: opciones.estado ?? 'EN_GESTION',
      },
    },
    TDocumento: opciones.documento ? { [DOC]: opciones.documento } : {},
  }
  const transacciones: TransactWriteCommand['input'][] = []
  const send = vi.fn(async (c: unknown) => {
    if (c instanceof GetCommand)
      return {
        Item: (datos[c.input.TableName!] as Record<string, unknown>)?.[
          String(c.input.Key!.id)
        ],
      }
    if (c instanceof TransactWriteCommand) {
      transacciones.push(c.input)
      return {}
    }
    throw new Error('inesperado')
  })
  const almacen = {
    firmarSubida: vi.fn(async () => ({ url: 'https://s3/subida', campos: { key: 'k' } })),
    firmarDescarga: vi.fn(async () => 'https://s3/descarga'),
    inspeccionar: vi.fn(async () => opciones.objeto ?? null),
  }
  const servicio = new ServicioDocumentos(
    { send } as unknown as Pick<DynamoDBDocumentClient, 'send'>,
    tablas,
    almacen,
    () => '2026-10-23T12:00:00.000Z',
    () => DOC,
  )
  return { servicio, almacen, transacciones }
}

async function codigo(p: Promise<unknown>) {
  try {
    await p
  } catch (e) {
    return (e as ErrorFlujo).codigo
  }
  return 'sin error'
}

describe('solicitarSubida', () => {
  it('firma la subida en una ruta generada por el servidor, con el autor y el nombre como metadatos', async () => {
    const { servicio, almacen } = simular()
    expect(await servicio.solicitarSubida(CLIENTE, 'e1', PDF)).toEqual({
      documentoId: DOC,
      url: 'https://s3/subida',
      campos: { key: 'k' },
    })
    expect(almacen.firmarSubida).toHaveBeenCalledWith(
      `expedientes/e1/${DOC}`,
      'application/pdf',
      {
        autor: CLIENTE,
        nombre: encodeURIComponent('Contrato firmado.pdf'),
      },
    )
  })

  it('rechaza tipos y tamaños no permitidos sin firmar nada', async () => {
    const { servicio, almacen } = simular()
    expect(
      await codigo(
        servicio.solicitarSubida(CLIENTE, 'e1', { ...PDF, tipo: 'text/html' }),
      ),
    ).toBe('ARCHIVO_INVALIDO')
    expect(
      await codigo(
        servicio.solicitarSubida(CLIENTE, 'e1', { ...PDF, tamano: 11 * 1024 * 1024 }),
      ),
    ).toBe('ARCHIVO_INVALIDO')
    expect(almacen.firmarSubida).not.toHaveBeenCalled()
  })

  it('una persona ajena no encuentra el expediente y uno concluido no admite documentos', async () => {
    expect(
      await codigo(simular().servicio.solicitarSubida('otra::otra', 'e1', PDF)),
    ).toBe('NO_ENCONTRADO')
    expect(
      await codigo(
        simular({ estado: 'CONCLUIDO' }).servicio.solicitarSubida(CLIENTE, 'e1', PDF),
      ),
    ).toBe('EXPEDIENTE_CONCLUIDO')
  })
})

describe('confirmarSubida', () => {
  const objeto = {
    tamano: 2048,
    tipo: 'application/pdf',
    metadatos: { autor: CLIENTE, nombre: encodeURIComponent('Contrato firmado.pdf') },
  }

  it('registra el documento y su actuación solo si S3 confirma el archivo', async () => {
    const { servicio, transacciones } = simular({ objeto })
    expect(await servicio.confirmarSubida(CLIENTE, 'e1', DOC)).toEqual({
      id: DOC,
      estado: 'REGISTRADO',
    })
    const [documento, actuacion] = transacciones[0].TransactItems!
    expect(documento.Put!.Item).toMatchObject({
      id: DOC,
      nombre: 'Contrato firmado.pdf',
      ruta: `expedientes/e1/${DOC}`,
      tamano: 2048,
      subidoPor: CLIENTE,
      participantes: [CLIENTE, ABOGADO],
    })
    expect(actuacion.Put!.Item).toMatchObject({
      tipo: 'DOCUMENTO',
      detalle: 'Se agregó el documento «Contrato firmado.pdf».',
    })
  })

  it('sin archivo, con otro autor o con un id inválido, no registra nada', async () => {
    expect(await codigo(simular().servicio.confirmarSubida(CLIENTE, 'e1', DOC))).toBe(
      'SIN_ARCHIVO',
    )
    expect(
      await codigo(simular({ objeto }).servicio.confirmarSubida(ABOGADO, 'e1', DOC)),
    ).toBe('SIN_ARCHIVO')
    expect(
      await codigo(
        simular({ objeto }).servicio.confirmarSubida(CLIENTE, 'e1', '../otro'),
      ),
    ).toBe('SIN_ARCHIVO')
  })

  it('rechaza un archivo que en S3 no cumple tipo o tamaño', async () => {
    const grande = simular({ objeto: { ...objeto, tamano: 11 * 1024 * 1024 } })
    expect(await codigo(grande.servicio.confirmarSubida(CLIENTE, 'e1', DOC))).toBe(
      'ARCHIVO_INVALIDO',
    )
    const html = simular({ objeto: { ...objeto, tipo: 'text/html' } })
    expect(await codigo(html.servicio.confirmarSubida(CLIENTE, 'e1', DOC))).toBe(
      'ARCHIVO_INVALIDO',
    )
  })

  it('confirmar dos veces no duplica el registro', async () => {
    const { servicio, transacciones } = simular({ objeto, documento: { id: DOC } })
    expect(await servicio.confirmarSubida(CLIENTE, 'e1', DOC)).toEqual({
      id: DOC,
      estado: 'REGISTRADO',
    })
    expect(transacciones).toHaveLength(0)
  })
})

describe('urlDeDescarga', () => {
  const documento = {
    id: DOC,
    participantes: [CLIENTE, ABOGADO],
    ruta: `expedientes/e1/${DOC}`,
    nombre: 'Contrato.pdf',
  }

  it('firma un enlace temporal para las partes', async () => {
    const { servicio, almacen } = simular({ documento })
    expect(await servicio.urlDeDescarga(ABOGADO, DOC)).toEqual({
      url: 'https://s3/descarga',
    })
    expect(almacen.firmarDescarga).toHaveBeenCalledWith(
      `expedientes/e1/${DOC}`,
      'Contrato.pdf',
    )
  })

  it('una persona ajena no lo encuentra', async () => {
    const { servicio, almacen } = simular({ documento })
    expect(await codigo(servicio.urlDeDescarga('otra::otra', DOC))).toBe('NO_ENCONTRADO')
    expect(almacen.firmarDescarga).not.toHaveBeenCalled()
  })
})
