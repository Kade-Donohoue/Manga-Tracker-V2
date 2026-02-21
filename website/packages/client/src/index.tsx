import App from './App';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

createRoot(document.getElementById('root')!).render(<App />);
console.log('Start');
registerSW({
  immediate: true,
});

localStorage.setItem('unreadCount', '0');
if ('clearAppBadge' in navigator) {
  navigator.clearAppBadge();
}
