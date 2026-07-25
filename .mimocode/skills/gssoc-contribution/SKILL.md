---
name: gssoc-contribution
description: >
  End-to-end open-source contribution workflow for GSSoC (GirlScript Summer of Code) or similar programs.
  Scans a forked repo's codebase, discovers unraised issues, drafts issue descriptions,
  implements fixes, and prepares PR text. Replaces the manual multi-session cycle of
  "scan codebase → find issues → check owner repo → implement → PR".
---

# GSSoC / Open-Source Contribution Workflow

When the user provides a GitHub repo URL or asks to "find issues" / "scan codebase" for contribution, follow this procedure.

## Step 1 — Understand the Repo

```bash
# Clone or navigate to the repo
# Identify: tech stack, project structure, existing issues (open + closed)
```

- Read `README.md`, `package.json` / `requirements.txt`, key config files.
- Identify the tech stack (React, Node, Python, etc.).
- Note project purpose and architecture.

## Step 2 — Scan for Issues

Perform a structured audit across these categories:

1. **Security** — hardcoded secrets, missing validation, plain-text passwords, missing auth checks, CORS misconfig.
2. **Bugs** — uncaught errors, broken routes, missing error handling, null/undefined access.
3. **Performance** — unnecessary re-renders, missing lazy loading, N+1 queries, unoptimized images.
4. **Accessibility** — missing ARIA labels, keyboard navigation, color contrast, screen reader support.
5. **Code Quality** — unused imports, dead code, missing types, inconsistent naming, missing tests.
6. **Documentation** — missing JSDoc, outdated README, missing contributing guide.
7. **PWA/Offline** — service worker issues, cache strategy, manifest problems.

For each finding, record:
- Category and severity (Critical / Major / Minor)
- File path and line numbers
- Description of the issue
- Suggested fix

## Step 3 — Check Existing Issues

```bash
gh issue list --repo <owner>/<repo> --state all --limit 100
```

- Cross-reference findings with existing open/closed issues.
- Filter out issues already raised by other contributors.
- Keep only **novel issues** not covered by any existing issue or PR.

## Step 4 — Draft Issue Descriptions

For each novel issue, produce a GitHub issue draft:

```markdown
## 🐛 [Category] Brief Title

**Priority:** Critical | Major | Minor
**Area:** Frontend | Backend | Full-Stack | DevOps | Docs

### Problem
Clear description of what's wrong.

### Steps to Reproduce (for bugs)
1. ...
2. ...

### Expected Behavior
What should happen.

### Current Behavior
What actually happens.

### Suggested Fix
How to fix it (file paths, line numbers, code changes).

### Additional Context
Screenshots, logs, related issues.
```

## Step 5 — Implement Fix (if user requests)

- Create a feature branch: `git checkout -b fix/<issue-slug>`
- Make minimal, focused changes
- Test the fix
- Write a clear commit message

## Step 6 — Prepare PR

```markdown
## Summary
- What changed and why

## Related Issue
Closes #<issue-number>

## Type of Change
- [x] Bug fix
- [ ] New feature
- [ ] Documentation update

## Testing
How the fix was verified.

## Checklist
- [ ] Code follows project style
- [ ] No new warnings
- [ ] Tests pass
```

## Anti-Patterns to Avoid

- Don't suggest issues that modify `package.json` or lock files unless truly necessary (maintainers reject these).
- Don't raise cosmetic-only issues (typos in comments) as "Major" severity.
- Don't change ESLint/Prettier config files — fix the code instead.
- Always check the repo's `CONTRIBUTING.md` for PR format requirements.
- Verify the issue isn't already assigned or being worked on.
