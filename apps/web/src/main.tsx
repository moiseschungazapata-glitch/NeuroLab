import { createRoot } from 'react-dom/client';
import { AccessGate } from './app/AccessGate';
import { App } from './app/App';
import './styles/index.css';
createRoot(document.getElementById('root')!).render(<AccessGate>{logout=><App onLogout={logout}/>}</AccessGate>);
