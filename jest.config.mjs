export default {
  testEnvironment: 'node',
  transform: {},                                // no Babel needed for plain ESM
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'], // find tests anywhere under the repo
  moduleFileExtensions: ['js','jsx','json','node'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports/junit', outputName: 'junit.xml' }]
  ]
};
