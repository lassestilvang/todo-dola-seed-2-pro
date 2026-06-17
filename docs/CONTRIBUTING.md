# Contributing to Todo Dola Seed 2 Pro

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env.local` and configure
4. Run `pnpm dev` to start development server

## Project Structure

- `/app` - Next.js pages and API routes
- `/components` - React components
- `/lib` - Library code (database, utils, types)
- `/mobile` - React Native mobile app
- `/tests` - Unit and integration tests
- `/e2e` - End-to-end tests

## Coding Standards

- Use TypeScript for all new code
- Follow existing component patterns
- Write tests for new features
- Update documentation as needed

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm e2e

# Run type check
pnpm typecheck
```

## Pull Request Process

1. Create feature branch
2. Make changes with tests
3. Ensure all tests pass
4. Update documentation
5. Submit PR with clear description

## Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code restructuring