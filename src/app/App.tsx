import { Route, Routes } from 'react-router-dom'
import { Panel } from '../features/admin/Panel'
import { Ingresar } from '../features/auth/Ingresar'
import { MiEspacio } from '../features/auth/MiEspacio'
import { Directorio } from '../features/perfiles/Directorio'
import { EditarPerfil } from '../features/perfiles/EditarPerfil'
import { PerfilDetalle } from '../features/perfiles/PerfilDetalle'
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
          <Route path="/abogados" element={<Directorio />} />
          <Route path="/abogados/:id" element={<PerfilDetalle />} />
          <Route path="/mi-espacio/perfil" element={<EditarPerfil />} />
          <Route path="/admin" element={<Panel />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
