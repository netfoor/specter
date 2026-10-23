import { defineBackend } from '@aws-amplify/backend'
import { RemovalPolicy, Stack } from 'aws-cdk-lib'
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
backend.addOutput({ custom: { niaUsoTabla: tablaUsoNia.tableName } })

// Flujo de contratación: solo las operaciones que usa sobre cada tabla.
const flujo = backend.flujoAsunto
const permisosFlujo: Record<string, string[]> = {
  Asunto: ['dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:ConditionCheckItem'],
  Solicitud: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:ConditionCheckItem',
  ],
  Propuesta: ['dynamodb:UpdateItem'],
  PerfilAbogado: ['dynamodb:GetItem'],
  PerfilPublico: ['dynamodb:GetItem'],
}
for (const [modelo, acciones] of Object.entries(permisosFlujo)) {
  const tabla = backend.data.resources.tables[modelo]
  flujo.resources.lambda.addToRolePolicy(
    new PolicyStatement({ actions: acciones, resources: [tabla.tableArn] }),
  )
  flujo.addEnvironment(`TABLA_${modelo.toUpperCase()}`, tabla.tableName)
}
