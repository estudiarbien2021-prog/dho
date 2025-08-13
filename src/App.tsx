import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Archives } from './pages/Archives';
import { TablePage } from './pages/TablePage';
import { Language } from './lib/i18n';
import { useMatchData } from './hooks/useMatchData';

const App = () => {
  const [currentLang, setCurrentLang] = useState<Language>('fr');
  const { matches, processFile } = useMatchData();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/" element={<Layout currentLang={currentLang} onLanguageChange={setCurrentLang} />}>
          <Route path="dashboard" element={<Dashboard currentLang={currentLang} matches={matches} />} />
          <Route path="table" element={<TablePage matches={matches} currentLang={currentLang} />} />
          <Route path="upload" element={<Upload currentLang={currentLang} onFileProcessed={processFile} />} />
          <Route path="archives" element={<Archives currentLang={currentLang} />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
