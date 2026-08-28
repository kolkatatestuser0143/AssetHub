module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/security/jest.security.setup.ts'],
  // The setup file loads the API environment and derives a disposable
  // PostgreSQL test database. Security tests must never run against the
  // normal development database.
};
