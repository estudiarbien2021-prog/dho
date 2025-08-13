import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Archives } from './pages/Archives';
import { Language } from './lib/i18n';

const App = () => {
  const [currentLang, setCurrentLang] = useState<Language>('fr');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/" element={<Layout currentLang={currentLang} onLanguageChange={setCurrentLang} />}>
          <Route path="dashboard" element={<Dashboard currentLang={currentLang} />} />
          <Route path="upload" element={<Upload currentLang={currentLang} />} />
          <Route path="archives" element={<Archives currentLang={currentLang} />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
