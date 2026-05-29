# .smmignore

Create `.smmignore` at docs root to skip paths during markdown traversal.

Rules are glob-like, processed top-to-bottom.

- Lines starting with `#` are comments.
- Empty lines are ignored.
- Prefix with `!` to un-ignore.

Example:

```text
drafts/**
private/**
!private/keep.md
```

Paths are evaluated against traversal targets in the docs tree; ignored paths are skipped during route/content generation.
