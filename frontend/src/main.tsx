import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'

// Use VITE_API_URL env variable in production, fallback to relative proxy in development
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

