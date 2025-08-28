// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'

// Tabler tema + JS
import '@tabler/core/dist/css/tabler.min.css'
import '@tabler/core/dist/js/tabler.min.js'
import './Styles/Global.css';

// Tabler ikonları
import '@tabler/icons-webfont/dist/tabler-icons.min.css'

import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
