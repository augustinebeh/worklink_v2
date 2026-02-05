module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/e2e/**/*.test.js',
    '**/api/**/*.test.js',
    '**/frontend/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/setup/test-setup.js'],
  collectCoverageFrom: [
    '../../routes/**/*.js',
    '../../services/**/*.js',
    '../../admin/src/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};