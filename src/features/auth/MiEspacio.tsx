import { signOut } from 'aws-amplify/auth'
import { Navigate } from 'react-router-dom'
import type { Rol } from '../../../shared/domain/roles'
import { useSesion } from './useSesion'

const DESCRIPCION: Record<Rol, string> = {
  CLIENTE: 'Cuenta de cliente. Aquí podrás describir tu asunto y comparar abogados.',
  ABOGADO: 'Cuenta de abogado. Aquí podrás mantener tu perfil y atender solicitudes.',
  ADMIN: 'Cuenta de administración. Aquí podrás revisar y publicar perfiles.',
}

export function MiEspacio() {
  const sesion = useSesion()

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

  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">Hola{sesion.nombre ? `, ${sesion.nombre}` : ''}</h1>
        {sesion.rol ? (
          <p className="entrada">{DESCRIPCION[sesion.rol]}</p>
        ) : (
          <p className="aviso">
            Tu cuenta todavía no tiene un rol asignado. Cierra sesión y vuelve a ingresar;
            si sigue igual, avisa al equipo.
          </p>
        )}
        <p className="nota">
          Estas funciones se activan en las siguientes entregas del prototipo. Por ahora
          solo puedes confirmar que tu cuenta funciona.
        </p>
        <div className="acciones">
          <button className="boton boton--secundario" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </section>
  )
}
