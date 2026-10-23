import { defineBackend } from '@aws-amplify/backend'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { indicadores } from './functions/indicadores/resource'

const backend = defineBackend({ auth, data, indicadores })

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
