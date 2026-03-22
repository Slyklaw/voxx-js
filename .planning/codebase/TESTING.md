# Testing Patterns

**Analysis Date:** 2026-03-22

## Test Framework

**Runner:**
- Vitest v1.6.0
- Config: `vitest.config.js`

**Assertion Library:**
- Vitest's built-in expect assertions

**Run Commands:**
```bash
npm test              # Run all tests in watch mode
npm run test:run      # Run all tests once
```

## Test File Organization

**Location:**
- Separate `tests/` directory at project root
- Mirrored structure with unit/ and integration/ subdirectories

**Naming:**
- `[filename].test.js` pattern (e.g., `biomes.test.js`)

**Structure:**
```
tests/
├── setup.js                 # Test setup file
├── unit/                    # Unit tests
│   ├── biomes.test.js
│   ├── greedyMesh.test.js
│   ├── chunk.test.js
│   └── ssao-config.test.js
└── integration/             # Integration tests
    └── ssao-ui.test.js
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from '../../module.js';

describe('module.js', () => {
  describe('functionToTest', () => {
    let testSubject;
    
    beforeEach(() => {
      // Setup code that runs before each test
      testSubject = new FunctionToTest();
    });
    
    it('should do something specific', () => {
      // Arrange
      const input = testValue;
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

**Patterns:**
- Arrange/Act/Assert pattern clearly followed
- Descriptive test names that explain expected behavior
- beforeEach used for test isolation
- Mock functions created using Vitest's vi.fn() when needed (though not prominently featured in current tests)

## Mocking

**Framework:** 
- Vitest's built-in mocking capabilities (vi.fn, vi.mock, etc.)

**Patterns:**
- Dependency injection for testability (seen in BiomeCalculator constructor accepting noiseSeed)
- Manual mocking by providing mock implementations
- Example from tests:
  ```javascript
  const mockNoise = () => 0;
  const height = generateBiomeHeight(0, 0, BIOMES.LOWLAND, mockNoise);
  ```

**What to Mock:**
- External dependencies (noise functions, external APIs)
- Complex internal dependencies that make tests slow or flaky
- Random number generators for deterministic tests

**What NOT to Mock:**
- Simple utility functions
- Core business logic that should be tested as-is
- DOM elements in unit tests (handled through jsdom environment)

## Fixtures and Factories

**Test Data:**
- Test data created inline within tests
- Constants imported from source files for consistency (BIOMES, BLOCK_TYPES)
- No dedicated fixtures directory or factory functions detected

**Location:**
- Test data defined directly in test files
- Example:
  ```javascript
  const positions = [[0, 0], [1000, 1000], [-500, 500]];
  positions.forEach(([wx, wz]) => {
    // test logic
  });
  ```

## Coverage

**Requirements:** 
- No enforced minimum coverage detected
- Coverage reporting configured but not mandated

**View Coverage:**
```bash
npm run test:run      # Shows coverage report in terminal
# HTML report generated in coverage/ directory
```

**Configured Reporters:**
- text, json, html (from vitest.config.js)

## Test Types

**Unit Tests:**
- Focus on individual functions and classes
- Examples: biome height calculations, block type selection, math utilities
- Located in `tests/unit/`
- Test internal logic with controlled inputs

**Integration Tests:**
- Test interaction between multiple components
- Example: SSAO UI integration test
- Located in `tests/integration/`
- May involve DOM testing with jsdom

**E2E Tests:**
- Not detected in current codebase
- No end-to-end testing framework configured

## Common Patterns

**Async Testing:**
- Vitest handles async tests automatically with async/await or returning promises
- Example pattern:
  ```javascript
  it('should fetch data', async () => {
    const data = await fetchData();
    expect(data).toEqual(expectedData);
  });
  ```

**Error Testing:**
```javascript
it('should throw error for invalid input', () => {
  expect(() => {
    functionUnderTest(invalidInput);
  }).toThrow(Error);
});
```

**Setup/Teardown:**
- beforeEach and afterEach hooks used for test isolation
- Manual cleanup in tests when needed (seen in BiomeCalculator tests with beforeEach)

---
*Testing analysis: 2026-03-22*