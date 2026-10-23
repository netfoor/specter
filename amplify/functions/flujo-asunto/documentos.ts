import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import {
  GetCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb'
import {
  MAX_BYTES_DOCUMENTO,
  esTipoPermitido,
  validarArchivo,
} from '../../../shared/domain/documento'
import { ErrorFlujo } from '../../../shared/domain/flujo'
import type { Tablas } from './servicio'

type Db = Pick<DynamoDBDocumentClient, 'send'>
type Item = Record<string, unknown>

/** Operaciones de S3 que usa el servicio; se inyectan para poder probarlo sin AWS. */
export type AlmacenDocumentos = {
  /** Autorización de subida (POST firmado) que S3 hace cumplir: tipo, tamaño y metadatos. */
  firmarSubida(
    clave: string,
    tipo: string,
    metadatos: Record<string, string>,
  ): Promise<{ url: string; campos: Record<string, string> }>
  firmarDescarga(clave: string, nombre: string): Promise<string>
  /** Tamaño, tipo y metadatos del objeto, o null si no existe. */
  inspeccionar(
    clave: string,
  ): Promise<{ tamano: number; tipo: string; metadatos: Record<string, string> } | null>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export class ServicioDocumentos {
  constructor(
    private readonly db: Db,
    private readonly tablas: Tablas,
    private readonly almacen: AlmacenDocumentos,
    private readonly ahora: () => string = () => new Date().toISOString(),
    private readonly nuevoId: () => string = () => crypto.randomUUID(),
  ) {}

  private async leer(tabla: string, id: string): Promise<Item | null> {
    const { Item } = await this.db.send(
      new GetCommand({ TableName: tabla, Key: { id }, ConsistentRead: true }),
    )
    return (Item as Item | undefined) ?? null
  }

  private async expedienteEnGestion(identidad: string, expedienteId: string) {
    const expediente = await this.leer(this.tablas.expediente, expedienteId)
    const participantes = (expediente?.participantes ?? []) as string[]
    if (!expediente || !participantes.includes(identidad))
      throw new ErrorFlujo('NO_ENCONTRADO')
    if (expediente.estado !== 'EN_GESTION') throw new ErrorFlujo('EXPEDIENTE_CONCLUIDO')
    return participantes
  }

  private clave(expedienteId: string, documentoId: string) {
    return `expedientes/${expedienteId}/${documentoId}`
  }

  async solicitarSubida(
    identidad: string,
    expedienteId: string,
    archivo: { nombre: unknown; tipo: unknown; tamano: unknown },
  ) {
    const validacion = validarArchivo(archivo)
    if (!validacion.ok) throw new ErrorFlujo('ARCHIVO_INVALIDO')
    await this.expedienteEnGestion(identidad, expedienteId)

    const documentoId = this.nuevoId()
    const { url, campos } = await this.almacen.firmarSubida(
      this.clave(expedienteId, documentoId),
      validacion.tipo,
      // Los metadatos de S3 solo admiten ASCII.
      { autor: identidad, nombre: encodeURIComponent(validacion.nombre) },
    )
    return { documentoId, url, campos }
  }

  /** Registra el documento solo si S3 confirma que existe, lo subió esta persona y cumple las reglas. */
  async confirmarSubida(identidad: string, expedienteId: string, documentoId: string) {
    if (!UUID.test(documentoId)) throw new ErrorFlujo('SIN_ARCHIVO')
    const participantes = await this.expedienteEnGestion(identidad, expedienteId)

    const clave = this.clave(expedienteId, documentoId)
    const objeto = await this.almacen.inspeccionar(clave)
    if (!objeto || objeto.metadatos.autor !== identidad)
      throw new ErrorFlujo('SIN_ARCHIVO')
    if (
      !esTipoPermitido(objeto.tipo) ||
      objeto.tamano <= 0 ||
      objeto.tamano > MAX_BYTES_DOCUMENTO
    ) {
      throw new ErrorFlujo('ARCHIVO_INVALIDO')
    }
    if (await this.leer(this.tablas.documento, documentoId))
      return { id: documentoId, estado: 'REGISTRADO' }

    const nombre = decodeURIComponent(objeto.metadatos.nombre ?? 'documento')
    const ahora = this.ahora()
    try {
      await this.db.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: this.tablas.documento,
                Item: {
                  id: documentoId,
                  __typename: 'Documento',
                  expedienteId,
                  participantes,
                  nombre,
                  ruta: clave,
                  tipo: objeto.tipo,
                  tamano: objeto.tamano,
                  subidoPor: identidad,
                  creadoEn: ahora,
                  createdAt: ahora,
                  updatedAt: ahora,
                },
                ConditionExpression: 'attribute_not_exists(id)',
              },
            },
            {
              Put: {
                TableName: this.tablas.actuacion,
                Item: {
                  id: this.nuevoId(),
                  __typename: 'Actuacion',
                  expedienteId,
                  participantes,
                  tipo: 'DOCUMENTO',
                  detalle: `Se agregó el documento «${nombre}».`,
                  creadoEn: ahora,
                  createdAt: ahora,
                  updatedAt: ahora,
                },
                ConditionExpression: 'attribute_not_exists(id)',
              },
            },
          ],
        }),
      )
    } catch (error) {
      if (error instanceof TransactionCanceledException)
        return { id: documentoId, estado: 'REGISTRADO' }
      throw error
    }
    return { id: documentoId, estado: 'REGISTRADO' }
  }

  /** Enlace temporal de descarga, solo para las partes del expediente (también si ya concluyó). */
  async urlDeDescarga(identidad: string, documentoId: string) {
    const documento = await this.leer(this.tablas.documento, documentoId)
    const participantes = (documento?.participantes ?? []) as string[]
    if (!documento || !participantes.includes(identidad))
      throw new ErrorFlujo('NO_ENCONTRADO')
    return {
      url: await this.almacen.firmarDescarga(
        String(documento.ruta),
        String(documento.nombre),
      ),
    }
  }
}
