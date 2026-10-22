export const TEXTO_DEMO = 'Entorno de demostración: no ingreses información real.'

export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      {TEXTO_DEMO}
    </div>
  )
}
