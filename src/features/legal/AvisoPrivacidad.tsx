import { Link } from 'react-router-dom'
import { PENDIENTE, RESPONSABLE, ULTIMA_ACTUALIZACION } from './responsable'

/** Aviso de privacidad integral, con los elementos del artículo 15 de la LFPDPPP 2025. */
export function AvisoPrivacidad() {
  return (
    <section className="seccion">
      <div className="contenedor contenedor--angosto texto-legal">
        <h1 className="titulo-pagina">Aviso de privacidad</h1>
        <p className="aviso">
          Versión para el entorno de demostración de Specter, pendiente de revisión
          jurídica. Antes de recabar datos de personas reales deben completarse la
          identidad y el domicilio del responsable.
        </p>
        <p className="nota">Última actualización: {ULTIMA_ACTUALIZACION}.</p>

        <h2 className="subtitulo">1. Responsable</h2>
        <p>
          Nombre o razón social: {RESPONSABLE.nombre ?? PENDIENTE}. Domicilio:{' '}
          {RESPONSABLE.domicilio ?? PENDIENTE}. Correo de contacto:{' '}
          {RESPONSABLE.correo ?? PENDIENTE}.
        </p>

        <h2 className="subtitulo">2. Datos personales que tratamos</h2>
        <ul>
          <li>
            Cuenta: nombre, correo electrónico y tipo de cuenta (cliente o abogado). La
            contraseña la gestiona el servicio de autenticación y Specter no la conoce.
          </li>
          <li>
            Perfil profesional de abogados: nombre, materias, especialidades, ciudad,
            jurisdicciones, idiomas, experiencia, rango de honorarios, disponibilidad,
            semblanza y número de cédula profesional. La cédula no se publica.
          </li>
          <li>
            Asuntos: lo que la persona describe sobre su problema legal, la ciudad, la
            modalidad de atención y el presupuesto.
          </li>
          <li>
            Contratación y expediente: solicitudes, propuestas de honorarios, contratos de
            demostración, mensajes y documentos que suban las partes.
          </li>
          <li>
            Conversaciones con NIA: se envían a un modelo de inteligencia artificial para
            generar la respuesta y no se guardan; solo se cuenta el número de mensajes
            diarios.
          </li>
        </ul>
        <p>
          Specter no solicita datos personales sensibles. Por su naturaleza, la
          descripción de un asunto o un documento podría contenerlos: en esta demostración
          no ingreses información real tuya ni de otras personas.
        </p>

        <h2 className="subtitulo">3. Finalidades</h2>
        <p>Necesarias para el servicio (no requieren un consentimiento adicional):</p>
        <ul>
          <li>Crear y administrar tu cuenta.</li>
          <li>Mostrar los perfiles de abogados que un administrador revisó y publicó.</li>
          <li>
            Mostrar abogados compatibles con tu asunto y permitirte enviarles solicitudes.
          </li>
          <li>
            Preparar contratos de demostración y operar el expediente entre las partes.
          </li>
          <li>
            Orientarte con NIA y calcular indicadores agregados de uso de la demostración.
          </li>
        </ul>
        <p>
          No usamos tus datos para publicidad, perfilamiento comercial ni finalidades
          distintas de las anteriores, y no los vendemos.
        </p>

        <h2 className="subtitulo">4. Quién más accede y cómo limitar el uso</h2>
        <p>
          Un asunto solo lo ven su cliente y los abogados a quienes les envía una
          solicitud. Un expediente, sus mensajes y sus documentos solo los ven sus dos
          partes. El perfil de un abogado es público solo después de que un administrador
          lo revisa.
        </p>
        <p>
          La plataforma opera en los servicios de Amazon Web Services (región us-east-1,
          Estados Unidos), que actúan como proveedores tecnológicos: alojamiento,
          autenticación, base de datos, almacenamiento de documentos y el modelo de
          inteligencia artificial de NIA.
        </p>
        <p>
          Para limitar el uso o la divulgación de tus datos, escribe al correo del
          responsable: {RESPONSABLE.correo ?? PENDIENTE}.
        </p>

        <h2 className="subtitulo">
          5. Derechos de acceso, rectificación, cancelación y oposición
        </h2>
        <p>
          Puedes pedir acceso a tus datos, corregirlos, cancelarlos u oponerte a su
          tratamiento escribiendo al correo del responsable (
          {RESPONSABLE.correo ?? PENDIENTE}). Indica tu nombre, el correo de tu cuenta y
          qué derecho quieres ejercer. Te responderemos en un plazo máximo de veinte días,
          conforme al artículo 31 de la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares.
        </p>
        <p>
          La autoridad en materia de protección de datos personales es la Secretaría
          Anticorrupción y Buen Gobierno.
        </p>

        <h2 className="subtitulo">6. Cambios a este aviso</h2>
        <p>
          Publicaremos cualquier cambio en esta misma página con su fecha de
          actualización. Si un cambio implica una finalidad nueva, te pediremos tu
          consentimiento.
        </p>

        <p className="nota">
          Consulta también los{' '}
          <Link to="/terminos">términos de uso de la demostración</Link>.
        </p>
      </div>
    </section>
  )
}
