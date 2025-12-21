import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster
      position="top-center"
      richColors
      dir="rtl"
      duration={6000}
      expand={true}
      closeButton={true}
    />
  </>,
)
