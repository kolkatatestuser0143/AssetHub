@'
module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/security/jest.security.setup.ts'],
  testTimeout: 15000,
};
'@ | Set-Content apps\api\jest.config.js