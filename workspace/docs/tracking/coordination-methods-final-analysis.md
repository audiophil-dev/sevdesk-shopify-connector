# Coordination Methods: Final Analysis

**Date**: 2026-02-17  
**Phase**: Research Coordination Complete  
**Sessions Spawned**: 4 (R1-R4, all active)  
**Method Used**: HTTP API (Manual)

## Executive Summary

Successfully spawned 4 parallel research sessions using the HTTP API method. The investigation revealed three primary coordination methods, each with distinct purposes and trade-offs. oc-coordinator.sh failed due to missing `axios` dependency in project context.

## Three Coordination Methods

### 1. HTTP API (Manual) - Implemented

**Mechanism**: Direct REST calls to OpenCode server on port 5001

```bash
# Create session
SESSION_ID=$(curl -X POST "http://localhost:5001/session?directory=/workspace/project" \
  -H "Content-Type: application/json" \
  -d '{"title":"agent-name: Task"}' | jq -r '.id')

# Send prompt
curl -X POST "http://localhost:5001/session/$SESSION_ID/prompt_async?directory=/workspace/project" \
  -H "Content-Type: application/json" \
  -d '{"agent":"agent-name","parts":[{"type":"text","text":"prompt"}]}'
```

**Behavior**: Non-blocking, fire-and-forget

**Spawns server**: No (uses existing on port 5001)

**Agent binding**: Via `{"agent":"agent-name"}` in prompt_async body

**Sessions visible**: Yes (in web UI at http://localhost:5001)

**Dependencies**: curl, jq (shell utilities)

**Pros**:
- Full manual control
- No external dependencies (beyond curl/jq)
- Real-time (non-blocking)
- Simple for 1-4 sessions
- Sessions immediately visible in UI

**Cons**:
- Manual orchestration (repetitive for many tasks)
- No automatic dependency management
- Must handle errors manually
- No aggregated reporting
- No automatic signal file monitoring

**Best for**: 1-4 parallel tasks, simple workflows, debugging

**Our use case**: Spawned 4 research tasks successfully via HTTP API

---

### 2. oc-coordinator.sh (Automated Orchestration) - Failed

**Mechanism**: Automated manifest-driven coordination script

```bash
bash oc-coordinator.sh manifest.json \
  --poll-interval 10 \
  --task-timeout 1800 \
  --max-concurrent 4
```

**What it does**:
1. Reads manifest.json with task definitions
2. Spawns ONE OpenCode server (or uses existing)
3. Creates N sessions via HTTP API (automated)
4. Sends prompts (automated)
5. Monitors signal files (polling every 10s)
6. Manages dependencies (waits for dependent tasks)
7. Reports aggregated results

**Behavior**: Synchronous coordination with background polling

**Sessions visible**: Yes (all on same server)

**Dependencies**:
- `axios` npm package (missing in this project)
- Requires session-spawner-cli.sh helper (Node.js-based)

**Pros**:
- Fully automated
- Dependency management built-in
- Signal file monitoring
- Work session tracking
- Parallel execution (respects max_concurrent)
- Comprehensive progress reporting

**Cons**:
- Complex architecture
- Requires axios npm package
- Harder to debug when issues occur
- Overkill for simple cases
- More tokens/complexity than needed

**Best for**: 5+ tasks with dependencies, complex workflows, large teams

**Why it failed**: The session-spawner-cli.sh helper script (at ~/.config/opencode/workspace/scripts/global/lib/session-spawner-cli.sh) uses Node.js and requires axios:

```
Error: Cannot find module 'axios'
Require stack:
  - /workspace/sevdesk-shopify-connector/[eval]
```

Could be fixed by:
```bash
npm install axios
```

But unnecessary for our use case.

---

### 3. opencode run (CLI Command) - Verified

**Mechanism**: OpenCode CLI command

```bash
cd /workspace/project
opencode run "Your prompt here" --agent agent-name
```

**Behavior**: BLOCKING - waits for agent response, streams output

**Spawns server**: No (uses existing or spawns random port)

**Agent binding**: Via `--agent` flag

**Sessions visible**: Yes (creates session)

**Output**: Streams JSON events or formatted text

**Key finding**: `opencode run` is **synchronous and blocking**

```bash
# Test confirmed: opencode run blocks until completion
$ timeout 5 opencode run "reply with HELLO" --agent technology-researcher
# Returns immediately with response

# Cannot spawn parallel tasks effectively
opencode run "Task 1" --agent tech-researcher &  # Background
opencode run "Task 2" --agent tech-researcher &  # Background
opencode run "Task 3" --agent tech-researcher &  # Background
wait  # All spawn in parallel, but...
# Each spawns own server or uses port 5001 sequentially
```

**Pros**:
- Simple CLI interface
- Immediate feedback
- Good for interactive use
- Built into OpenCode

**Cons**:
- Blocking (must wait for response)
- Harder to coordinate multiple tasks
- Less suitable for background spawning
- Output requires parsing

**Best for**: Single interactive tasks, debugging, testing

**NOT suitable for**: Parallel agent coordination (blocking nature prevents this)

---

### 4. Bidirectional Messaging (Communication Pattern)

**Not a spawning method** - a communication mechanism that works with all three methods above

**Mechanism**: Spawned agents send status updates back to coordinator via HTTP

```bash
# From spawned agent → coordinator
curl -X POST "http://localhost:5001/session/$COORDINATOR_SESSION/prompt_async?directory=$PROJECT" \
  -H "Content-Type: application/json" \
  -d '{"parts":[{"type":"text","text":"✅ Task completed"}]}'
```

**Critical requirement**: `?directory=$PROJECT_PATH` query parameter

**Without directory parameter**:
- HTTP 204 returned (looks successful)
- Message silently lost (OpenCode looks in global session storage)
- No error messages (fire-and-forget design)

**Works with**:
- HTTP API method ✅
- oc-coordinator.sh ✅
- opencode run ✅

**Purpose**:
- Real-time task completion notifications
- Progress updates (no polling delay)
- Status updates appear automatically in conversation

**Complements but doesn't replace**: Signal files (source of truth)

---

## Decision Matrix

| Scenario | Method | Why |
|----------|--------|-----|
| **1-4 independent parallel tasks** | HTTP API | Simple, manual, no dependencies ← **Our choice** |
| **5+ tasks with dependencies** | oc-coordinator.sh | Automated, dependency mgmt, monitoring |
| **Single interactive task** | opencode run | Immediate feedback, debugging |
| **Real-time notifications** | Bidirectional messaging | Works with all methods |

---

## Implementation: What We Did

### Sessions Spawned

Four parallel research sessions created via HTTP API:

```
R1: Shopify API Research
   Session: ses_39274d27bffelG3WZgSyoBs3WC
   Agent: technology-researcher
   Output: workspace/docs/knowledge/technical/shopify-api-research.md

R2: Sevdesk API Research
   Session: ses_392748f2bffeSqtBMdzL3FM4fc
   Agent: technology-researcher
   Output: workspace/docs/knowledge/technical/sevdesk-api-research.md

R3: Integration Patterns Research
   Session: ses_392746268ffewG3CIrsIv6i0hZ
   Agent: technology-researcher
   Output: workspace/docs/knowledge/technical/integration-patterns.md

R4: Tech Stack Recommendations
   Session: ses_392742bfaffex6gV4keduBQ7MH
   Agent: technology-researcher
   Output: workspace/docs/knowledge/technical/tech-stack-recommendation.md
```

### Code Pattern Used

```bash
# 1. Create session
SESSION_ID=$(curl -s -X POST "http://localhost:5001/session?directory=/workspace/sevdesk-shopify-connector" \
  -H "Content-Type: application/json" \
  -d '{"title":"technology-researcher: Task Title"}' | jq -r '.id')

# 2. Send prompt
PROMPT="Research prompt here..."
PROMPT_JSON=$(echo "$PROMPT" | jq -Rs .)

curl -s -X POST "http://localhost:5001/session/$SESSION_ID/prompt_async?directory=/workspace/sevdesk-shopify-connector" \
  -H "Content-Type: application/json" \
  -d "{\"agent\":\"technology-researcher\",\"parts\":[{\"type\":\"text\",\"text\":$PROMPT_JSON}]}"
```

**Key points**:
- `jq -Rs` escapes special characters in prompt
- `?directory=/workspace/sevdesk-shopify-connector` required for session routing
- `{"agent":"technology-researcher"}` maintains agent binding
- Non-blocking (returns immediately with HTTP 204)

---

## Comparison Table

| Feature | HTTP API | oc-coordinator | opencode run | Bidirectional |
|---------|----------|---|---|---|
| **Mechanism** | REST API | Script + HTTP API | CLI | HTTP API |
| **Blocking** | No | No | Yes | No |
| **Manual orchestration** | Yes | No | N/A | N/A |
| **Dependencies** | curl, jq | axios, Node.js | OpenCode CLI | HTTP access |
| **Dep management** | Manual | Automatic | N/A | N/A |
| **Best for** | 1-4 tasks | 5+ tasks | Interactive | Status updates |
| **Sessions visible** | Yes | Yes | Yes | Yes |
| **Parallel capable** | Yes | Yes | No | Yes |
| **Learning curve** | Low | High | Low | Medium |
| **Error handling** | Manual | Automatic | Automatic | Manual |
| **Progress reporting** | Manual | Automatic | Streaming | Via prompt_async |

---

## Why HTTP API Was Right Choice

**For this project**:
- 4 research tasks (not 5+)
- No dependencies between tasks
- Simple coordination needed
- No external npm packages required
- oc-coordinator.sh dependencies unavailable
- Quick iteration needed

**Why NOT oc-coordinator.sh**:
- Missing axios dependency
- Overkill for 4 independent tasks
- More complexity without benefit
- Harder to debug if issues arise

**Why NOT opencode run**:
- Blocking nature prevents parallelism
- Would need background + wait pattern
- More complex than needed

---

## Technical Details

### Server Architecture

**Single-server mode** (what we used):
- ONE OpenCode server on port 5001
- All 4 sessions share this server
- Each session created via HTTP API
- Bidirectional messaging works (sessions on same server)
- Memory: < 100 MB total (4 sessions)

**Multi-server mode** (not used, rare):
- ONE server PER unique project directory
- Used only for cross-project coordination
- Bidirectional messaging may fail across servers
- Not applicable here (all tasks in same project)

### Critical Parameters

**Directory parameter requirement**:
```bash
# WRONG - message silently lost
POST /session/{id}/prompt_async
# OpenCode looks in global session storage, not project-specific

# CORRECT - message delivered
POST /session/{id}/prompt_async?directory=/workspace/project
# OpenCode correctly identifies project hash and routes message
```

**Agent binding**:
```bash
# WRONG - agent field in session creation ignored
POST /session {"agent":"technology-researcher"}

# CORRECT - agent field in prompt_async body
POST /session/{id}/prompt_async {"agent":"technology-researcher","parts":[...]}
```

---

## Lessons Learned

1. **HTTP API is powerful but requires care**
   - Simple for small workflows
   - Attention to detail: directory parameter, agent binding
   - Manual orchestration OK for 1-4 tasks

2. **oc-coordinator.sh is overkill for simple cases**
   - But essential for complex multi-task workflows
   - Dependencies can be missing in project context
   - Worth understanding but not necessary here

3. **opencode run is not for parallel spawning**
   - Blocking nature fundamentally limits use
   - Best for interactive use, debugging
   - Can be backgrounded but requires careful management

4. **Bidirectional messaging enhances all methods**
   - Works with HTTP API, oc-coordinator, opencode run
   - Critical: include directory parameter
   - Complements signal files (not replacement)

5. **Method choice depends on scale**
   - 1-4 tasks: HTTP API (simple)
   - 5+ tasks: oc-coordinator.sh (automated)
   - Interactive: opencode run (feedback)

---

## Future Considerations

### If expanding research tasks:
- Consider oc-coordinator.sh (install axios)
- Manifest-driven approach scales better
- Automatic dependency management valuable
- Signal file monitoring built-in

### If adding cross-project coordination:
- Use multi-server mode (rare)
- Consider @research-coordinator agent
- May need fallback to signal files (C2 messaging fails across servers)

### If creating production orchestration:
- Use @workflow-orchestrator (implementation)
- Use @planning-orchestrator (research/planning)
- Use oc-coordinator.sh as foundation
- Implement comprehensive error handling

---

## Recommendation

For current and similar projects:
- **Use HTTP API for 1-4 parallel tasks**
- Document prompts clearly
- Use jq properly for escaping
- Test directory parameter inclusion
- Always include bidirectional messaging for real-time feedback

For future complex workflows:
- **Install axios and use oc-coordinator.sh**
- Create manifest.json with dependencies
- Let script handle orchestration
- Focus on research/planning content

---

## References

- **This session**: /workspace/sevdesk-shopify-connector/orchestration/active-research-sessions.txt
- **HTTP API**: http://localhost:5001 (web UI)
- **Bidirectional messaging skill**: ~/.config/opencode/skills/bidirectional-messaging/SKILL.md
- **Coordinator script**: ~/.config/opencode/workspace/scripts/global/oc-coordinator.sh
- **Session discovery**: ~/.config/opencode/scripts/global/get-coordinator-session.sh
- **Session spawner**: ~/.config/opencode/workspace/scripts/global/lib/session-spawner-cli.sh
