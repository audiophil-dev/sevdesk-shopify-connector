# Task Registry

**Purpose**: Coordination log for multi-agent task execution. Tracks which agent is working on which plan to prevent conflicts and dependency violations.

**Last Updated**: 2026-02-27 16:51:49

---

## Active Work

### testing - A4-task-6
| Field | Value |
|-------|-------|
| **Agent** | testing |
| **Ticket** | A4-task-6 |
| **Task** | API endpoint integration tests |
| **Worktree** | /workspace/sevdesk-shopify-connector/.worktrees/testing-A4-task-6 |
| **Branch** | feature/testing-A4-task-6 |
| **Started** | 2026-02-27 16:51:49 |
| **Expected Completion** | 2026-02-27 18:51:49 |
| **Dependencies** | none |

---

## Recently Completed (Last 10)

(No completed tasks yet)

---

## Conflicts & Resolutions

(No conflicts logged yet)

---

## Notes

- Max 3 concurrent agents enforced by orchestrator
- Sessions timeout after 30 minutes of no updates → auto-marked as "stalled"
- Dependency blocking is strict (plan cannot start until all dependencies have handovers)
- This file is shared across all worktrees via symlinks
