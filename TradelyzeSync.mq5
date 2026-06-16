//+------------------------------------------------------------------+
//|                                              TradelyzeSync.mq5   |
//|                              Copyright 2026, Tradelyze.app       |
//|                                    https://www.tradelyze.app     |
//+------------------------------------------------------------------+
//
// TRADELYZE SYNC SERVICE — Automatic trade journal sync for MT5
//
// This is an MQL5 SERVICE — not an Expert Advisor.
// It runs automatically in the background every time MT5 opens.
// It NEVER places trades. Read and send only.
//
// SETUP (one time only):
// 1. Copy this file to MQL5/Services folder (not Experts folder)
// 2. In MT5: Navigator > Services > right-click > Add Service > TradelyzeSync
// 3. Enter your API key and click OK
// 4. Right-click TradelyzeSync in Services > Start
// Done forever. Starts automatically on every MT5 launch.
//
// REQUIRED: Tools > Options > Expert Advisors > Allow WebRequest
// Add: https://tradelyze.vercel.app
//
//+------------------------------------------------------------------+

#property service
#property copyright "Copyright 2026, Tradelyze.app"
#property link      "https://www.tradelyze.app"
#property version   "2.00"
#property description "TradelyzeSync — auto-syncs closed trades to Tradelyze journal."
#property description "Starts automatically. Never needs chart attachment."

input string  API_Key       = "";                                                  // Your Tradelyze Sync Key
input string  Server_URL    = "https://tradelyze.vercel.app/api/sync-trades";     // Do not change
input int     Sync_Interval = 2;                                                   // Seconds between sync checks
input int     History_Days  = 0;                                                   // Days of history (0 = all)

datetime last_sync_time      = 0;
bool     history_imported    = false;
bool     api_key_invalid     = false;
bool     url_not_whitelisted = false;
string   broker_name         = "";
string   account_login_str   = "";

string EscapeJSON(string s) {
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   StringReplace(s, "\n", "\\n");
   StringReplace(s, "\r", "\\r");
   StringReplace(s, "\t", "\\t");
   return s;
}

string BuildDealJSON(ulong ticket) {
   string symbol     = HistoryDealGetString(ticket, DEAL_SYMBOL);
   long   dtype      = HistoryDealGetInteger(ticket, DEAL_TYPE);
   string direction  = (dtype == 0) ? "Buy" : "Sell";
   double exit_price = HistoryDealGetDouble(ticket, DEAL_PRICE);
   double lots       = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double pnl        = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
   datetime exit_dt  = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   long   magic      = HistoryDealGetInteger(ticket, DEAL_MAGIC);
   string comment    = HistoryDealGetString(ticket, DEAL_COMMENT);
   long   pos_id     = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

   datetime entry_dt    = exit_dt - 60;
   double   entry_price = exit_price;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++) {
      ulong t = HistoryDealGetTicket(i);
      if(t > 0 && HistoryDealGetInteger(t, DEAL_POSITION_ID) == pos_id
         && HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN) {
         entry_dt    = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
         entry_price = HistoryDealGetDouble(t, DEAL_PRICE);
         break;
      }
   }

   string exit_str  = TimeToString(exit_dt,  TIME_DATE|TIME_SECONDS);
   string entry_str = TimeToString(entry_dt, TIME_DATE|TIME_SECONDS);
   StringReplace(exit_str,  ".", "-");
   StringReplace(entry_str, ".", "-");

   string j = "{";
   j += "\"ticket\":"      + IntegerToString(ticket)         + ",";
   j += "\"symbol\":\""    + symbol                          + "\",";
   j += "\"direction\":\"" + direction                       + "\",";
   j += "\"entry_price\":" + DoubleToString(entry_price, 5)  + ",";
   j += "\"exit_price\":"  + DoubleToString(exit_price, 5)   + ",";
   j += "\"lots\":"        + DoubleToString(lots, 2)          + ",";
   j += "\"pnl\":"         + DoubleToString(pnl, 2)           + ",";
   j += "\"commission\":"  + DoubleToString(commission, 2)    + ",";
   j += "\"swap\":"        + DoubleToString(swap, 2)          + ",";
   j += "\"entry_time\":\"" + entry_str                      + "\",";
   j += "\"exit_time\":\""  + exit_str                       + "\",";
   j += "\"magic_number\":" + IntegerToString(magic)          + ",";
   j += "\"comment\":\""    + EscapeJSON(comment)             + "\"";
   j += "}";
   return j;
}

bool SendTrades(const ulong &tickets[], string sync_type) {
   int total = ArraySize(tickets);
   if(total == 0) return true;

   string payload = "{";
   payload += "\"api_key\":\""      + API_Key                    + "\",";
   payload += "\"broker_name\":\""  + EscapeJSON(broker_name)    + "\",";
   payload += "\"account_login\":\"" + account_login_str         + "\",";
   payload += "\"sync_type\":\""    + sync_type                  + "\",";
   payload += "\"trades\":[";
   for(int i = 0; i < total; i++) {
      payload += BuildDealJSON(tickets[i]);
      if(i < total - 1) payload += ",";
   }
   payload += "]}";

   char post_data[];
   StringToCharArray(payload, post_data, 0, -1, CP_UTF8);
   ArrayResize(post_data, ArraySize(post_data) - 1);

   for(int attempt = 1; attempt <= 3; attempt++) {
      char   result_body[];
      string req_headers  = "Content-Type: application/json\r\n";
      string resp_headers = "";
      int code = WebRequest("POST", Server_URL, req_headers, 10000,
                            post_data, result_body, resp_headers);
      if(code == 200) {
         last_sync_time = TimeCurrent();
         Print("TradelyzeSync: Synced " + IntegerToString(total) + " trades.");
         return true;
      }
      if(code == 401) {
         if(!api_key_invalid) {
            Alert("TradelyzeSync: Invalid API Key. Check Navigator > Services > TradelyzeSync settings.");
            api_key_invalid = true;
         }
         return false;
      }
      if(code == -1) {
         int err = GetLastError();
         if(err == 4014) {
            if(!url_not_whitelisted) {
               Alert("TradelyzeSync: URL not whitelisted. Tools > Options > Expert Advisors > Allow WebRequest > add: https://tradelyze.vercel.app");
               url_not_whitelisted = true;
            }
            return false;
         }
         if(attempt < 3) Sleep(2000);
         continue;
      }
      Print("TradelyzeSync: Server returned " + IntegerToString(code) + ". Retrying next cycle.");
      return true;
   }
   return true;
}

void GetNewDeals(ulong &out[]) {
   ArrayResize(out, 0);
   HistorySelect(last_sync_time, TimeCurrent());
   int total = HistoryDealsTotal();
   int count = 0;
   for(int i = 0; i < total; i++) {
      ulong t = HistoryDealGetTicket(i);
      if(t > 0) {
         long entry = HistoryDealGetInteger(t, DEAL_ENTRY);
         long dtype = HistoryDealGetInteger(t, DEAL_TYPE);
         string sym = HistoryDealGetString(t, DEAL_SYMBOL);
         long   dt  = HistoryDealGetInteger(t, DEAL_TIME);
         if(entry == DEAL_ENTRY_OUT &&
            (dtype == DEAL_TYPE_BUY || dtype == DEAL_TYPE_SELL) &&
            sym != "" && dt > last_sync_time) {
            count++;
            ArrayResize(out, count);
            out[count-1] = t;
         }
      }
   }
}

void ImportHistory() {
   Print("TradelyzeSync: Starting historical import...");
   datetime from = (History_Days > 0) ? TimeCurrent() - History_Days * 86400 : 0;
   HistorySelect(from, TimeCurrent());
   int total = HistoryDealsTotal();
   ulong filtered[];
   int count = 0;
   for(int i = 0; i < total; i++) {
      ulong t = HistoryDealGetTicket(i);
      if(t > 0) {
         long entry = HistoryDealGetInteger(t, DEAL_ENTRY);
         long dtype = HistoryDealGetInteger(t, DEAL_TYPE);
         string sym = HistoryDealGetString(t, DEAL_SYMBOL);
         if(entry == DEAL_ENTRY_OUT &&
            (dtype == DEAL_TYPE_BUY || dtype == DEAL_TYPE_SELL) && sym != "") {
            count++;
            ArrayResize(filtered, count);
            filtered[count-1] = t;
         }
      }
   }
   int total_filtered = ArraySize(filtered);
   Print("TradelyzeSync: Found " + IntegerToString(total_filtered) + " historical trades.");
   for(int i = 0; i < total_filtered; i += 50) {
      int batch = (int)MathMin(50, total_filtered - i);
      ulong batch_arr[];
      ArrayResize(batch_arr, batch);
      for(int j = 0; j < batch; j++) batch_arr[j] = filtered[i+j];
      if(!SendTrades(batch_arr, "historical")) return;
      if(IsStopped()) return;
   }
   history_imported = true;
   Print("TradelyzeSync: Historical import complete.");
}

void OnStart() {
   if(API_Key == "") {
      Print("TradelyzeSync: No API Key. Right-click service in Navigator > Properties to add your key.");
      return;
   }
   broker_name       = AccountInfoString(ACCOUNT_COMPANY);
   account_login_str = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   Print("TradelyzeSync: Service started. Broker: " + broker_name + " | Account: " + account_login_str);

   ImportHistory();

   while(!IsStopped()) {
      if(!api_key_invalid && !url_not_whitelisted) {
         ulong new_tickets[];
         GetNewDeals(new_tickets);
         if(ArraySize(new_tickets) > 0)
            SendTrades(new_tickets, "realtime");
      }
      Sleep(Sync_Interval * 1000);
   }
   Print("TradelyzeSync: Service stopped.");
}
