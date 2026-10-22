import { Authenticator } from '@aws-amplify/ui-react'
import { I18n } from 'aws-amplify/utils'
import { translations } from '@aws-amplify/ui-react'
import { Navigate } from 'react-router-dom'
import { backendConfigurado } from '../../app/amplify'
import { ROLES_DE_REGISTRO } from '../../../shared/domain/roles'

I18n.putVocabularies(translations)
I18n.setLanguage('es')

const formFields = {
  signUp: {
    name: { label: 'Nombre completo', placeholder: 'Nombre y apellidos', order: 1 },
    email: { order: 2 },
    password: { order: 3 },
    confirm_password: { order: 4 },
  },
}

const components = {
  SignUp: {
    FormFields() {
      return (
        <>
          <Authenticator.SignUp.FormFields />
          <fieldset className="rol-registro">
            <legend>¿Cómo usarás Specter?</legend>
            <label>
              <input type="radio" name="custom:rol" value={ROLES_DE_REGISTRO[0]} />
              Busco un abogado
            </label>
            <label>
              <input type="radio" name="custom:rol" value={ROLES_DE_REGISTRO[1]} />
              Soy abogado
            </label>
          </fieldset>
        </>
      )
    },
  },
}

const services = {
  async validateCustomSignUp(formData: Record<string, string>) {
    if (!ROLES_DE_REGISTRO.some((rol) => rol === formData['custom:rol'])) {
      return { 'custom:rol': 'Elige cómo usarás Specter.' }
    }
  },
}

export function Ingresar() {
  if (!backendConfigurado) {
    return (
      <section className="seccion">
        <div className="contenedor contenedor--angosto">
          <h1 className="titulo-pagina">El inicio de sesión no está disponible aquí</h1>
          <p className="entrada">
            Este entorno todavía no tiene conectado el servicio de cuentas. Vuelve más
            tarde.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="seccion ingreso">
      <div className="contenedor">
        <Authenticator
          formFields={formFields}
          components={components}
          services={services}
        >
          <Navigate to="/mi-espacio" replace />
        </Authenticator>
      </div>
    </section>
  )
}
