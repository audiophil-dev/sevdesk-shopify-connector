# Task Registry

**Purpose**: Coordination log for multi-agent task execution. Tracks which agent is working on which plan to prevent conflicts and dependency violations.

**Last Updated**: [Not yet updated]

---

## Active Work

(No active tasks currently)

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
