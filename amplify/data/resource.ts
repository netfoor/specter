import { a, defineData, type ClientSchema } from '@aws-amplify/backend'
import {
  ESTADOS_CONTRATO,
  ESTADOS_EXPEDIENTE,
  ESTADOS_SOLICITUD,
} from '../../shared/domain/asunto'
import { flujoAsunto } from '../functions/flujo-asunto/resource'
import { indicadores } from '../functions/indicadores/resource'
import { nia } from '../functions/nia-chat/resource'
import { MATERIAS, MODALIDADES } from '../../shared/domain/catalogos'

/**
 * Reglas de autorización (docs/arquitectura/arquitectura.md y ADR-0004):
 * - El contenido privado solo lo leen sus participantes; las identidades se guardan como
 *   `sub::username` en listas `participantes`.
 * - Los campos y modelos que cambian por reglas de negocio no tienen regla de escritura para
 *   el cliente web: los escribe el servidor (flujo-asunto, tareas T14 a T17).
 * - El directorio público es un modelo aparte (`PerfilPublico`) que solo escribe un administrador.
 */
const schema = a
  .schema({
    Materia: a.enum([...MATERIAS]),
    Modalidad: a.enum([...MODALIDADES]),
    EstadoSolicitud: a.enum([...ESTADOS_SOLICITUD]),
    EstadoContrato: a.enum([...ESTADOS_CONTRATO]),
    EstadoExpediente: a.enum([...ESTADOS_EXPEDIENTE]),

    // Contadores del panel de administración; los calcula una función con permisos de lectura.
    Indicadores: a.customType({
      abogadosRegistrados: a.integer().required(),
      clientesRegistrados: a.integer().required(),
      abogadosVerificados: a.integer().required(),
      abogadosPublicados: a.integer().required(),
      asuntos: a.integer().required(),
      solicitudes: a.integer().required(),
      contrataciones: a.integer().required(),
      concluidos: a.integer().required(),
    }),

    indicadores: a
      .query()
      .returns(a.ref('Indicadores'))
      .authorization((allow) => [allow.group('ADMIN')])
      .handler(a.handler.function(indicadores)),

    // Flujo de contratación: las transiciones de estado solo ocurren en el servidor.
    ResultadoFlujo: a.customType({
      solicitudId: a.id().required(),
      estado: a.string().required(),
    }),

    enviarSolicitud: a
      .mutation()
      .arguments({ asuntoId: a.id().required(), perfilId: a.id().required() })
      .returns(a.ref('ResultadoFlujo'))
      .authorization((allow) => [allow.group('CLIENTE')])
      .handler(a.handler.function(flujoAsunto)),

    retirarSolicitud: a
      .mutation()
      .arguments({ solicitudId: a.id().required() })
      .returns(a.ref('ResultadoFlujo'))
      .authorization((allow) => [allow.group('CLIENTE')])
      .handler(a.handler.function(flujoAsunto)),

    responderSolicitud: a
      .mutation()
      .arguments({
        solicitudId: a.id().required(),
        aceptar: a.boolean().required(),
        declaracionNoConflicto: a.boolean(),
      })
      .returns(a.ref('ResultadoFlujo'))
      .authorization((allow) => [allow.group('ABOGADO')])
      .handler(a.handler.function(flujoAsunto)),

    proponerHonorarios: a
      .mutation()
      .arguments({
        solicitudId: a.id().required(),
        monto: a.float().required(),
        alcance: a.string().required(),
        formaDePago: a.string().required(),
      })
      .returns(a.ref('ResultadoFlujo'))
      .authorization((allow) => [allow.group('ABOGADO')])
      .handler(a.handler.function(flujoAsunto)),

    prepararContrato: a
      .mutation()
      .arguments({ solicitudId: a.id().required() })
      .returns(a.ref('ResultadoFlujo'))
      .authorization((allow) => [allow.group('CLIENTE')])
      .handler(a.handler.function(flujoAsunto)),

    aceptarContrato: a
      .mutation()
      .arguments({
        solicitudId: a.id().required(),
        aceptoDemostracion: a.boolean().required(),
      })
      .returns(a.ref('ResultadoFlujo'))
      .authorization((allow) => [allow.groups(['CLIENTE', 'ABOGADO'])])
      .handler(a.handler.function(flujoAsunto)),

    // Expediente: los mensajes se crean por la API (para disparar las suscripciones) desde la función.
    ResultadoExpediente: a.customType({
      id: a.id().required(),
      estado: a.string().required(),
    }),

    enviarMensaje: a
      .mutation()
      .arguments({ expedienteId: a.id().required(), texto: a.string().required() })
      .returns(a.ref('ResultadoExpediente'))
      .authorization((allow) => [allow.groups(['CLIENTE', 'ABOGADO'])])
      .handler(a.handler.function(flujoAsunto)),

    concluirExpediente: a
      .mutation()
      .arguments({ expedienteId: a.id().required() })
      .returns(a.ref('ResultadoExpediente'))
      .authorization((allow) => [allow.group('ABOGADO')])
      .handler(a.handler.function(flujoAsunto)),

    // NIA: orientación y clasificación con un modelo de Bedrock. Solo cuentas de cliente.
    NiaRespuesta: a.customType({
      respuesta: a.string().required(),
      materia: a.string(),
      titulo: a.string(),
      resumen: a.string(),
      datosFaltantes: a.string().array().required(),
      derivarAAbogado: a.boolean().required(),
      restantes: a.integer().required(),
    }),

    nia: a
      .mutation()
      .arguments({ mensajes: a.json().required() })
      .returns(a.ref('NiaRespuesta'))
      .authorization((allow) => [allow.group('CLIENTE')])
      .handler(a.handler.function(nia)),

    // Perfil profesional completo y privado. Publicación y verificación: solo ADMIN.
    PerfilAbogado: a
      .model({
        nombre: a.string().required(),
        fotoUrl: a.string(),
        cedula: a.string(),
        materias: a.ref('Materia').array().required(),
        especialidades: a.string().array(),
        ubicacion: a.string().required(),
        jurisdicciones: a.string().array(),
        idiomas: a.string().array(),
        aniosExperiencia: a.integer(),
        modalidad: a.ref('Modalidad').required(),
        honorariosDesde: a.float(),
        honorariosHasta: a.float(),
        disponibilidad: a.string(),
        semblanza: a.string(),
        // Vacío significa PENDIENTE (ver estadoVerificacionDe). Un valor por defecto aquí haría
        // fallar la creación, porque AppSync lo trata como un campo escrito por el cliente.
        estadoVerificacion: a
          .string()
          .authorization((allow) => [allow.owner().to(['read']), allow.group('ADMIN')]),
        // Vacío significa sin publicar.
        publicado: a
          .boolean()
          .authorization((allow) => [allow.owner().to(['read']), allow.group('ADMIN')]),
      })
      .authorization((allow) => [
        allow.owner().to(['create', 'read', 'update']),
        allow.group('ADMIN').to(['read', 'update']),
      ]),

    // Copia pública de un perfil ya revisado (sin cédula). Su `id` es el del PerfilAbogado.
    PerfilPublico: a
      .model({
        nombre: a.string().required(),
        fotoUrl: a.string(),
        materias: a.ref('Materia').array().required(),
        especialidades: a.string().array(),
        ubicacion: a.string().required(),
        jurisdicciones: a.string().array(),
        idiomas: a.string().array(),
        aniosExperiencia: a.integer(),
        modalidad: a.ref('Modalidad').required(),
        honorariosDesde: a.float(),
        honorariosHasta: a.float(),
        disponibilidad: a.string(),
        semblanza: a.string(),
        verificadoManual: a.boolean().required(),
      })
      .authorization((allow) => [
        allow.guest().to(['read']),
        allow.authenticated().to(['read']),
        allow.group('ADMIN'),
      ]),

    // Privado: solo la propia persona.
    PerfilCliente: a
      .model({
        nombre: a.string().required(),
        telefono: a.string(),
        ciudad: a.string(),
      })
      .authorization((allow) => [allow.owner().to(['create', 'read', 'update'])]),

    // El cliente describe y abre el asunto; `etapa` y `lectores` los escribe el servidor.
    Asunto: a
      .model({
        titulo: a.string().required(),
        descripcion: a.string().required(),
        materia: a.ref('Materia').required(),
        ubicacion: a.string().required(),
        modalidad: a.ref('Modalidad').required(),
        presupuestoMin: a.float(),
        presupuestoMax: a.float(),
        abierto: a.boolean().default(false),
        // Vacío significa SIN_CONTRATAR (ver etapaDe); los valores válidos son ETAPAS_ASUNTO.
        etapa: a
          .string()
          .authorization((allow) => [
            allow.owner().to(['read']),
            allow.ownersDefinedIn('lectores').to(['read']),
          ]),
        lectores: a
          .string()
          .array()
          .authorization((allow) => [allow.owner().to(['read'])]),
      })
      .authorization((allow) => [
        // Sin `delete`: con reglas por campo, AppSync no deja borrar el registro completo.
        allow.owner().to(['create', 'read', 'update']),
        allow.ownersDefinedIn('lectores').to(['read']),
      ]),

    // Contratación y expediente: lectura para participantes; escritura solo del servidor.
    Solicitud: a
      .model({
        asuntoId: a.id().required(),
        // Perfil público al que se envió (para mostrar su nombre); vacío en registros previos.
        perfilId: a.id(),
        clienteId: a.string().required(),
        abogadoId: a.string().required(),
        participantes: a.string().array().required(),
        estado: a.ref('EstadoSolicitud').required(),
        declaracionNoConflicto: a.boolean(),
        fechaDeclaracion: a.datetime(),
      })
      .secondaryIndexes((indice) => [indice('asuntoId'), indice('abogadoId')])
      .authorization((allow) => [allow.ownersDefinedIn('participantes').to(['read'])]),

    Propuesta: a
      .model({
        solicitudId: a.id().required(),
        participantes: a.string().array().required(),
        monto: a.float().required(),
        alcance: a.string().required(),
        formaDePago: a.string().required(),
      })
      .secondaryIndexes((indice) => [indice('solicitudId')])
      .authorization((allow) => [allow.ownersDefinedIn('participantes').to(['read'])]),

    Contrato: a
      .model({
        propuestaId: a.id().required(),
        asuntoId: a.id().required(),
        participantes: a.string().array().required(),
        texto: a.string().required(),
        honorarios: a.float().required(),
        comision: a.float().required(),
        abogadoRecibe: a.float().required(),
        estado: a.ref('EstadoContrato').required(),
        aceptadoCliente: a.datetime(),
        aceptadoAbogado: a.datetime(),
        // Versión (fecha) de la propuesta con la que se preparó; si cambia, el contrato ya no vale.
        propuestaVersion: a.string(),
      })
      .secondaryIndexes((indice) => [indice('propuestaId')])
      .authorization((allow) => [allow.ownersDefinedIn('participantes').to(['read'])]),

    Expediente: a
      .model({
        asuntoId: a.id().required(),
        contratoId: a.id().required(),
        participantes: a.string().array().required(),
        estado: a.ref('EstadoExpediente').required(),
      })
      .secondaryIndexes((indice) => [indice('asuntoId')])
      .authorization((allow) => [allow.ownersDefinedIn('participantes').to(['read'])]),

    Mensaje: a
      .model({
        expedienteId: a.id().required(),
        participantes: a.string().array().required(),
        autor: a.string().required(),
        texto: a.string().required(),
        creadoEn: a.datetime().required(),
      })
      .secondaryIndexes((indice) => [indice('expedienteId').sortKeys(['creadoEn'])])
      .authorization((allow) => [allow.ownersDefinedIn('participantes').to(['read'])]),

    Documento: a
      .model({
        expedienteId: a.id().required(),
        participantes: a.string().array().required(),
        nombre: a.string().required(),
        ruta: a.string().required(),
        tipo: a.string().required(),
        tamano: a.integer().required(),
        subidoPor: a.string().required(),
        creadoEn: a.datetime().required(),
      })
      .secondaryIndexes((indice) => [indice('expedienteId').sortKeys(['creadoEn'])])
      .authorization((allow) => [allow.ownersDefinedIn('participantes').to(['read'])]),

    Actuacion: a
      .model({
        expedienteId: a.id().required(),
        participantes: a.string().array().required(),
        tipo: a.string().required(),
        detalle: a.string().required(),
        creadoEn: a.datetime().required(),
      })
      .secondaryIndexes((indice) => [indice('expedienteId').sortKeys(['creadoEn'])])
      .authorization((allow) => [allow.ownersDefinedIn('participantes').to(['read'])]),
  })
  // La función del flujo usa la API con IAM para crear mensajes (y así disparar suscripciones).
  .authorization((allow) => [allow.resource(flujoAsunto)])

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
})
