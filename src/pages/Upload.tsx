import React, { useState, useCallback } from 'react';
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Language, useTranslation } from '@/lib/i18n';

interface UploadProps {
  currentLang: Language;
}

export function Upload({ currentLang }: UploadProps) {
  const t = useTranslation(currentLang);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv'));
    
    if (csvFile) {
      handleFileUpload(csvFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      // TODO: Implement actual file upload
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload
      setUploadResult({
        success: true,
        filename: file.name,
        total_matches: 150,
        iffhs_matches: 89,
        shortlist_count: 23
      });
    } catch (err) {
      setError('Erreur lors du traitement du fichier');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{t.uploadTitle}</h1>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging
            ? 'border-brand bg-brand-50'
            : 'border-surface-strong bg-surface-soft hover:border-brand hover:bg-brand-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
            {isUploading ? (
              <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
            ) : (
              <UploadIcon className="w-8 h-8 text-brand" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-text">
              {isUploading ? t.processing : t.dragDrop}
            </p>
            <p className="text-text-mute mt-1">
              {!isUploading && t.orClickToSelect}
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {uploadResult && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-6 h-6 text-brand" />
            <h3 className="text-lg font-semibold text-brand-700">{t.uploadSuccess}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface rounded-lg p-4">
              <p className="text-sm text-text-weak">Total matchs</p>
              <p className="text-xl font-bold text-text">{uploadResult.total_matches}</p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <p className="text-sm text-text-weak">IFFHS + Coupes</p>
              <p className="text-xl font-bold text-brand">{uploadResult.iffhs_matches}</p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <p className="text-sm text-text-weak">Shortlist</p>
              <p className="text-xl font-bold text-brand">{uploadResult.shortlist_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
        <h3 className="text-lg font-semibold text-text mb-4">Format attendu</h3>
        <div className="space-y-2 text-sm text-text-weak">
          <p>• <strong>Colonnes requises:</strong> League, Home Team, Away Team, date_unix (ou date_GMT)</p>
          <p>• <strong>Cotes:</strong> Odds_Home_Win, Odds_Draw, Odds_Away_Win, Odds_BTTS_Yes, Odds_BTTS_No</p>
          <p>• <strong>Over/Under:</strong> Odds_Over25, Odds_Under25 (+ autres seuils détectés automatiquement)</p>
          <p>• <strong>Encodage:</strong> UTF-8 recommandé</p>
        </div>
      </div>
    </div>
  );
}