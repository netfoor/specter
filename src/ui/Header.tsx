import { Link } from 'react-router-dom'
import { backendConfigurado } from '../app/amplify'
import { useSesion } from '../features/auth/useSesion'

export function Header() {
  const sesion = useSesion()
  return (
    <header className="header">
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <div className="contenedor header__fila">
        <Link to="/" className="marca" aria-label="Specter, inicio">
          <img src="/logotipo-96.png" alt="" width={44} height={44} />
          <span>specter</span>
        </Link>
        <nav aria-label="Principal" className="nav">
          <Link className="nav__ancla" to="/abogados">
            Abogados
          </Link>
          <a className="nav__ancla" href="/#recorrido">
            Cómo funciona
          </a>
          <a className="nav__ancla" href="/#nia">
            NIA
          </a>
          {backendConfigurado && sesion.estado === 'anonimo' && (
            <>
              <Link to="/ingresar">Ingresar</Link>
              <Link className="nav__registro" to="/ingresar?registro">
                Crear cuenta
              </Link>
            </>
          )}
          {sesion.estado === 'autenticado' && sesion.rol === 'ADMIN' && (
            <Link className="nav__ancla" to="/admin">
              Administración
            </Link>
          )}
          {sesion.estado === 'autenticado' && <Link to="/mi-espacio">Mi espacio</Link>}
        </nav>
      </div>
    </header>
  )
}
