export type Language = 'fr' | 'en' | 'pt' | 'es';

export const translations = {
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    upload: 'Importer',
    archives: 'Archives',
    
    // Dashboard
    totalMatches: 'Total matchs',
    lowVigMatches: 'Matchs low-vig',
    watchBtts: 'Watch BTTS',
    watchOver25: 'Watch Over 2.5',
    matchesByCategory: 'Matchs par catégorie',
    vigorishDistribution: 'Distribution du vigorish',
    hourlyHeatmap: 'Répartition horaire',
    topLeagues: 'Top ligues',
    
    // Upload
    uploadTitle: 'Importer un fichier CSV',
    dragDrop: 'Glissez-déposez votre fichier CSV ici',
    orClickToSelect: 'ou cliquez pour sélectionner',
    processing: 'Traitement en cours...',
    uploadSuccess: 'Fichier importé avec succès',
    
    // Table
    time: 'Heure',
    league: 'Ligue',
    match: 'Match',
    homeWin: 'Domicile',
    draw: 'Nul',
    awayWin: 'Extérieur',
    btts: 'BTTS',
    over25: 'Plus 2.5',
    vig: 'Vig',
    
    // Categories
    first_div: '1ère Division',
    second_div: '2ème Division',
    continental_cup: 'Coupe Continentale',
    national_cup: 'Coupe Nationale',
    
    // Filters
    all: 'Tous',
    lowVig: 'Low-Vig',
    bttsWatch: 'Watch BTTS',
    over25Watch: 'Watch Over 2.5',
    
    // Common
    export: 'Exporter',
    filter: 'Filtrer',
    sort: 'Trier',
    search: 'Rechercher',
    loading: 'Chargement...',
    noData: 'Aucune donnée disponible',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    upload: 'Upload',
    archives: 'Archives',
    
    // Dashboard
    totalMatches: 'Total Matches',
    lowVigMatches: 'Low-Vig Matches',
    watchBtts: 'Watch BTTS',
    watchOver25: 'Watch Over 2.5',
    matchesByCategory: 'Matches by Category',
    vigorishDistribution: 'Vigorish Distribution',
    hourlyHeatmap: 'Hourly Distribution',
    topLeagues: 'Top Leagues',
    
    // Upload
    uploadTitle: 'Upload CSV File',
    dragDrop: 'Drag and drop your CSV file here',
    orClickToSelect: 'or click to select',
    processing: 'Processing...',
    uploadSuccess: 'File uploaded successfully',
    
    // Table
    time: 'Time',
    league: 'League',
    match: 'Match',
    homeWin: 'Home',
    draw: 'Draw',
    awayWin: 'Away',
    btts: 'BTTS',
    over25: 'Over 2.5',
    vig: 'Vig',
    
    // Categories
    first_div: '1st Division',
    second_div: '2nd Division',
    continental_cup: 'Continental Cup',
    national_cup: 'National Cup',
    
    // Filters
    all: 'All',
    lowVig: 'Low-Vig',
    bttsWatch: 'Watch BTTS',
    over25Watch: 'Watch Over 2.5',
    
    // Common
    export: 'Export',
    filter: 'Filter',
    sort: 'Sort',
    search: 'Search',
    loading: 'Loading...',
    noData: 'No data available',
  },
  pt: {
    // Navigation
    dashboard: 'Painel',
    upload: 'Importar',
    archives: 'Arquivos',
    
    // Dashboard
    totalMatches: 'Total de Jogos',
    lowVigMatches: 'Jogos Low-Vig',
    watchBtts: 'Watch BTTS',
    watchOver25: 'Watch Mais 2.5',
    matchesByCategory: 'Jogos por Categoria',
    vigorishDistribution: 'Distribuição do Vigorish',
    hourlyHeatmap: 'Distribuição Horária',
    topLeagues: 'Top Ligas',
    
    // Upload
    uploadTitle: 'Importar Arquivo CSV',
    dragDrop: 'Arraste e solte seu arquivo CSV aqui',
    orClickToSelect: 'ou clique para selecionar',
    processing: 'Processando...',
    uploadSuccess: 'Arquivo importado com sucesso',
    
    // Table
    time: 'Hora',
    league: 'Liga',
    match: 'Jogo',
    homeWin: 'Casa',
    draw: 'Empate',
    awayWin: 'Fora',
    btts: 'BTTS',
    over25: 'Mais 2.5',
    vig: 'Vig',
    
    // Categories
    first_div: '1ª Divisão',
    second_div: '2ª Divisão',
    continental_cup: 'Copa Continental',
    national_cup: 'Copa Nacional',
    
    // Filters
    all: 'Todos',
    lowVig: 'Low-Vig',
    bttsWatch: 'Watch BTTS',
    over25Watch: 'Watch Mais 2.5',
    
    // Common
    export: 'Exportar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    search: 'Buscar',
    loading: 'Carregando...',
    noData: 'Nenhum dado disponível',
  },
  es: {
    // Navigation
    dashboard: 'Panel',
    upload: 'Subir',
    archives: 'Archivos',
    
    // Dashboard
    totalMatches: 'Total Partidos',
    lowVigMatches: 'Partidos Low-Vig',
    watchBtts: 'Watch BTTS',
    watchOver25: 'Watch Más 2.5',
    matchesByCategory: 'Partidos por Categoría',
    vigorishDistribution: 'Distribución del Vigorish',
    hourlyHeatmap: 'Distribución Horaria',
    topLeagues: 'Top Ligas',
    
    // Upload
    uploadTitle: 'Subir Archivo CSV',
    dragDrop: 'Arrastra y suelta tu archivo CSV aquí',
    orClickToSelect: 'o haz clic para seleccionar',
    processing: 'Procesando...',
    uploadSuccess: 'Archivo subido exitosamente',
    
    // Table
    time: 'Hora',
    league: 'Liga',
    match: 'Partido',
    homeWin: 'Local',
    draw: 'Empate',
    awayWin: 'Visitante',
    btts: 'BTTS',
    over25: 'Más 2.5',
    vig: 'Vig',
    
    // Categories
    first_div: '1ª División',
    second_div: '2ª División',
    continental_cup: 'Copa Continental',
    national_cup: 'Copa Nacional',
    
    // Filters
    all: 'Todos',
    lowVig: 'Low-Vig',
    bttsWatch: 'Watch BTTS',
    over25Watch: 'Watch Más 2.5',
    
    // Common
    export: 'Exportar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    search: 'Buscar',
    loading: 'Cargando...',
    noData: 'No hay datos disponibles',
  }
};

export function useTranslation(lang: Language = 'fr') {
  return translations[lang];
}