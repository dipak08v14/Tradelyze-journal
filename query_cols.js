import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.definitions) {
    console.log("broker_connections schema:");
    console.log(data.definitions.broker_connections?.properties ? Object.keys(data.definitions.broker_connections.properties).join(', ') : "not found");
    console.log("\ntrades schema:");
    console.log(data.definitions.trades?.properties ? Object.keys(data.definitions.trades.properties).join(', ') : "not found");
  } else {
    console.log("No definitions in response", Object.keys(data));
  }
}
run();
