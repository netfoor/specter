import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './app/amplify'
import { App } from './app/App'
import '@aws-amplify/ui-react/styles.css'
import '@fontsource-variable/inter'
import './ui/tokens.css'
import './ui/base.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
