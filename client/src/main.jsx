import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 Main.jsx is running');
console.log('📦 React version:', React.version);

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ App rendered');
} else {
  console.error('❌ Root element not found!');
}