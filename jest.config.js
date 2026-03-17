export default {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
