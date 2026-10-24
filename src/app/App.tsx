import { Route, Routes } from 'react-router-dom'
import { AsuntoDetalle } from '../features/asuntos/AsuntoDetalle'
import { MisAsuntos } from '../features/asuntos/MisAsuntos'
import { EditarAsunto, NuevoAsunto } from '../features/asuntos/NuevoAsunto'
import { Comparar } from '../features/coincidencias/Comparar'
import { Coincidencias } from '../features/coincidencias/Coincidencias'
import { SolicitudesAbogado } from '../features/solicitudes/SolicitudesAbogado'
import { ContratoPagina } from '../features/contratos/ContratoPagina'
import { ExpedientePagina } from '../features/expedientes/ExpedientePagina'
import { MisExpedientes } from '../features/expedientes/MisExpedientes'
import { AvisoPrivacidad } from '../features/legal/AvisoPrivacidad'
import { Terminos } from '../features/legal/Terminos'
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
          <Route path="/mi-espacio/solicitudes" element={<SolicitudesAbogado />} />
          <Route path="/mi-espacio/expedientes" element={<MisExpedientes />} />
          <Route path="/expedientes/:id" element={<ExpedientePagina />} />
          <Route path="/contratos/:id" element={<ContratoPagina />} />
          <Route path="/admin" element={<Panel />} />
          <Route path="/mi-espacio/asuntos" element={<MisAsuntos />} />
          <Route path="/mi-espacio/asuntos/nuevo" element={<NuevoAsunto />} />
          <Route path="/mi-espacio/asuntos/:id" element={<AsuntoDetalle />} />
          <Route path="/mi-espacio/asuntos/:id/editar" element={<EditarAsunto />} />
          <Route
            path="/mi-espacio/asuntos/:id/coincidencias"
            element={<Coincidencias />}
          />
          <Route path="/mi-espacio/asuntos/:id/comparar" element={<Comparar />} />
          <Route path="/privacidad" element={<AvisoPrivacidad />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
