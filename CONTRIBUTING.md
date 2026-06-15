# Contributing to Todo Dola Seed 2 Pro

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start development server**
   ```bash
   pnpm dev
   ```

3. **Run tests**
   ```bash
   pnpm test
   ```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── (pages)/           # Application pages
├── components/            # React components
│   ├── ui/               # UI primitives
│   └── tasks/            # Task-specific components
├── lib/                   # Library code
│   ├── db/               # Database layer
│   ├── api/              # API utilities
│   └── utils/            # Helper functions
└── mobile/               # React Native app
```

## Code Standards

- **TypeScript**: Use strict mode, no `any` types
- **Formatting**: Prettier with 2-space indentation
- **Imports**: Use `@/` alias for imports from `lib/`
- **Components**: One component per file

## Testing

- Run `pnpm test` for unit tests
- Run `pnpm e2e` for end-to-end tests
- Maintain 75%+ coverage for `lib/` code

## API Routes

API routes should follow this pattern:

```typescript
import { initDb } from '@/lib/db';
import { withErrorHandling } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';

export const GET = withErrorHandling(async (request: NextRequest) => {
  await initDb();
  // ... logic
  return NextResponse.json({ data: result });
});
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Add/update tests as needed
4. Ensure all tests pass
5. Submit a pull request with a clear description

## Questions?

Open an issue or contact the maintainers.
