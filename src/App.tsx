import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from './pages/Dashboard';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import { Language } from './lib/i18n';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

const App: React.FC = () => {
  console.log('App component rendering');
  
  const [currentLang] = useState<Language>('fr');
  
  console.log('useState worked, currentLang:', currentLang);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard currentLang={currentLang} matches={[]} />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
