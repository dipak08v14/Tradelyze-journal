const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bcpwbxqlmvnyhhsonzbo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcHdieHFsbXZueWhoc29uemJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTkxNzksImV4cCI6MjA5NjkzNTE3OX0.QWfotOHnP0mGcPnRbvWNCmSEPwKfPfr-TDH5Ha2jBMU'
);

async function check() {
  console.log('--- REAL STRATEGIES ---');
  const { data, error } = await supabase.from('strategies').select('name').limit(5);
  if (error) console.error(error);
  else console.log(data);
  
  console.log('\n--- ROUTES IN APP.TSX ---');
  try {
    const content = fs.readFileSync('src/App.tsx', 'utf8');
    content.split('\n').forEach((l, i) => { if (l.includes('<Route ')) console.log((i+1) + ': ' + l.trim()); });
  } catch(e) {}
  
  console.log('\n--- IS DIRTY IN STRATEGY BUILDER ---');
  try {
    const builder = fs.readFileSync('src/pages/StrategyBuilderPage.tsx', 'utf8');
    builder.split('\n').forEach((l, i) => { 
      if (l.toLowerCase().includes('isdirty') || l.toLowerCase().includes('unsaved') || l.toLowerCase().includes('haschanges')) {
        console.log((i+1) + ': ' + l.trim()); 
      }
    });
  } catch(e) {}

  console.log('\n--- DYNAMIC TITLES IN OTHER FILES ---');
  try {
    const files = fs.readdirSync('src/pages').filter(f => f.endsWith('.tsx'));
    files.forEach(f => {
      const fcontent = fs.readFileSync(path.join('src/pages', f), 'utf8');
      let foundH1 = false;
      fcontent.split('\n').forEach((l, i) => {
        if (l.includes('<h1')) foundH1 = true;
        if (foundH1 && l.includes('{') && l.includes('}')) {
          console.log(f + ':' + (i+1) + ': ' + l.trim());
        }
        if (l.includes('</h1')) foundH1 = false;
      });
    });
  } catch(e) {}
}
check();
