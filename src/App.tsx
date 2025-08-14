import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserDashboard } from './pages/UserDashboard';
import { Admin } from './pages/Admin';
import { Archives } from './pages/Archives';
import { Test } from './pages/Test';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import { Language } from './lib/i18n';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useUserActivity } from './hooks/useUserActivity';

const AppContent: React.FC = () => {
  const [currentLang] = useState<Language>('fr');
  
  // Track user activity for login timestamps
  useUserActivity();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/archives" element={<Archives />} />
      <Route path="/test" element={<Test />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <UserDashboard currentLang={currentLang} matches={[]} />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  console.log('App component rendering');

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
