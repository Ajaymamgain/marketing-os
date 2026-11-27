import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {WorkspaceErrorBoundary} from './components/WorkspaceErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkspaceErrorBoundary><App /></WorkspaceErrorBoundary>
  </StrictMode>,
);
