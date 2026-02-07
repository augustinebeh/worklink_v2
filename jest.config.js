/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
  ],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Ignore frontend directories (tested separately with Vitest if needed)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/admin/',
    '/worker/',
  ],
};
