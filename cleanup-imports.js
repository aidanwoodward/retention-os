#!/usr/bin/env node

// Comprehensive cleanup script for unused imports
const fs = require('fs');
const path = require('path');

// Files to clean up
const filesToClean = [
  'app/(protected)/products/replenishment/page.tsx',
  'app/(protected)/retention/churn/page.tsx',
  'app/(protected)/retention/curve/page.tsx',
  'app/(protected)/retention/reactivation/page.tsx',
  'app/(protected)/customers/list/page.tsx',
  'app/(protected)/cohorts/category/page.tsx',
  'app/(protected)/cohorts/revenue/page.tsx',
  'app/(protected)/cohorts/composition/page.tsx',
];

// Common unused imports to remove
const unusedImports = [
  'TrendingUp', 'Zap', 'TrendingDown', 'Award', 'Gem', 'Sparkles', 'Brain',
  'Eye', 'ArrowRight', 'ChevronRight', 'CheckCircle', 'Clock', 'UserCheck',
  'Shield', 'Users', 'Calendar', 'Truck', 'LineChart', 'Bell', 'Gift',
  'Target', 'Crown', 'Activity', 'Star', 'DollarSign', 'Package'
];

// Common unused state variables to comment out
const unusedStates = [
  'selectedProduct', 'selectedRisk', 'selectedPeriod', 'selectedReactivation',
  'selectedCustomer', 'selectedSegment', 'formatCurrency', 'reactivationLevel'
];

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove unused imports
    const importMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*["']lucide-react["'];/);
    if (importMatch) {
      const imports = importMatch[1].split(',').map(imp => imp.trim());
      const usedImports = imports.filter(imp => {
        const importName = imp.trim().split(' ')[0];
        return !unusedImports.includes(importName) && content.includes(importName);
      });
      
      if (usedImports.length > 0) {
        const newImport = `import {\n  ${usedImports.join(',\n  ')}\n} from "lucide-react";`;
        content = content.replace(importMatch[0], newImport);
      }
    }
    
    // Comment out unused state variables
    unusedStates.forEach(state => {
      const stateRegex = new RegExp(`const\\s*\\[${state}[^\\]]*\\]\\s*=\\s*useState`, 'g');
      content = content.replace(stateRegex, `// const [${state}$1] = useState`);
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Cleaned ${filePath}`);
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
  }
}

// Clean all files
console.log('🧹 Starting comprehensive cleanup...');
filesToClean.forEach(cleanFile);
console.log('✨ Cleanup complete!');
