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
          <svg className="marca__signo" viewBox="0 0 28 12" aria-hidden="true">
            <line x1="1" y1="6" x2="19" y2="6" />
            <circle cx="23" cy="6" r="3.5" />
          </svg>
          Specter
        </Link>
        <nav aria-label="Principal" className="nav">
          <Link to="/abogados">Abogados</Link>
          <a className="nav__ancla" href="/#recorrido">
            Recorrido
          </a>
          <a className="nav__ancla" href="/#alcance">
            Alcance
          </a>
          <a className="nav__ancla" href="/#nia">
            NIA
          </a>
          {backendConfigurado && sesion.estado === 'anonimo' && (
            <Link to="/ingresar">Ingresar</Link>
          )}
          {sesion.estado === 'autenticado' && <Link to="/mi-espacio">Mi espacio</Link>}
        </nav>
      </div>
    </header>
  )
}
