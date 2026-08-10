module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'], // picks up both tenant-isolation.spec.ts and identity.spec.ts
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  // Requires MONGODB_URI to point at a DISPOSABLE test database —
  // the suite creates and deletes real tenants/companies/users.
  // Not run against the dev database; use a separate DB name, e.g.
  // .../itam_test.
};
