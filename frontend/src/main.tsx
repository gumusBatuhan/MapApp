// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'

// Tabler tema + JS
import '@tabler/core/dist/css/tabler.min.css'
import '@tabler/core/dist/js/tabler.min.js'
import './Styles/Global.css';

// Tabler ikonları
import '@tabler/icons-webfont/dist/tabler-icons.min.css'

// özelleştirilmiş mesajlar
import NotifyProvider from "./notify/NotifyProvider";

import App from './App'


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NotifyProvider>
      <App />
    </NotifyProvider>
  </React.StrictMode>
);
