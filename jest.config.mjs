export default {
    testEnvironment: 'node',
    // Use Node's native ESM; don't transpile
    transform: {},
    // Treat .js files as ESM (since package.json has "type":"module")
    extensionsToTreatAsEsm: ['.js'],
    // Write JUnit XML where Jenkins expects it
    reporters: [
        'default',
        ['jest-junit', { outputDirectory: './reports/junit', outputName: 'junit.xml' }],
    ],
};