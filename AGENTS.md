# Agent Guidelines for this Repository

This file provides instructions for AI agents working in this repository.

## Repository Overview
- **Purpose**: Collection of Agent Skills defined in markdown files.
- **Location**: Skills are located in `skills/<skill-name>/SKILL.md`.
- **Language**: TypeScript (Node.js) with ES Modules.
- **Runtime**: Node.js with `tsx` for execution.

## Build, Lint, and Test

### Commands
- **Run a script**: `npx tsx <filename.ts>`
  - Example: `npx tsx try1.ts`
- **Install dependencies**: `npm install`
- **Type check**: `npx tsc --noEmit`

> **Note**: The `npm test` script in `package.json` points to `index.ts` which may not exist. Prefer running specific test files or scripts using `tsx`.

### Testing Strategy
- Since this is a POC/Skills repo, testing is often done via standalone scripts (like `try1.ts`).
- Create new test scripts as `<name>.test.ts` if adding formal tests.
- Run a specific test file: `npx tsx <path/to/test-file.ts>`

## Code Style & Conventions

### TypeScript Configuration
- **Target**: `ESNext`
- **Module**: `NodeNext`
- **Strict Mode**: Enabled (`strict: true`)
- **Top-level await**: Supported and encouraged for scripts.

### Imports
- Use ES Module syntax: `import { ... } from "..."`
- Use precise imports; avoid star imports (`import * as ...`) unless necessary.
- Prefer named exports over default exports.

### Formatting
- **Indentation**: 2 spaces.
- **Semicolons**: Always use semicolons.
- **Quotes**: Double quotes `"` are preferred.
- **Trailing Commas**: ES5 compatible (objects, arrays).

### Naming Conventions
- **Files**: `kebab-case` (e.g., `my-script.ts`, `skill-definition.md`).
- **Classes**: `PascalCase` (e.g., `TechnicalDebtAssessment`).
- **Variables/Functions**: `camelCase` (e.g., `calculatePriority`, `debtItem`).
- **Interfaces/Types**: `PascalCase` (e.g., `DebtItem`).
- **Constants**: `UPPER_SNAKE_CASE` for global constants.

### Error Handling
- Use `try/catch` blocks for async operations, especially network calls or file I/O.
- Log errors clearly to `console.error`.
- For scripts, ensure the process exits with a non-zero code on failure: `process.exit(1)`.

### Skill Definition Format (`SKILL.md`)
When creating or editing skills in `skills/`:
1. **Frontmatter**:
   ```yaml
   ---
   name: skill-name-kebab-case
   description: Brief description of what the skill does.
   ---
   ```
2. **Structure**:
   - `# Title`
   - `## Overview`
   - `## When to Use`
   - `## Implementation Examples` (TypeScript code blocks)
   - `## Best Practices`

## Workflow for Agents
1. **Explore**: Use `ls` and `read` to explore `skills/` directory.
2. **Verify**: Before editing a skill, read the existing `SKILL.md` to understand its structure.
3. **Execute**: Use `npx tsx` to run verification scripts.
4. **Dependencies**: Check `package.json` before importing new packages. If a package is missing, ask the user before installing.

## Environment Details
- **Working Directory**: `D:\temp\agent-skills`
- **Platform**: Windows (`win32`)

## Specific Rules
- **No changes to `package.json`** without explicit user permission.
- **Absolute paths**: Always use absolute paths when file tools require them.
- **Safety**: Do not commit secrets or API keys.
