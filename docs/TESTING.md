# Testing Guide - Zamon Books

This document provides comprehensive information about the testing strategy, setup, and best practices for the Zamon Books project.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Types](#test-types)
- [Setup and Configuration](#setup-and-configuration)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Testing Strategy

Our testing strategy follows the testing pyramid approach:

```
    /\
   /  \     E2E Tests (Few)
  /____\    
 /      \   Integration Tests (Some)
/________\  Unit Tests (Many)
```

### Test Distribution Goals
- **Unit Tests**: 70% of total tests
- **Integration Tests**: 20% of total tests
- **E2E Tests**: 10% of total tests

## Test Types

### 1. Unit Tests
- **Location**: `src/**/__tests__/*.test.{js,jsx}`
- **Purpose**: Test individual components and functions in isolation
- **Tools**: Vitest, React Testing Library, Jest DOM
- **Coverage Target**: 80% line coverage, 70% branch coverage

### 2. Integration Tests
- **Location**: `src/__tests__/integration/*.integration.test.jsx`
- **Purpose**: Test component interactions and workflows
- **Tools**: Vitest, React Testing Library, MSW (Mock Service Worker)
- **Focus**: User workflows, API integrations, state management

### 3. End-to-End Tests
- **Location**: `e2e/*.spec.js`
- **Purpose**: Test complete user journeys in real browser
- **Tools**: Playwright
- **Focus**: Critical user paths, cross-browser compatibility

### 4. Performance Tests
- **Location**: `e2e/performance.spec.js`, `scripts/performance-test.js`
- **Purpose**: Validate performance metrics and optimization
- **Tools**: Playwright, Custom performance scripts
- **Metrics**: Core Web Vitals, bundle size, load times

## Setup and Configuration

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Configuration Files
- `vitest.config.js` - Unit and integration test configuration
- `playwright.config.js` - E2E test configuration
- `src/test-setup.js` - Global test setup and mocks

### Environment Variables
Create `.env.test` file for test-specific environment variables:
```env
VITE_FIREBASE_API_KEY=test-api-key
VITE_FIREBASE_PROJECT_ID=test-project
VITE_CLOUDINARY_CLOUD_NAME=test-cloud
```

## Running Tests

### All Tests
```bash
# Run all tests (unit, integration, E2E, performance)
npm run test:all

# Run tests for CI/CD
npm run test:ci
```

### Unit and Integration Tests
```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- src/components/__tests__/OptimizedImage.test.jsx

# Run tests matching pattern
npm run test -- --grep "should handle errors"
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/book-browsing.spec.js

# Run on specific browser
npx playwright test --project=chromium
```

### Performance Tests
```bash
# Run performance analysis
npm run performance:test

# Run performance E2E tests
npx playwright test e2e/performance.spec.js
```

### Coverage Reports
```bash
# Generate comprehensive coverage report
npm run test:coverage:report

# View HTML coverage report
open coverage/index.html
```

## Writing Tests

### Unit Test Example
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OptimizedImage from '../OptimizedImage';

describe('OptimizedImage', () => {
  it('should render with Cloudinary URL', () => {
    render(
      <OptimizedImage
        src="https://res.cloudinary.com/test/image/upload/v1/sample.jpg"
        alt="Test image"
      />
    );

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Test image');
  });

  it('should handle loading states', async () => {
    const onLoad = vi.fn();
    
    render(
      <OptimizedImage
        src="test-image.jpg"
        alt="Test"
        onLoad={onLoad}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.load(img);

    expect(onLoad).toHaveBeenCalled();
  });
});
```

### Integration Test Example
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../../pages/HomePage';

describe('HomePage Integration', () => {
  it('should display books and allow adding to cart', async () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Book 1')).toBeInTheDocument();
    });

    const addToCartButton = screen.getAllByText(/savatga/i)[0];
    fireEvent.click(addToCartButton);

    // Assert cart update
  });
});
```

### E2E Test Example
```javascript
import { test, expect } from '@playwright/test';

test('should browse and purchase books', async ({ page }) => {
  await page.goto('/');
  
  // Wait for books to load
  await page.waitForSelector('.book-card');
  
  // Click on first book
  await page.locator('.book-card').first().click();
  
  // Should navigate to book detail
  await expect(page).toHaveURL(/\/kitob\//);
  
  // Add to cart
  await page.locator('.add-to-cart').click();
  
  // Verify cart update
  await expect(page.locator('.cart-count')).toContainText('1');
});
```

## Best Practices

### Unit Tests
- Test one thing at a time
- Use descriptive test names
- Mock external dependencies
- Test both happy path and edge cases
- Keep tests fast and isolated

### Integration Tests
- Test realistic user scenarios
- Mock external APIs
- Test component interactions
- Verify state changes
- Test error handling

### E2E Tests
- Focus on critical user journeys
- Use page object model for complex flows
- Test across different browsers
- Keep tests stable and reliable
- Use proper waits and assertions

### Performance Tests
- Set realistic performance budgets
- Test on different network conditions
- Monitor Core Web Vitals
- Test with large datasets
- Validate optimization effectiveness

## Coverage Requirements

### Minimum Coverage Thresholds
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 60%
- **Statements**: 70%

### Coverage Exclusions
- Configuration files
- Test files
- Build scripts
- Third-party libraries
- Development utilities

### Coverage Reports
Coverage reports are generated in multiple formats:
- **HTML**: `coverage/index.html`
- **JSON**: `coverage/coverage-summary.json`
- **LCOV**: `coverage/lcov.info`
- **Text**: Console output

## CI/CD Integration

### GitHub Actions Workflow
Our CI/CD pipeline includes:

1. **Linting and Code Quality**
2. **Unit and Integration Tests**
3. **E2E Tests**
4. **Performance Tests**
5. **Security Scanning**
6. **Build and Deploy**

### Test Artifacts
- Test results and coverage reports
- E2E test screenshots and videos
- Performance metrics
- Build artifacts

### Quality Gates
- All tests must pass
- Coverage thresholds must be met
- Performance budgets must be maintained
- Security scans must pass

## Troubleshooting

### Common Issues

#### Tests Timing Out
```bash
# Increase timeout in vitest.config.js
export default defineConfig({
  test: {
    testTimeout: 10000
  }
});
```

#### E2E Tests Failing
```bash
# Run in headed mode to debug
npm run test:e2e:headed

# Check test artifacts
ls test-results/
```

#### Coverage Issues
```bash
# Check which files are not covered
npm run test:coverage
open coverage/index.html
```

#### Mock Issues
```bash
# Clear all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Debugging Tips

1. **Use `screen.debug()`** to see rendered HTML
2. **Use `--headed` flag** for E2E debugging
3. **Check test artifacts** for screenshots and videos
4. **Use `console.log`** sparingly in tests
5. **Run tests in isolation** to identify flaky tests

## Performance Monitoring

### Metrics Tracked
- **Core Web Vitals**: LCP, FID, CLS
- **Load Times**: Page load, resource load
- **Bundle Size**: JavaScript, CSS, assets
- **Memory Usage**: Heap size, garbage collection
- **Network**: Request count, cache efficiency

### Performance Budgets
- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1
- **Total Bundle Size**: < 2MB

## Continuous Improvement

### Regular Tasks
- Review and update test coverage
- Optimize slow tests
- Update test dependencies
- Review performance metrics
- Refactor test code

### Metrics to Monitor
- Test execution time
- Test flakiness rate
- Coverage trends
- Performance regression
- Bug escape rate

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Performance Testing Guide](https://web.dev/performance/)

---

For questions or issues with testing, please check the troubleshooting section or create an issue in the project repository.