/** Página corta con un título y un mensaje, para estados sin contenido o sin acceso. */
export function Aviso({ titulo, children }: { titulo: string; children: string }) {
  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto">
        <h1 className="titulo-pagina">{titulo}</h1>
        <p className="entrada">{children}</p>
      </div>
    </section>
  )
}
