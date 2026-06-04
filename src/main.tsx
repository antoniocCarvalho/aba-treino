import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ParentView } from './pages/ParentView'

// Portal para pais: link público read-only (?share=TOKEN), sem login nem app.
const shareToken = new URLSearchParams(window.location.search).get('share')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shareToken ? <ParentView token={shareToken} /> : <App />}
  </StrictMode>,
)
