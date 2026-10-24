import { Link } from 'react-router-dom'
import { PENDIENTE, RESPONSABLE } from './responsable'

/**
 * Aviso de privacidad simplificado para el registro en línea (LFPDPPP 2025, art. 16 fr. II):
 * fracciones I a IV del artículo 15 y dónde consultar el aviso integral.
 */
export function AvisoSimplificado() {
  return (
    <div className="aviso-legal">
      <p>
        <strong>Aviso de privacidad simplificado.</strong> Responsable:{' '}
        {RESPONSABLE.nombre ?? PENDIENTE}. Tratamos tu nombre, tu correo y lo que
        registres en la plataforma (perfil, asuntos, mensajes y documentos) para crear tu
        cuenta y operar esta demostración. No los usamos para otros fines ni los vendemos.
        Puedes pedir que dejemos de usarlos o que los borremos escribiendo al responsable.
      </p>
      <p>
        Consulta el <Link to="/privacidad">aviso de privacidad integral</Link> y los{' '}
        <Link to="/terminos">términos de uso de la demostración</Link>. Al crear tu cuenta
        los aceptas.
      </p>
    </div>
  )
}
