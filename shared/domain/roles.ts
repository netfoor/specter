/** Roles que una persona puede elegir al registrarse. ADMIN nunca se autoasigna. */
export const ROLES_DE_REGISTRO = ['CLIENTE', 'ABOGADO'] as const
export type RolDeRegistro = (typeof ROLES_DE_REGISTRO)[number]
export type Rol = RolDeRegistro | 'ADMIN'

/** Valida el rol enviado en el registro; cualquier otro valor (incluido ADMIN) se descarta. */
export function rolDeRegistro(valor: unknown): RolDeRegistro | null {
  return ROLES_DE_REGISTRO.find((rol) => rol === valor) ?? null
}

const PRIORIDAD: readonly Rol[] = ['ADMIN', 'ABOGADO', 'CLIENTE']

/** Rol efectivo a partir de los grupos de Cognito; el de mayor prioridad gana. */
export function rolDeGrupos(grupos: unknown): Rol | null {
  if (!Array.isArray(grupos)) return null
  return PRIORIDAD.find((rol) => grupos.includes(rol)) ?? null
}
