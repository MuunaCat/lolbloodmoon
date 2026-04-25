import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import OverlayApp from './pages/Overlay'
import './index.css'

const isOverlay = new URLSearchParams(window.location.search).get('overlay') === 'true'
if (isOverlay) document.body.classList.add('overlay-mode')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isOverlay ? <OverlayApp /> : <App />}
  </React.StrictMode>
)
