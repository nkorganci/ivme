import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { ExamTrackProvider } from './examTrack.jsx';
import { APP_NAME } from './config.js';
import './theme.css';
import './styles.css';

document.title = APP_NAME;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ExamTrackProvider>
          <App />
        </ExamTrackProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
