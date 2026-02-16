# Testing Guide

This document describes the testing strategy and available tests for the Pickleball Booking Application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Continuous Integration](#continuous-integration)

## Overview

Our application uses **Jest** as the testing framework with **React Testing Library** for component tests. Tests are organized by type and located in the `src/__tests__` directory.

### Testing Philosophy

- **Unit Tests**: Test individual functions and utilities in isolation
- **Integration Tests**: Test how components and modules work together
- **Edge Cases**: Comprehensive coverage of boundary conditions and error scenarios

### Coverage Goals

We maintain the following minimum coverage thresholds:

- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%
- **Statements**: 50%

These thresholds are enforced by Jest and configured in `jest.config.js`.

## Test Structure

```
src/__tests__/
├── components/                 # Component tests
│   ├── court-card.test.tsx    # CourtCard component tests
│   └── booking-card.test.tsx  # BookingCard component tests
├── lib/                        # Business logic tests
│   ├── availability.test.ts   # Peak time & price calculation
│   ├── utils.test.ts          # Utility function tests
│   ├── error-handling.test.ts # Error handling scenarios
│   ├── validations/           # Input validation tests
│   │   └── booking.test.ts
│   └── booking/               # Booking-related logic
│       ├── slot-availability.test.ts  # Slot checking logic
│       ├── pricing.test.ts            # Price calculation tests
│       └── date-time.test.ts          # Date/time utilities
└── api/                        # API route tests
    └── cron/
        └── expire-bookings.test.ts
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage Report

```bash
npm run test:coverage
```

This generates a coverage report in the `coverage/` directory and displays a summary in the terminal.

### Run Specific Test File

```bash
npm test -- availability.test.ts
```

### Run Tests Matching a Pattern

```bash
npm test -- --testNamePattern="pricing"
```

## Test Coverage

### Current Test Files

#### 1. Component Tests

##### **CourtCard Tests** (`src/__tests__/components/court-card.test.tsx`)
- Renders court information correctly
- Displays indoor/outdoor badge
- Shows pricing (standard and peak)
- Displays court features (surface, lighting)
- Shows operating hours
- Contains correct booking link

##### **BookingCard Tests** (`src/__tests__/components/booking-card.test.tsx`)
- Renders confirmed bookings
- Shows pending payment bookings with countdown timer
- Updates countdown every second
- Changes styling when time is low (< 2 minutes)
- Triggers page refresh when booking expires
- Shows expired message after countdown
- Hides "Pay Now" button when expired
- Displays multiple slots correctly
- Formats prices correctly
- Shows correct booking type and status badges

#### 2. Business Logic Tests

##### **Availability Tests** (`src/__tests__/lib/availability.test.ts`)
- Peak time detection for weekends
- Peak time detection for weekday evenings (18:00-21:00)
- Off-peak time identification
- Boundary testing at 18:00 and 21:00
- Price calculation for peak vs off-peak hours

##### **Slot Availability Tests** (`src/__tests__/lib/booking/slot-availability.test.ts`)
- Available slot detection
- Booked slot detection
- Blocked court detection
- Partial overlap scenarios
- Complete containment scenarios
- Adjacent slots (no overlap)
- Ignoring cancelled/expired bookings

##### **Pricing Tests** (`src/__tests__/lib/booking/pricing.test.ts`)
- Single slot pricing (off-peak, peak, weekend)
- Multiple slot pricing
- Mixed pricing when crossing peak boundaries
- Courts without peak pricing
- Different slot durations (30 min, 60 min, 90 min)
- Edge cases (0 slots, boundary times)
- Hourly boundary testing for all hours

##### **Date/Time Tests** (`src/__tests__/lib/booking/date-time.test.ts`)
- Start of day calculations
- End of day calculations
- Timezone conversions (UTC ↔ Singapore)
- Date parsing (ISO strings, timezones)
- Date arithmetic (adding days, month/year boundaries)
- Leap year handling
- Date comparisons
- Slot time generation
- Weekend detection
- Edge cases (invalid dates, far future/past, millisecond precision)

#### 3. Validation Tests

##### **Booking Validation Tests** (`src/__tests__/lib/validations/booking.test.ts`)
- Valid booking inputs (1-3 slots)
- Missing required fields (courtId, date, startTime, slots)
- Invalid formats (date, time)
- Slot count validation (min: 1, max: 3)
- Type coercion (string to number)
- Edge cases (null, undefined, whitespace)

#### 4. API Route Tests

##### **Expire Bookings Cron Tests** (`src/__tests__/api/cron/expire-bookings.test.ts`)
- Authorization with CRON_SECRET
- Finding expired bookings
- Not finding unexpired bookings
- Updating booking status to EXPIRED
- Updating payment status to EXPIRED
- Transaction atomicity
- Handling no expired bookings
- Handling multiple expired bookings
- Only expiring PENDING_PAYMENT bookings
- Response format validation

#### 5. Error Handling Tests

##### **Error Handling Tests** (`src/__tests__/lib/error-handling.test.ts`)
- Database connection errors
- Unique constraint violations
- Foreign key constraint violations
- Record not found errors
- Validation errors (email, phone, price, slot count)
- Payment errors (timeout, signature, currency/amount mismatch)
- Booking conflict detection
- Authorization checks
- Rate limiting
- Data integrity validation
- Network errors (timeout, unavailable, rate limits)
- File system errors
- Boundary conditions (empty arrays, null/undefined, max integers)

#### 6. Utility Tests

##### **Utils Tests** (`src/__tests__/lib/utils.test.ts`)
- className merging with `cn()` utility
- Conditional class names
- Filtering falsy values
- Tailwind class deduplication
- Object and array syntax
- Empty inputs

## Writing Tests

### Component Test Template

```typescript
import { render, screen } from "@testing-library/react";
import { MyComponent } from "@/components/my-component";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

### Business Logic Test Template

```typescript
import { myFunction } from "@/lib/my-module";

describe("myFunction", () => {
  it("should return expected result", () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Best Practices

1. **Use descriptive test names**: Test names should clearly describe what is being tested
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Test one thing per test**: Keep tests focused and atomic
4. **Mock external dependencies**: Use Jest mocks for database, API calls, etc.
5. **Test edge cases**: Include boundary conditions and error scenarios
6. **Keep tests independent**: Tests should not depend on each other
7. **Use meaningful assertions**: Choose the most specific matcher for clarity

### Common Matchers

```typescript
// Equality
expect(value).toBe(expectedValue);
expect(value).toEqual(expectedValue);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3); // Floating point

// Strings
expect(value).toMatch(/pattern/);
expect(value).toContain("substring");

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(obj).toHaveProperty("key");

// DOM (React Testing Library)
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveAttribute("href", "/path");
expect(element).toHaveClass("className");
```

## Continuous Integration

Tests run automatically on every commit via GitHub Actions (if configured). The build will fail if:

1. Any test fails
2. Coverage drops below threshold
3. ESLint errors are present

### Pre-commit Hooks

Consider setting up Husky to run tests before commits:

```bash
npx husky-init
npx husky set .husky/pre-commit "npm test"
```

## Debugging Tests

### Run Tests in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome and click "Inspect" next to the Node process.

### View Test Output

```bash
npm test -- --verbose
```

### Update Snapshots (if using snapshots)

```bash
npm test -- -u
```

## Test Coverage Report

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in your browser to see a detailed coverage report with:

- File-by-file coverage breakdown
- Line-by-line coverage visualization
- Uncovered code highlighting

## Areas for Future Testing

While we have comprehensive test coverage, consider adding tests for:

1. **E2E Tests**: Using Playwright or Cypress for full user flows
2. **Performance Tests**: Load testing for API endpoints
3. **Accessibility Tests**: Using jest-axe for a11y compliance
4. **Visual Regression Tests**: Using Percy or Chromatic
5. **Contract Tests**: For API integrations (HitPay)

## Troubleshooting

### Tests Failing Locally But Passing in CI

- Check Node.js version matches CI
- Clear Jest cache: `npm test -- --clearCache`
- Check for timezone differences

### Slow Tests

- Use `jest --maxWorkers=4` to limit parallelization
- Mock expensive operations (database, network)
- Split large test files

### Flaky Tests

- Avoid relying on exact timing (use `waitFor`)
- Ensure proper cleanup in `afterEach`
- Check for race conditions in async code

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
