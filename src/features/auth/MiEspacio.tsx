import { signOut } from 'aws-amplify/auth'
import {
  FolderOpen,
  Inbox,
  LogOut,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import type { Rol } from '../../../shared/domain/roles'
import { useSesion } from './useSesion'

const DESCRIPCION: Record<Rol, string> = {
  CLIENTE:
    'Cuenta de cliente. Describe tu asunto, compara abogados y sigue tu expediente.',
  ABOGADO:
    'Cuenta de abogado. Mantén tu perfil, atiende solicitudes y lleva tus expedientes.',
  ADMIN: 'Cuenta de administración. Revisa y publica perfiles de abogados.',
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

  const rol = sesion.rol
  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">Hola{sesion.nombre ? `, ${sesion.nombre}` : ''}</h1>
        {rol ? (
          <p className="entrada">{DESCRIPCION[rol]}</p>
        ) : (
          <p className="aviso">
            Tu cuenta todavía no tiene un rol asignado. Cierra sesión y vuelve a ingresar;
            si sigue igual, avisa al equipo.
          </p>
        )}

        <div className="mosaico">
          {rol === 'CLIENTE' && (
            <Link className="mosaico__principal" to="/mi-espacio/asuntos">
              <FolderOpen size={26} aria-hidden="true" />
              Mis asuntos
            </Link>
          )}
          {rol === 'ABOGADO' && (
            <Link className="mosaico__principal" to="/mi-espacio/solicitudes">
              <Inbox size={26} aria-hidden="true" />
              Solicitudes recibidas
            </Link>
          )}
          {rol === 'ADMIN' && (
            <Link className="mosaico__principal" to="/admin">
              <ShieldCheck size={26} aria-hidden="true" />
              Revisar perfiles
            </Link>
          )}
          {(rol === 'CLIENTE' || rol === 'ABOGADO') && (
            <Link to="/mi-espacio/expedientes">
              <MessageCircle size={26} aria-hidden="true" />
              Mis expedientes
            </Link>
          )}
          {rol === 'ABOGADO' && (
            <Link to="/mi-espacio/perfil">
              <UserRound size={26} aria-hidden="true" />
              Editar mi perfil profesional
            </Link>
          )}
          <Link to="/abogados">
            <Search size={26} aria-hidden="true" />
            Ver abogados
          </Link>
          <button type="button" onClick={() => void signOut()}>
            <LogOut size={26} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </section>
  )
}
