module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/security/jest.security.setup.ts'],
  // The setup file loads apps/api/.env, configures deterministic DNS, and
  // points MONGODB_URI at a disposable *_test database. Security tests must
  // never run against the normal development database.
};
