module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'], // picks up both tenant-isolation.spec.ts and identity.spec.ts
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  // Requires DATABASE_URL to point at a disposable Postgres with
  // migrations (including RLS) already applied — see README.
  // Not run against the dev DB; use a separate itam_test database.
};
