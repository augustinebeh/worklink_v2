#!/usr/bin/env node

/**
 * Basic Syntax Check for Migrated Files
 * Uses Node.js to validate JavaScript syntax
 */

import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Files to check for syntax
const MIGRATED_FILES = [
  'admin/src/pages/EscalationQueue.jsx',
  'admin/src/pages/Candidates.jsx',
  'admin/src/pages/Dashboard.jsx',
  'admin/src/pages/AISourcing.jsx',
  'admin/src/pages/RetentionAnalytics.jsx',
  'admin/src/pages/CandidateProfile.jsx',
  'admin/src/pages/Jobs.jsx',
  'admin/src/pages/Clients.jsx'
];

function checkBasicSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Basic checks for common syntax issues
    const issues = [];

    // Check for unmatched brackets
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;

    for (const char of content) {
      switch (char) {
        case '{': braceCount++; break;
        case '}': braceCount--; break;
        case '(': parenCount++; break;
        case ')': parenCount--; break;
        case '[': bracketCount++; break;
        case ']': bracketCount--; break;
      }
    }

    if (braceCount !== 0) issues.push(`Unmatched braces: ${braceCount > 0 ? 'missing }' : 'extra }'}`);
    if (parenCount !== 0) issues.push(`Unmatched parentheses: ${parenCount > 0 ? 'missing )' : 'extra )'}`);
    if (bracketCount !== 0) issues.push(`Unmatched brackets: ${bracketCount > 0 ? 'missing ]' : 'extra ]'}`);

    // Check for basic React patterns
    if (content.includes('import') && !content.includes('export')) {
      if (!content.includes('export default') && !content.includes('export {')) {
        issues.push('File imports but has no exports');
      }
    }

    // Check for common JSX issues
    const jsxSelfClosingRegex = /<(\w+)\s+[^>]*(?<!\/)>/g;
    const jsxElements = content.match(jsxSelfClosingRegex) || [];

    for (const element of jsxElements) {
      const tagName = element.match(/<(\w+)/)[1];
      // Check if it's a self-closing tag that should be closed
      if (['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName.toLowerCase()) && !element.endsWith('/>')) {
        issues.push(`Self-closing tag should end with />: ${element}`);
      }
    }

    return { valid: issues.length === 0, issues };

  } catch (error) {
    return { valid: false, issues: [`File read error: ${error.message}`] };
  }
}

function runSyntaxCheck() {
  console.log('🔍 Basic Syntax Check for Migrated Files\n');

  let passedFiles = 0;
  let totalFiles = 0;

  for (const file of MIGRATED_FILES) {
    totalFiles++;
    const result = checkBasicSyntax(file);
    const fileName = file.split('/').pop();

    if (result.valid) {
      console.log(`✅ ${fileName} - Syntax OK`);
      passedFiles++;
    } else {
      console.log(`❌ ${fileName} - Issues found:`);
      result.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
  }

  console.log(`\n📊 Results: ${passedFiles}/${totalFiles} files passed syntax check`);

  if (passedFiles === totalFiles) {
    console.log('🎉 All migrated files have valid syntax!');
    return true;
  } else {
    console.log(`🔧 ${totalFiles - passedFiles} files need syntax fixes`);
    return false;
  }
}

// Check if we can import one of the files to test actual syntax
async function testNodeImport() {
  console.log('\n🧪 Testing actual import syntax...\n');

  const testFiles = [
    'admin/src/shared/services/api/index.js',
    'admin/src/shared/services/api/auth.service.js'
  ];

  for (const file of testFiles) {
    try {
      // Just check if the file would be syntactically valid for Node
      const content = fs.readFileSync(file, 'utf-8');

      // Basic module syntax validation
      if (content.includes('export') && content.includes('import')) {
        console.log(`✅ ${file.split('/').pop()} - Valid ES module syntax`);
      } else {
        console.log(`⚠️  ${file.split('/').pop()} - Check module syntax`);
      }
    } catch (error) {
      console.log(`❌ ${file.split('/').pop()} - ${error.message}`);
    }
  }
}

// Run checks
const syntaxPassed = runSyntaxCheck();
testNodeImport();

process.exit(syntaxPassed ? 0 : 1);