# Contributing to @mtngtools/unstorage

Thank you for your interest in contributing to @mtngtools/unstorage! We welcome contributions from the community.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm
- Git

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mtng-unstorage.git
   cd mtng-unstorage
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Run Tests**
   ```bash
   # Unit tests
   pnpm test
   
   # E2E tests (requires AWS setup)
   pnpm test:e2e
   ```

4. **Build**
   ```bash
   pnpm build
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `test: add tests`
- `refactor: improve code structure`
- `ci: update workflows`

### Code Style

- Use TypeScript
- Follow existing code style (ESLint configured)
- Add tests for new functionality
- Update documentation as needed

### Testing

#### Unit Tests
```bash
pnpm test
```

#### E2E Tests
Requires AWS credentials and S3 bucket:

1. Copy environment template:
   ```bash
   cp .env.test .env.test.local
   ```

2. Configure your settings:
   ```bash
   AWS_S3_E2E_ENABLED=true
   AWS_S3_TEST_BUCKET=your-test-bucket
   AWS_S3_TEST_PREFIX=test-prefix-
   ```

3. Run tests:
   ```bash
   pnpm test:e2e
   ```

## Adding New Drivers

1. **Create Driver File**
   ```typescript
   // src/drivers/my-driver/my-driver.ts
   import { defineDriver } from 'unstorage'
   import type { Driver } from 'unstorage'
   
   export interface MyDriverOptions {
     // Driver options
   }
   
   export const myDriver = defineDriver<MyDriverOptions>((opts = {}) => {
     return <Driver>{
       name: 'my-driver',
       // Implementation
     }
   })
   ```

2. **Add Tests**
   ```typescript
   // src/drivers/my-driver/my-driver.test.ts
   ```

3. **Add E2E Tests** (if applicable)
   ```typescript
   // tests-e2e/my-driver.e2e.test.ts
   ```

4. **Update Exports**
   ```typescript
   // src/index.ts
   export { myDriver } from './drivers/my-driver/my-driver'
   ```

5. **Add Documentation**
   ```markdown
   # docs/drivers/my-driver.md
   ```

## Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test Locally**
   ```bash
   pnpm test
   pnpm build
   pnpm typecheck
   pnpm lint
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/my-feature
   ```

6. **Fill Out PR Template**
   - Describe your changes
   - Link related issues
   - Check all boxes in the template

## Code Review Process

1. **Automated Checks**
   - CI tests must pass
   - Code coverage maintained
   - No linting errors

2. **Manual Review**
   - Code quality
   - Test coverage
   - Documentation completeness
   - Breaking change impact

3. **Approval and Merge**
   - Requires maintainer approval
   - Squash merge preferred

## Release Process

Releases are automated through GitHub Actions:

1. **Version Bump**
   ```bash
   npm version patch|minor|major
   ```

2. **Create Tag**
   ```bash
   git push origin main --follow-tags
   ```

3. **Automated Release**
   - GitHub Action builds and publishes to npm
   - Creates GitHub release with changelog
   - Updates documentation

## Questions or Issues?

- 📝 [Open an Issue](https://github.com/mtngtools/mtng-unstorage/issues)
- 💬 [Start a Discussion](https://github.com/mtngtools/mtng-unstorage/discussions)

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.