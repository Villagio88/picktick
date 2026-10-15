import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Zugang } from './components/Zugang'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Zugang>
      <App />
    </Zugang>
  </StrictMode>,
)
