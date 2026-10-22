import { Route, Routes } from 'react-router-dom'
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
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
