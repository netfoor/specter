import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor">
        <p>
          Specter es un prototipo en construcción. Las funciones descritas aquí se
          publican conforme se implementan y las capacidades marcadas como «Próximamente»
          no existen todavía.
        </p>
        <p>Specter no es un despacho ni presta asesoría jurídica.</p>
        <p className="footer__enlaces">
          <Link to="/privacidad">Aviso de privacidad</Link>
          <Link to="/terminos">Términos de uso</Link>
          <a href="https://github.com/netfoor/specter" rel="noreferrer">
            Código del proyecto
          </a>
        </p>
      </div>
    </footer>
  )
}
