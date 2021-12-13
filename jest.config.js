module.exports = {
  preset: 'ts-jest',
  roots: ['test'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setupTest.ts'],
  setupFilesAfterEnv: ['jest-extended/all'],
  testTimeout: 60000
}
