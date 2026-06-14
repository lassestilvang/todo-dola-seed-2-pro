# Testing Documentation

## Test Suite Overview

The test suite is organized into the following categories:

### Unit Tests
- **API Layer** (`tests/api.test.ts`): Schema validation tests
- **Database** (`tests/db.test.ts`): Core database operations
- **Entities** (`tests/entities.test.ts`): Subtasks, labels, dependencies, templates
- **Search** (`tests/search.test.ts`): Fuzzy search functionality
- **Utilities** (`tests/utils.test.ts`): Helper functions
- **AI Suggestions** (`tests/ai-suggestions.test.ts`): Task prioritization logic
- **Schema Validation** (`tests/unit/schema-validation.test.ts`): Comprehensive schema tests
- **Search & Utils** (`tests/unit/search-utils.test.ts`): Search and utility function tests
- **Property-Based** (`tests/unit/property-based.test.ts`): Property-based testing

### Integration Tests
- **API Routes** (`tests/api.routes.test.ts`): Database query integration
- **API Integration** (`tests/api.integration.test.ts`): Full API handler simulation
- **API Routes Comprehensive** (`tests/api.routes.comprehensive.test.ts`): Additional API tests
- **Workflows** (`tests/integration/workflows.test.ts`): End-to-end workflows

### End-to-End Tests
- **Playwright** (`e2e/tasks.spec.ts`): Critical user flows

### Database Edge Cases
- **Database Edge Cases** (`tests/database-edge-cases.test.ts`): Error handling and edge cases

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm e2e

# Run specific test file
pnpm vitest run tests/db.test.ts
```

## Coverage Goals

- **Target**: 95% statements, 90% branches
- **Current**: ~93% statements, 82% branches
- **Focus Areas**: Branch coverage improvement, error paths

## Test Categories

### Unit Tests
Test individual functions and modules in isolation.

### Integration Tests
Test workflows that span multiple modules.

### Property-Based Tests
Use example-based inputs to verify invariants and properties.

### Edge Case Tests
Test boundary conditions, null values, and error scenarios.

## Adding New Tests

### Unit Test Template
```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Database Test Template
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';

async function cleanDb() {
  // Clear tables between tests
}

describe('Database Feature', () => {
  beforeAll(async () => { await initDb(); });
  afterAll(() => { resetDb(); });
  beforeEach(async () => { await cleanDb(); });
});
```

## Test Isolation

Each test file should:
1. Initialize a fresh database in `beforeAll`
2. Clean data between tests in `beforeEach`
3. Reset the database connection in `afterAll`

## Mocking Guidelines

- Use `vi.fn()` for mocks in vitest
- Mock external APIs with `global.fetch = vi.fn()`
- Mock Next.js components with `vi.mock()`

## Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **One assertion per test**: Test one thing at a time
3. **Descriptive names**: Test names should describe expected behavior
4. **Fast tests**: Keep tests under 100ms unless I/O is required
5. **No shared state**: Tests should not depend on each other