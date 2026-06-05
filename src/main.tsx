import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Portal para pais: link público read-only (?share=TOKEN), sem login nem app.
const ParentView = lazy(() => import('./pages/ParentView').then(m => ({ default: m.ParentView })))
const shareToken = new URLSearchParams(window.location.search).get('share')

const Spinner = (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
  </div>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shareToken
      ? <Suspense fallback={Spinner}><ParentView token={shareToken} /></Suspense>
      : <App />}
  </StrictMode>,
)
