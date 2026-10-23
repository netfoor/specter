import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Rol } from '../../../shared/domain/roles'
import { backendConfigurado } from '../../app/amplify'
import { Aviso } from '../../ui/Aviso'
import { useSesion } from './useSesion'

type Props = { rol: Rol | Rol[]; sinAcceso: string; children: ReactNode }

/** Muestra `children` solo a personas con sesión y con alguno de los roles indicados. */
export function ProtegerRol({ rol, sinAcceso, children }: Props) {
  const sesion = useSesion()

  if (!backendConfigurado) {
    return (
      <Aviso titulo="Esta sección no está disponible aquí">
        Este entorno todavía no tiene conectado el servicio de cuentas y datos.
      </Aviso>
    )
  }
  if (sesion.estado === 'cargando') {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <p role="status">Cargando tu cuenta…</p>
        </div>
      </section>
    )
  }
  if (sesion.estado === 'anonimo') return <Navigate to="/ingresar" replace />
  const permitidos = Array.isArray(rol) ? rol : [rol]
  if (!sesion.rol || !permitidos.includes(sesion.rol))
    return <Aviso titulo={sinAcceso}>Tu cuenta no tiene este tipo de acceso.</Aviso>
  return <>{children}</>
}
