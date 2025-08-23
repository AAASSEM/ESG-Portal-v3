import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import TestApp from './TestApp';

console.log('index.js loaded');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (!rootElement) {
  console.error('Root element not found!');
} else {
  const root = ReactDOM.createRoot(rootElement);
  console.log('Rendering App...');
  root.render(
    <App />
  );
  console.log('App render called');
}