import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from './pages/Dashboard';
import Landing from './pages/Landing';
import { Language } from './lib/i18n';

const App: React.FC = () => {
  console.log('App component rendering');
  
  const [currentLang] = useState<Language>('fr');
  
  console.log('useState worked, currentLang:', currentLang);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard currentLang={currentLang} matches={[]} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
