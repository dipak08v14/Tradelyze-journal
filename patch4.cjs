const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'DashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(/\r\n/g, '\n');

function replace(target, replacement) {
    if (!content.includes(target)) {
        console.warn("Could not find target:", target.substring(0, 50));
    } else {
        content = content.replace(target, replacement);
        console.log("Replaced target:", target.substring(0, 50));
    }
}

replace(
`  const dropdownRef = useRef<HTMLDivElement>(null);`,
`  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Create a stable primitive for dependency arrays to avoid infinite loops
  const activeAccountLogin = selectedBroker === 'all' ? 'all' : (selectedBroker ? getAccountNumber(selectedBroker) : null);`
);

replace(
`    return () => clearInterval(interval);
  }, [userId, selectedBroker]);`,
`    return () => clearInterval(interval);
  }, [userId, activeAccountLogin]);`
);

replace(
`    fetchYears();
  }, [userId, selectedBroker]);`,
`    fetchYears();
  }, [userId, activeAccountLogin]);`
);

replace(
`    fetchDashboardContext();
  }, [userId, startDate, endDate, showError, selectedBroker]);`,
`    fetchDashboardContext();
  }, [userId, startDate, endDate, showError, activeAccountLogin]);`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed infinite loop');
