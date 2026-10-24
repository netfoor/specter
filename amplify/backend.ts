import { defineBackend } from '@aws-amplify/backend'
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { flujoAsunto } from './functions/flujo-asunto/resource'
import { indicadores } from './functions/indicadores/resource'
import { nia } from './functions/nia-chat/resource'

const backend = defineBackend({ auth, data, flujoAsunto, indicadores, nia })

// `indicadores` solo cuenta: lectura de las tablas que cuenta y listado de miembros de grupos.
const funcion = backend.indicadores
for (const modelo of [
  'PerfilAbogado',
  'PerfilPublico',
  'Asunto',
  'Solicitud',
  'Expediente',
]) {
  const tabla = backend.data.resources.tables[modelo]
  tabla.grantReadData(funcion.resources.lambda)
  funcion.addEnvironment(`TABLA_${modelo.toUpperCase()}`, tabla.tableName)
}
funcion.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId)
funcion.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['cognito-idp:ListUsersInGroup'],
    resources: [backend.auth.resources.userPool.userPoolArn],
  }),
)

// NIA: contador diario de mensajes por persona y permiso para invocar solo el modelo configurado.
const modeloNia = process.env.NIA_MODEL_ID ?? 'amazon.nova-lite-v1:0'
const funcionNia = backend.nia
const pilaNia = backend.createStack('nia')
const tablaUsoNia = new Table(pilaNia, 'UsoNia', {
  partitionKey: { name: 'clave', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'expira',
  removalPolicy: RemovalPolicy.DESTROY,
})
funcionNia.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:UpdateItem'],
    resources: [tablaUsoNia.tableArn],
  }),
)
funcionNia.addEnvironment('TABLA_USO_NIA', tablaUsoNia.tableName)
funcionNia.addEnvironment('NIA_MODEL_ID', modeloNia)
funcionNia.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:${Stack.of(funcionNia.resources.lambda).region}::foundation-model/${modeloNia}`,
    ],
  }),
)

// Flujo de contratación: solo las operaciones que usa sobre cada tabla.
const flujo = backend.flujoAsunto
const permisosFlujo: Record<string, string[]> = {
  Asunto: ['dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:ConditionCheckItem'],
  Solicitud: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:ConditionCheckItem',
    'dynamodb:Query',
  ],
  Propuesta: ['dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:ConditionCheckItem'],
  PerfilAbogado: ['dynamodb:GetItem'],
  PerfilPublico: ['dynamodb:GetItem'],
  Contrato: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:DeleteItem',
    'dynamodb:ConditionCheckItem',
  ],
  Expediente: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'],
  Actuacion: ['dynamodb:PutItem'],
  Documento: ['dynamodb:GetItem', 'dynamodb:PutItem'],
}
for (const [modelo, acciones] of Object.entries(permisosFlujo)) {
  const tabla = backend.data.resources.tables[modelo]
  flujo.resources.lambda.addToRolePolicy(
    // El índice permite encontrar las demás solicitudes del asunto al cerrar la contratación.
    new PolicyStatement({
      actions: acciones,
      resources: [tabla.tableArn, `${tabla.tableArn}/index/*`],
    }),
  )
  flujo.addEnvironment(`TABLA_${modelo.toUpperCase()}`, tabla.tableName)
}
flujo.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId)
flujo.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['cognito-idp:AdminGetUser'],
    resources: [backend.auth.resources.userPool.userPoolArn],
  }),
)

// Documentos del expediente: bucket privado; solo se accede con enlaces firmados por la función.
const pilaDocumentos = backend.createStack('documentos')
const documentos = new Bucket(pilaDocumentos, 'Documentos', {
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  encryption: BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  // Datos de demostración: se eliminan con el backend.
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  lifecycleRules: [{ abortIncompleteMultipartUploadAfter: Duration.days(1) }],
  cors: [
    {
      allowedMethods: [HttpMethods.POST, HttpMethods.GET],
      allowedOrigins: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://specter.foor.dev',
        'https://*.amplifyapp.com',
      ],
      allowedHeaders: ['*'],
      maxAge: 3000,
    },
  ],
})
flujo.addEnvironment('BUCKET_DOCUMENTOS', documentos.bucketName)
flujo.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:PutObject', 's3:GetObject'],
    resources: [documentos.arnForObjects('expedientes/*')],
  }),
)
backend.addOutput({
  custom: { niaUsoTabla: tablaUsoNia.tableName, documentosBucket: documentos.bucketName },
})
