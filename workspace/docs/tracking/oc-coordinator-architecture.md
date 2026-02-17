# oc-coordinator.sh Architecture Analysis

**Date**: 2026-02-17
**Purpose**: Document how oc-coordinator.sh works and which scripts are missing

## Executive Summary

**oc-coordinator.sh EXISTS** at `/home/dev/.config/opencode/workspace/scripts/global/oc-coordinator.sh`

The confusion was due to:
1. Documentation says scripts are at `~/.config/opencode/scripts/global/`
2. Actual location is `~/.config/opencode/workspace/scripts/global/`
3. A symlink exists but points to itself (recursive link)

## How oc-coordinator.sh Works

### Architecture: Single-Server with HTTP Session API

**Does it use `opencode run`?** NO
**Does it use `opencode serve`?** YES (to spawn the initial server)

### Process Flow

```bash
# 1. Spawn ONE OpenCode server
cd "$server_dir" && opencode serve --port "$SERVER_PORT" > /dev/null 2>&1 &
SERVER_PID=$!

# 2. For each task in manifest:
#    a) Create session via spawner wrapper
spawner_result=$(bash "$SPAWNER_CLI" spawn \
    "$BASE_URL" \
    "$project_path" \
    "$role" \
    "$role" \
    "$description" \
    "$agent" 2>&1)

#    b) Extract session ID
opencode_session_id=$(echo "$spawner_result" | jq -r '.opencodeSessionId')

#    c) Send prompt to session via HTTP POST
curl -s -X POST "$BASE_URL/session/$opencode_session_id/prompt_async?directory=$cwd" \
  -H "Content-Type: application/json" \
  -d "$prompt_json"

# 3. Monitor signal files for completion
#    - Tasks write .pending/.done/.failed signal files
#    - Coordinator polls these files every N seconds

# 4. Report results when all complete
```

## Script Dependencies

### Scripts Referenced by oc-coordinator.sh

| Script | Location | Status |
|--------|----------|--------|
| `oc-coordinator.sh` | workspace/scripts/global/ | ✅ EXISTS |
| `build-task-prompt.sh` | workspace/scripts/global/ | ✅ EXISTS |
| `start-work-session.sh` | workspace/scripts/global/ | ✅ EXISTS |
| `get-active-work-session.sh` | workspace/scripts/global/ | ✅ EXISTS |
| `register-spawned-task.sh` | workspace/scripts/global/ | ✅ EXISTS |
| `update-task-status.sh` | workspace/scripts/global/ | ✅ EXISTS |
| `lib/session-spawner-cli.sh` | workspace/scripts/global/lib/ | ❓ UNKNOWN |

### Scripts Referenced by multi-session-coordinator.md

| Script | Referenced Location | Actual Location | Status |
|--------|---------------------|-----------------|--------|
| `oc-coordinator.sh` | scripts/global/ | workspace/scripts/global/ | ✅ EXISTS (wrong path in docs) |
| `oc-coordinator-multiserver-backup.sh` | scripts/global/ | workspace/scripts/global/ | ✅ EXISTS |
| `cleanup-worktrees.sh` | scripts/global/ | workspace/scripts/global/ | ✅ EXISTS |
| `get-active-work-session.sh` | scripts/global/ | workspace/scripts/global/ | ✅ EXISTS |
| `get-coordinator-session.sh` | scripts/global/ | workspace/scripts/global/ | ✅ EXISTS |
| `register-spawned-task.sh` | scripts/global/ | workspace/scripts/global/ | ✅ EXISTS |
| `start-work-session.sh` | scripts/global/ | workspace/scripts/global/ | ✅ EXISTS |
| `update-task-status.sh` | scripts/global/ | workspace/scripts/global/ | ✅ EXISTS |

## Missing Component

### session-spawner-cli.sh

**Referenced by**: oc-coordinator.sh line ~635
**Expected location**: `workspace/scripts/global/lib/session-spawner-cli.sh`
**Status**: Unknown (need to check)

This wrapper script handles:
- Session creation via HTTP POST to OpenCode server
- Extracting session IDs from response
- Error handling

### Check for Missing Component

```bash
ls -la /home/dev/.config/opencode/workspace/scripts/global/lib/session-spawner-cli.sh
```

If missing, this would explain why oc-coordinator.sh can't spawn sessions.

## Path Issue

### The Symlink Problem

```bash
$ ls -la ~/.config/opencode/scripts/global/
drwxr-xr-x 2 dev dev 4096 Feb 17 18:53 .
drwxr-xr-x 3 dev dev 4096 Feb 16 22:07 ..
-rwxr-xr-x 1 dev dev 4624 Feb 16 17:20 check-git-health.sh
lrwxrwxrwx 1 dev dev   41 Feb 17 18:53 global -> /home/dev/.config/opencode/scripts/global
```

There's a recursive symlink: `scripts/global/global -> scripts/global`

This means:
- Documentation says: `~/.config/opencode/scripts/global/oc-coordinator.sh`
- Actual location: `~/.config/opencode/workspace/scripts/global/oc-coordinator.sh`
- Accessible via: `~/.config/opencode/scripts/global/global/oc-coordinator.sh` (due to symlink)

## Correct Usage

### Method 1: Use Full Path (Recommended)

```bash
bash /home/dev/.config/opencode/workspace/scripts/global/oc-coordinator.sh \
  /workspace/sevdesk-shopify-connector/orchestration/research-manifest.json \
  --dry-run
```

### Method 2: Use Symlink Path

```bash
bash ~/.config/opencode/scripts/global/global/oc-coordinator.sh \
  /workspace/sevdesk-shopify-connector/orchestration/research-manifest.json \
  --dry-run
```

## Does oc-coordinator Use opencode run?

**NO** - It uses:
1. `opencode serve` - To spawn the initial server
2. HTTP POST API - To create sessions and send prompts
3. Signal files - For monitoring task completion

**NOT `opencode run`** because:
- `opencode run` spawns a blocking session (waits for completion)
- oc-coordinator needs non-blocking parallel sessions
- HTTP API provides async session creation and messaging

## Comparison Table

| Method | Command | Blocking? | Use Case |
|--------|---------|-----------|----------|
| `opencode run` | `opencode run "prompt" --agent X` | YES | Single interactive task |
| `opencode serve` | `opencode serve --port 5001` | NO (daemon) | Start server for HTTP API |
| HTTP Session API | `POST /session` + `POST /session/{id}/prompt_async` | NO | Parallel non-blocking tasks |
| oc-coordinator.sh | Uses `opencode serve` + HTTP API | NO | Automated manifest-driven coordination |

## Next Steps

1. Check if `session-spawner-cli.sh` exists
2. If missing, determine if we need to create it or if there's an alternative
3. Fix documentation path references from `scripts/global/` to `workspace/scripts/global/`
4. Test oc-coordinator.sh with research manifest
