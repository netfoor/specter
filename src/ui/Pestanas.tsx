import {
  FolderOpen,
  House,
  Inbox,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Rol } from '../../shared/domain/roles'
import { useSesion } from '../features/auth/useSesion'

type Pestana = { ruta: string; etiqueta: string; Icono: LucideIcon }

const INICIO: Pestana = { ruta: '/mi-espacio', etiqueta: 'Inicio', Icono: House }
const EXPEDIENTES: Pestana = {
  ruta: '/mi-espacio/expedientes',
  etiqueta: 'Expedientes',
  Icono: MessageCircle,
}
const ABOGADOS: Pestana = { ruta: '/abogados', etiqueta: 'Abogados', Icono: Search }

export const PESTANAS: Record<Rol, Pestana[]> = {
  CLIENTE: [
    INICIO,
    { ruta: '/mi-espacio/asuntos', etiqueta: 'Asuntos', Icono: FolderOpen },
    ABOGADOS,
    EXPEDIENTES,
  ],
  ABOGADO: [
    INICIO,
    { ruta: '/mi-espacio/solicitudes', etiqueta: 'Solicitudes', Icono: Inbox },
    EXPEDIENTES,
    { ruta: '/mi-espacio/perfil', etiqueta: 'Mi perfil', Icono: UserRound },
  ],
  ADMIN: [INICIO, { ruta: '/admin', etiqueta: 'Revisión', Icono: ShieldCheck }, ABOGADOS],
}

/** La pestaña activa es la de ruta más larga que contiene a la actual. */
export function pestanaActiva(pestanas: Pestana[], ruta: string): string | null {
  const candidatas = pestanas
    .map((p) => p.ruta)
    .filter((r) => ruta === r || ruta.startsWith(`${r}/`))
  if (ruta.startsWith('/expedientes/') || ruta.startsWith('/contratos/'))
    candidatas.push(EXPEDIENTES.ruta)
  return candidatas.sort((a, b) => b.length - a.length)[0] ?? null
}

/** Barra de pestañas para el teléfono; en pantallas anchas la oculta el CSS. */
export function Pestanas() {
  const sesion = useSesion()
  const { pathname } = useLocation()
  const pestanas =
    sesion.estado === 'autenticado' && sesion.rol ? PESTANAS[sesion.rol] : []
  const visible = pestanas.length > 0

  useEffect(() => {
    document.body.classList.toggle('con-pestanas', visible)
    return () => document.body.classList.remove('con-pestanas')
  }, [visible])

  if (!visible) return null
  const activa = pestanaActiva(pestanas, pathname)
  return (
    <nav className="pestanas" aria-label="Secciones">
      {pestanas.map(({ ruta, etiqueta, Icono }) => (
        <Link key={ruta} to={ruta} aria-current={ruta === activa ? 'page' : undefined}>
          <Icono size={24} aria-hidden="true" />
          {etiqueta}
        </Link>
      ))}
    </nav>
  )
}
