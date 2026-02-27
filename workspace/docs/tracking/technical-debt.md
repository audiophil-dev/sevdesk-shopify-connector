# Technical Debt

## Current Debt

| Area | Issue | Impact | Priority | Est. Effort |
|------|-------|--------|----------|-------------|
| Linting | No ESLint configuration | Inconsistent code style | Medium | 1h |
| Type Safety | Some `any` types in API responses | Potential runtime errors | Medium | 2h |
| Documentation | API reference incomplete | Harder onboarding | Low | 2h |

## Addressed Debt

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-02-27 | Duplicate docs in workspace/docs/ | Consolidated to workspace/docs/knowledge/ |
| 2026-02-27 | Memory bank structure inconsistent | Reorganized to core/active/logs |
| 2026-02-22 | Test coverage unknown | Added Jest coverage (87.83%) |

## Prevention Measures

1. **Code Review**: All PRs require review before merge
2. **Test Coverage**: Maintain 80%+ coverage threshold
3. **Documentation**: Update docs with code changes
4. **Linting**: Add ESLint + Prettier configuration
