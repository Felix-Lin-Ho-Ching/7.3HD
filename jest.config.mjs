export default {
    testEnvironment: "node",
    transform: {},
    testMatch: ["**/tests/**/*.test.js", "**/src/**/__tests__/**/*.test.js"],
    reporters: [
        "default",
        ["jest-junit", { outputDirectory: "reports/junit", outputName: "junit.xml" }]
    ],
    detectOpenHandles: true,
    forceExit: true,
    testTimeout: 20000
};