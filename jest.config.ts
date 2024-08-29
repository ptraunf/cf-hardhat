import {Config} from "jest";

const config: Config = {
    roots: [
        "<rootDir>"
    ],
    modulePaths: ["<rootDir>"],
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts"],
    errorOnDeprecated: true,
    resetMocks: true,
    testPathIgnorePatterns: ['dist/'],
    testRegex: "/test/.*\\.test\\.ts",
    extensionsToTreatAsEsm: [".ts"],
    preset: "ts-jest",
    transform: {
        "^.+\\.(t|j)s$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: 'tsconfig.test.json',
                rootDir: '.'

            },
        ],
    },
};
export default config;