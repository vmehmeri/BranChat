# Contributing to BranChat

Thank you for your interest in contributing to BranChat! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (or pnpm/yarn)
- Git
- API keys from at least one provider (OpenAI, Anthropic, Google AI, or xAI) for testing

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/BranChat.git
   cd BranChat
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/vmehmeri/BranChat.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

7. **Open** [http://localhost:5173](http://localhost:5173) in your browser

## Making Changes

### Branch Naming

Create a descriptive branch name for your changes:

- `feature/add-voice-input` - For new features
- `fix/message-scroll-issue` - For bug fixes
- `docs/update-readme` - For documentation changes
- `refactor/chat-context` - For code refactoring
- `test/database-service` - For adding tests

### Workflow

1. **Sync your fork** with upstream:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following our [coding standards](#coding-standards)

4. **Run tests and linting**:
   ```bash
   npm run lint
   npm test
   ```

5. **Commit your changes** using [conventional commits](#commit-messages)

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** against the `main` branch

## Pull Request Process

1. **Fill out the PR template** completely
2. **Ensure all checks pass** (tests, linting, build)
3. **Keep PRs focused** - One feature or fix per PR
4. **Update documentation** for user-facing changes
5. **Add tests** for new functionality
6. **Respond to review feedback** promptly

### PR Checklist

Before submitting your PR, ensure:

- [ ] Code follows the project's coding standards
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventions
- [ ] PR description explains the changes

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types; avoid `any` where possible
- Use interfaces for object shapes
- Export types from dedicated type files

### React

- Use functional components with hooks
- Keep components focused and reusable
- Use the existing component patterns in `src/components/`
- Follow the established folder structure

### Styling

- Use Tailwind CSS for styling
- Follow the existing design patterns
- Use shadcn/ui components where appropriate
- Support both light and dark themes

### Code Organization

```
src/
├── components/        # React components
│   ├── chat/         # Chat-specific components
│   ├── layout/       # Layout components
│   └── ui/           # shadcn/ui components
├── contexts/         # React contexts
├── services/         # API and database services
├── types/            # TypeScript type definitions
├── lib/              # Utility functions
└── pages/            # Page components
```

### Best Practices

- Write self-documenting code with clear naming
- Keep functions small and focused
- Handle errors gracefully
- Consider accessibility (a11y)
- Avoid premature optimization

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in `__tests__` directories near the code they test
- Use descriptive test names that explain the expected behavior
- Test both success and error cases
- Mock external dependencies (API calls, etc.)

Example test structure:
```typescript
describe('ComponentName', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(chat): add voice input support

fix(branches): resolve scroll position issue when switching branches

docs(readme): update installation instructions

refactor(llm): extract provider factory pattern
```

## Issue Guidelines

### Reporting Bugs

When reporting a bug, please include:

1. **Description**: Clear description of the issue
2. **Steps to reproduce**: Detailed steps to reproduce the bug
3. **Expected behavior**: What you expected to happen
4. **Actual behavior**: What actually happened
5. **Environment**: OS, browser, Node.js version
6. **Screenshots**: If applicable

### Requesting Features

When requesting a feature:

1. **Use case**: Explain why this feature would be useful
2. **Proposed solution**: Describe your ideal solution
3. **Alternatives**: Any alternative solutions you've considered
4. **Additional context**: Mockups, examples, etc.

### Before Submitting

- Search existing issues to avoid duplicates
- Use the appropriate issue template
- Provide as much relevant information as possible

## Questions?

- Check the [README](README.md) for general information
- Open a [Discussion](https://github.com/vmehmeri/BranChat/discussions) for questions
- Join our community discussions

---

Thank you for contributing to BranChat!
