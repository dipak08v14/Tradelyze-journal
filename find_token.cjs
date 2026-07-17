const fs = require('fs');
const path = require('path');
const os = require('os');

const keyToFind = 'sb-bcpwbxqlmvnyhhsonzbo-auth-token';
const userHome = os.homedir();

const searchPaths = [
  // Chrome Default
  path.join(userHome, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb'),
  // Chrome Profiles (1 to 10)
  ...Array.from({ length: 10 }, (_, i) => path.join(userHome, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', `Profile ${i + 1}`, 'Local Storage', 'leveldb')),
  // Edge Default
  path.join(userHome, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb'),
  // Edge Profiles (1 to 10)
  ...Array.from({ length: 10 }, (_, i) => path.join(userHome, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', `Profile ${i + 1}`, 'Local Storage', 'leveldb')),
];

let foundToken = null;

function extractJsonWithBraceBalancing(contentStr, startIndex) {
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIndex; i < contentStr.length; i++) {
    const char = contentStr[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return contentStr.slice(startIndex, i + 1);
        }
      }
    }
  }
  return null;
}

for (const dir of searchPaths) {
  if (!fs.existsSync(dir)) continue;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.log') && !file.endsWith('.ldb')) continue;
      const filePath = path.join(dir, file);
      try {
        const content = fs.readFileSync(filePath);
        const index = content.indexOf(keyToFind);
        if (index !== -1) {
          console.log(`Found key in: ${filePath}`);
          const contentStr = content.toString('utf8');
          // Find the start of the JSON value after the key
          const jsonStartIndex = contentStr.indexOf('{"access_token":', index);
          if (jsonStartIndex !== -1) {
            const tokenJson = extractJsonWithBraceBalancing(contentStr, jsonStartIndex);
            if (tokenJson) {
              // Validate JSON
              try {
                JSON.parse(tokenJson);
                foundToken = tokenJson;
                console.log("Successfully extracted and validated complete token JSON!");
                break;
              } catch (e) {
                console.log("Extracted string was not valid JSON, retrying extraction from other match...");
              }
            }
          }
        }
      } catch (e) {
        // file might be locked or unreadable
      }
    }
  } catch (e) {
    // dir unreadable
  }
  if (foundToken) break;
}

if (foundToken) {
  fs.writeFileSync('session_token.json', foundToken);
  console.log("Saved complete token to session_token.json");
} else {
  console.log("Could not find active session token in any browser localStorage leveldb.");
}
