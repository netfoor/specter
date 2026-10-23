import type { ReactNode } from 'react'

type Props = {
  id: string
  etiqueta: string
  ayuda?: string
  error?: string
  children: ReactNode
}

/** Etiqueta, ayuda y error de un campo de formulario, enlazados por accesibilidad. */
export function Campo({ id, etiqueta, ayuda, error, children }: Props) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {ayuda && (
        <p className="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      )}
      {children}
      {error && (
        <p className="campo__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
