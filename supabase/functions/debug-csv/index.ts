import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV doit avoir au moins un header et une ligne de données');
  
  function parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  const headers = parseCSVLine(lines[0]);
  const rows: any[] = [];
  
  for (let i = 1; i < Math.min(lines.length, 6); i++) { // Only first 5 rows for debug
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvUrl } = await req.json();
    
    if (!csvUrl) {
      return new Response(JSON.stringify({ error: 'csvUrl requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Convert GitHub URL to raw URL
    let actualCsvUrl = csvUrl;
    if (csvUrl.includes('github.com') && csvUrl.includes('/blob/')) {
      actualCsvUrl = csvUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    
    console.log(`📥 Debug CSV depuis: ${actualCsvUrl}`);
    
    // Download CSV
    const response = await fetch(actualCsvUrl);
    if (!response.ok) {
      throw new Error(`Erreur téléchargement: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`📊 Taille CSV: ${csvText.length} caractères`);
    console.log(`📋 Premières 500 caractères:`, csvText.substring(0, 500));
    
    // Parse first few rows
    const csvRows = parseCSV(csvText);
    console.log(`🔍 Headers:`, Object.keys(csvRows[0]));
    console.log(`📋 Première ligne:`, csvRows[0]);
    
    return new Response(JSON.stringify({
      success: true,
      url: actualCsvUrl,
      size: csvText.length,
      firstChars: csvText.substring(0, 500),
      headers: Object.keys(csvRows[0]),
      firstRow: csvRows[0],
      sampleRows: csvRows
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('💥 Erreur debug:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});