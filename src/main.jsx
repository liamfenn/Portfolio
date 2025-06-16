import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { MusicPlayerProvider } from './contexts/MusicPlayerContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MusicPlayerProvider>
      <App />
    </MusicPlayerProvider>
  </React.StrictMode>,
)
