export default {
  coverageDirectory: "../../coverage/libs/test",
  displayName: "test",
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.spec.json",
    },
  },
  moduleFileExtensions: ["ts", "js", "html"],
  preset: "../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": "ts-jest",
  },
};
