const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^bson$': '<rootDir>/node_modules/bson/lib/bson.cjs',
  },
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/public/tinymce/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/public/tinymce/', '<rootDir>/node_modules/'],
  watchPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/public/tinymce/'],
}

module.exports = createJestConfig(customJestConfig)
