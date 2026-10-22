import { Link } from 'react-router-dom'

export function Header() {
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
          <a href="/#recorrido">Recorrido</a>
          <a href="/#alcance">Alcance</a>
          <a href="/#nia">NIA</a>
        </nav>
      </div>
    </header>
  )
}
