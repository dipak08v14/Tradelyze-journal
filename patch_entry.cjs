const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'TradeEntryPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(/\r\n/g, '\n');

function replace(target, replacement) {
    if (!content.includes(target)) {
        console.warn("Could not find target:\\n" + target.substring(0, 80));
    } else {
        content = content.replace(target, replacement);
        console.log("Replaced target");
    }
}

// 1. Broker connections filter
replace(
`          if (!error && data) {
            setBrokerConnections(data);
          }`,
`          if (!error && data) {
            const validBrokers = data.filter((b: any) => getAccountNumber(b) !== 'N/A');
            setBrokerConnections(validBrokers);
          }`
);

// 2. Update Payload
replace(
`        if (isEditMode && id) {
          // 1. UPDATE Core Trade Row
          const { error: tradeError } = await supabase
            .from('trades')
            .update({
              strategy_id: strategyId || null,`,
`        if (isEditMode && id) {
          // 1. UPDATE Core Trade Row
          const { error: tradeError } = await supabase
            .from('trades')
            .update({
              account_login: selectedBroker ? getAccountNumber(selectedBroker) : null,
              strategy_id: strategyId || null,`
);

// 3. Insert Payload
replace(
`          // Create Mode Core Trade Row Insertion
          const { data: newTrade, error: tradeError } = await supabase
            .from('trades')
            .insert({
              user_id: userId,
              strategy_id: strategyId || null,`,
`          // Create Mode Core Trade Row Insertion
          const { data: newTrade, error: tradeError } = await supabase
            .from('trades')
            .insert({
              account_login: selectedBroker ? getAccountNumber(selectedBroker) : null,
              user_id: userId,
              strategy_id: strategyId || null,`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('TradeEntryPage.tsx patched.');
