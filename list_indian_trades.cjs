const { createClient } = require('@supabase/supabase-js');

const envUrl = 'https://bcpwbxqlmvnyhhsonzbo.supabase.co';
const envKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcHdieHFsbXZueWhoc29uemJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTkxNzksImV4cCI6MjA5NjkzNTE3OX0.QWfotOHnP0mGcPnRbvWNCmSEPwKfPfr-TDH5Ha2jBMU';

const supabase = createClient(envUrl, envKey);

(async () => {
  try {
    const { data: trades, error } = await supabase
      .from('trades')
      .select('id, symbol, date');
    
    if (error) {
      console.error("DB Query error:", error);
      return;
    }

    console.log("All trades in DB:");
    trades.forEach(t => {
      console.log(`ID: ${t.id} | Symbol: ${t.symbol} | Date: ${t.date}`);
    });
  } catch (error) {
    console.error("Script error:", error);
  }
})();
