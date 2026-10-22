import { Link } from 'react-router-dom'

export function NoEncontrada() {
  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">No encontramos esta página</h1>
        <p>La dirección no existe o cambió de lugar. Vuelve al inicio para continuar.</p>
        <Link className="boton boton--primario" to="/">
          Ir al inicio
        </Link>
      </div>
    </section>
  )
}
