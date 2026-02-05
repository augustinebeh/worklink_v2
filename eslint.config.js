// eslint.config.js - ESLint v9+ flat config
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        exports: 'writable',
        global: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      // File size limits
      'max-lines': ['warn', {
        max: 500,
        skipBlankLines: true,
        skipComments: true
      }],
      'max-lines-per-function': ['warn', {
        max: 50,
        skipBlankLines: true,
        skipComments: true
      }],
      
      // Complexity limits
      'complexity': ['warn', 15],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],
      'max-nested-callbacks': ['warn', 3],
      
      // Code quality
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-var': 'warn',
      'eqeqeq': ['warn', 'always'],
      
      // Style
      'curly': ['warn', 'all'],
      'brace-style': ['warn', '1tbs'],
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'semi': ['warn', 'always'],
      'comma-dangle': ['warn', 'never'],
      'arrow-spacing': 'warn',
      'no-multiple-empty-lines': ['warn', { max: 2 }]
    }
  },
  {
    // Ignore patterns
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'admin/node_modules/**',
      'worker/node_modules/**',
      '**/.git/**'
    ]
  },
  {
    // Special rules for test files
    files: ['**/*.test.js', '**/test-*.js', '**/tests/**/*.js'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off'
    }
  }
];
