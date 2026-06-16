#property copyright "Tradelyze"
#property link      "https://tradelyze.app"
#property version   "1.00"
#property script_show_inputs

//--- input parameters
input string   InpApiKey       = "";                  // Tradelyze Sync Key (tls_...)
input string   InpServerUrl    = "https://tradelyze.vercel.app/api/sync-trades"; // API Server URL
input int      InpDaysToSync   = 30;                  // Days of history to sync

//+------------------------------------------------------------------+
//| OnStart function                                                 |
//+------------------------------------------------------------------+
void OnStart()
{
   if(InpApiKey == "")
   {
      Alert("Error: Tradelyze Sync Key is required!");
      return;
   }

   // Request history
   datetime end_time = TimeCurrent();
   datetime start_time = end_time - InpDaysToSync * 24 * 3600;

   if(!HistorySelect(start_time, end_time))
   {
      Print("Failed to select history.");
      return;
   }

   int total_deals = HistoryDealsTotal();
   Print("Total history deals found: ", total_deals);

   string trades_json = "";
   int trades_added = 0;

   // Loop through deals
   for(int i = 0; i < total_deals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket <= 0) continue;

      // We only want exit deals (DEAL_ENTRY_OUT or DEAL_ENTRY_INOUT) to represent closed trades
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT) continue;

      string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      double pnl = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
      double lots = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      long magic = HistoryDealGetInteger(ticket, DEAL_MAGIC);
      string comment = HistoryDealGetString(ticket, DEAL_COMMENT);
      datetime exit_time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);

      // Now find the corresponding entry deal to get the entry time and direction
      datetime entry_time = 0;
      string direction = "";
      string position_id = IntegerToString(HistoryDealGetInteger(ticket, DEAL_POSITION_ID));

      for(int j = i - 1; j >= 0; j--)
      {
         ulong entry_ticket = HistoryDealGetTicket(j);
         if(entry_ticket <= 0) continue;
         
         if(IntegerToString(HistoryDealGetInteger(entry_ticket, DEAL_POSITION_ID)) == position_id)
         {
            long entry_type = HistoryDealGetInteger(entry_ticket, DEAL_ENTRY);
            if(entry_type == DEAL_ENTRY_IN)
            {
               entry_time = (datetime)HistoryDealGetInteger(entry_ticket, DEAL_TIME);
               long deal_dir = HistoryDealGetInteger(entry_ticket, DEAL_TYPE);
               direction = (deal_dir == DEAL_TYPE_BUY) ? "Buy" : "Sell";
               break;
            }
         }
      }

      // Fallback if entry was outside selection range
      if(entry_time == 0)
      {
         entry_time = exit_time - 3600; // default 1 hour ago
         direction = (type == DEAL_TYPE_SELL) ? "Buy" : "Sell"; // exit SELL means entry BUY
      }

      // Format times
      string entry_time_str = TimeToString(entry_time, TIME_DATE|TIME_SECONDS);
      string exit_time_str = TimeToString(exit_time, TIME_DATE|TIME_SECONDS);
      StringReplace(entry_time_str, ".", "-");
      StringReplace(exit_time_str, ".", "-");

      // Escape specials in comments
      string escaped_comment = comment;
      StringReplace(escaped_comment, "\\", "\\\\");
      StringReplace(escaped_comment, "\"", "\\\"");
      StringReplace(escaped_comment, "\n", "\\n");
      StringReplace(escaped_comment, "\r", "\\r");
      StringReplace(escaped_comment, "\t", "\\t");

      // Build trade JSON snippet
      string trade_json = "{"
         "\"ticket\":" + IntegerToString(ticket) + ","
         "\"symbol\":\"" + symbol + "\","
         "\"direction\":\"" + direction + "\","
         "\"pnl\":" + DoubleToString(pnl, 2) + ","
         "\"commission\":" + DoubleToString(commission, 2) + ","
         "\"swap\":" + DoubleToString(swap, 2) + ","
         "\"lots\":" + DoubleToString(lots, 2) + ","
         "\"entry_time\":\"" + entry_time_str + "\","
         "\"exit_time\":\"" + exit_time_str + "\","
         "\"magic_number\":" + IntegerToString(magic) + ","
         "\"comment\":\"" + escaped_comment + "\""
         "}";

      if(trades_added > 0)
         trades_json += ",";
      trades_json += trade_json;
      trades_added++;
   }

   // Prepare payload
   string broker_name = AccountInfoString(ACCOUNT_COMPANY);
   string account_login = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));

   string payload = "{"
      "\"api_key\":\"" + InpApiKey + "\","
      "\"broker_name\":\"" + broker_name + "\","
      "\"account_login\":\"" + account_login + "\","
      "\"sync_type\":\"manual\","
      "\"trades\":[" + trades_json + "]"
      "}";

   // Send via WebRequest
   char post_data[];
   char result_data[];
   string result_headers;
   string headers = "Content-Type: application/json\r\n";
   
   StringToCharArray(payload, post_data, 0, -1, CP_UTF8);

   ResetLastError();
   int res = WebRequest("POST", InpServerUrl, headers, 15000, post_data, result_data, result_headers);

   if(res == -1)
      Print("WebRequest failed. Error code: ", _LastError);
   else
   {
      string res_text = CharArrayToString(result_data, 0, -1, CP_UTF8);
      Print("Server response code: ", res);
      Print("Response: ", res_text);
      Alert("Tradelyze Sync Completed! Synced " + IntegerToString(trades_added) + " trades.");
   }
}
