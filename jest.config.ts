import {Config} from "jest";

const config: Config = {
    collectCoverage: true,
    collectCoverageFrom: [ "/src/**/*.ts"],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 100,
            lines: 50,
        },
    },
    errorOnDeprecated: true,
    resetMocks: true,
    testPathIgnorePatterns: ['dist/'],
    testRegex: "/test/.*\\.test\\.ts",
    extensionsToTreatAsEsm: [".ts"],
    preset: "ts-jest",
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: 'tsconfig.test.json'
            },
        ],
    },
};
export default config;