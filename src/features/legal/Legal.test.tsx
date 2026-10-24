import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../app/App'
import { AvisoSimplificado } from './AvisoSimplificado'

function renderizar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Aviso de privacidad integral', () => {
  it('contiene los elementos que exige el artículo 15 de la LFPDPPP', () => {
    renderizar('/privacidad')
    for (const titulo of [
      '1. Responsable',
      '2. Datos personales que tratamos',
      '3. Finalidades',
      '4. Quién más accede y cómo limitar el uso',
      '5. Derechos de acceso, rectificación, cancelación y oposición',
      '6. Cambios a este aviso',
    ]) {
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument()
    }
  })

  it('identifica al responsable y dice qué datos siguen pendientes', () => {
    renderizar('/privacidad')
    expect(screen.getByText(/pendiente de revisión jurídica/)).toBeInTheDocument()
    expect(
      screen.getByText(
        /Nombre o razón social: Fortino Romero Mantilla\. Domicilio: Pendiente de definir/,
      ),
    ).toBeInTheDocument()
  })

  it('declara a los proveedores tecnológicos y el plazo de respuesta', () => {
    renderizar('/privacidad')
    expect(screen.getByText(/Amazon Web Services/)).toBeInTheDocument()
    expect(screen.getByText(/plazo máximo de veinte días/)).toBeInTheDocument()
  })
})

describe('Términos de uso', () => {
  it('dejan claro lo que la demostración no hace', () => {
    renderizar('/terminos')
    expect(
      screen.getByRole('heading', { name: 'Términos de uso de la demostración' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Los contratos son de demostración y no tienen validez jurídica.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'No se cobra ni se mueve dinero. Los montos y desgloses son ilustrativos.',
      ),
    ).toBeInTheDocument()
  })
})

describe('Enlaces', () => {
  it('el pie de todas las páginas enlaza al aviso y a los términos', () => {
    renderizar('/')
    expect(screen.getByRole('link', { name: 'Aviso de privacidad' })).toHaveAttribute(
      'href',
      '/privacidad',
    )
    expect(screen.getByRole('link', { name: 'Términos de uso' })).toHaveAttribute(
      'href',
      '/terminos',
    )
  })

  it('el aviso simplificado del registro enlaza al integral y a los términos', () => {
    render(
      <MemoryRouter>
        <AvisoSimplificado />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Responsable: Fortino Romero Mantilla/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'aviso de privacidad integral' }),
    ).toHaveAttribute('href', '/privacidad')
    expect(
      screen.getByRole('link', { name: 'términos de uso de la demostración' }),
    ).toHaveAttribute('href', '/terminos')
  })
})
