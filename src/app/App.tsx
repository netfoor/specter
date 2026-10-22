import { Route, Routes } from 'react-router-dom'
import { Ingresar } from '../features/auth/Ingresar'
import { MiEspacio } from '../features/auth/MiEspacio'
import { Landing } from '../features/landing/Landing'
import { NoEncontrada } from '../features/landing/NoEncontrada'
import { DemoBanner } from '../ui/DemoBanner'
import { Footer } from '../ui/Footer'
import { Header } from '../ui/Header'

export function App() {
  return (
    <>
      <div className="cabecera">
        <DemoBanner />
        <Header />
      </div>
      <main id="contenido">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/mi-espacio" element={<MiEspacio />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
