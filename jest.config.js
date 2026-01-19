module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}\\/(?:internal\\/.*|enums))\\.js$': '$1.ts',
    '^uuid$': '<rootDir>/../test/mocks/uuid.ts',
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/node_modules/**', '!generated/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  clearMocks: true,
};
