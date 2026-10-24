import { Link } from 'react-router-dom'
import { PENDIENTE, RESPONSABLE, ULTIMA_ACTUALIZACION } from './responsable'

/** Términos de uso del entorno de demostración. */
export function Terminos() {
  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto texto-legal">
        <h1 className="titulo-pagina">Términos de uso de la demostración</h1>
        <p className="aviso">
          Versión para el entorno de demostración de Specter, pendiente de revisión
          jurídica.
        </p>
        <p className="nota">Última actualización: {ULTIMA_ACTUALIZACION}.</p>

        <h2 className="subtitulo">1. Qué es este entorno</h2>
        <p>
          Specter está en construcción. Este entorno sirve para mostrar el funcionamiento
          de la plataforma y recibir comentarios. No es un servicio en operación y puede
          cambiar, interrumpirse o reiniciarse en cualquier momento, incluidos sus datos.
        </p>

        <h2 className="subtitulo">2. Lo que este entorno no hace</h2>
        <ul>
          <li>Specter no es un despacho y no presta asesoría jurídica.</li>
          <li>
            NIA orienta y clasifica; no sustituye a un abogado ni presta servicios
            jurídicos.
          </li>
          <li>Los contratos son de demostración y no tienen validez jurídica.</li>
          <li>
            No se cobra ni se mueve dinero. Los montos y desgloses son ilustrativos.
          </li>
          <li>
            La verificación de abogados es una revisión manual de demostración; no es una
            verificación de identidad.
          </li>
        </ul>

        <h2 className="subtitulo">3. Cómo usarlo</h2>
        <ul>
          <li>
            No ingreses información real tuya ni de otras personas: ni datos personales,
            ni detalles de asuntos reales, ni documentos reales.
          </li>
          <li>Cuida tu contraseña; eres responsable de lo que se haga con tu cuenta.</li>
          <li>
            No subas contenido ilícito, ofensivo o que infrinja derechos de terceros, ni
            intentes acceder a información de otras personas.
          </li>
        </ul>

        <h2 className="subtitulo">4. Datos personales</h2>
        <p>
          El tratamiento de tus datos se describe en el{' '}
          <Link to="/privacidad">aviso de privacidad</Link>.
        </p>

        <h2 className="subtitulo">5. Contacto</h2>
        <p>
          Responsable: {RESPONSABLE.nombre ?? PENDIENTE}. Correo:{' '}
          {RESPONSABLE.correo ?? PENDIENTE}.
        </p>
      </div>
    </section>
  )
}
