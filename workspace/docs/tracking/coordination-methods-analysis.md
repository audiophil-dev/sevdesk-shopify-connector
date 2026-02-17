# Coordination Methods Analysis

**Date**: 2026-02-17
**Context**: Investigating the right approach to spawn parallel research agents for Shopify-Sevdesk connector research

## Current Status

We have successfully spawned a research-coordinator session that created a research plan with 4 parallel tasks (R1-R4). Now we need to actually execute those research tasks.

## Available Approaches

### Approach 1: oc-coordinator.sh Script (Documented but Missing)

**Location**: Referenced in `~/.config/opencode/agents/multi-session-coordinator.md`

**Status**: Script does NOT exist in filesystem

**Evidence**:
```bash
$ bash ~/.config/opencode/scripts/global/oc-coordinator.sh --help
bash: /home/dev/.config/opencode/scripts/global/oc-coordinator.sh: No such file or directory
```

**Conclusion**: Documentation is outdated or references future infrastructure that isn't implemented yet.

### Approach 2: Direct HTTP API (Single Server)

**Status**: Server is running on port 5001

**Evidence**:
```bash
$ curl -s http://localhost:5001/global/health
{"healthy":true,"version":"1.1.53"}
```

**How it works**:
1. Create session: `POST http://localhost:5001/session?directory=/workspace/project`
2. Send message: `POST http://localhost:5001/session/{id}/prompt_async?directory=/workspace/project&agent=agent-name`
3. Monitor via signal files or bidirectional messaging

**Advantages**:
- Uses existing server (no spawning overhead)
- Bidirectional messaging works automatically
- Memory efficient (< 100 MB for 4 tasks)
- All tasks share same project context

**Limitations**:
- All tasks must be in same project directory
- Manual session creation (no batch coordinator)

### Approach 3: opencode run (CLI-Based Spawning)

**Status**: Available via `opencode run` command

**How it works**:
```bash
opencode run "Your agent prompt here" --agent technology-researcher --project /workspace/project
```

**Advantages**:
- Simple CLI interface
- No HTTP API knowledge needed
- Agent binding built-in

**Limitations**:
- May spawn new servers per invocation
- Unclear if sessions appear in current UI
- No built-in parallel coordination

## Recommended Approach

### For Current Research Task (4 parallel agents)

**Use Approach 2 (Direct HTTP API)** because:

1. Server already running on port 5001
2. All 4 research tasks target same project directory
3. Bidirectional messaging enabled
4. Memory efficient for 4 concurrent tasks
5. Sessions will appear in current UI

**Implementation**:
```bash
# For each research task:
# 1. Create session
SESSION_ID=$(curl -s -X POST "http://localhost:5001/session?directory=/workspace/sevdesk-shopify-connector" \
  -H "Content-Type: application/json" \
  -d '{"title":"technology-researcher: Shopify API Research"}' | jq -r '.id')

# 2. Send research prompt
curl -s -X POST "http://localhost:5001/session/$SESSION_ID/prompt_async?directory=/workspace/sevdesk-shopify-connector" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "technology-researcher",
    "parts": [{
      "type": "text",
      "text": "Research prompt here..."
    }]
  }'
```

### For Future Multi-Project Coordination

**Build oc-coordinator.sh script** following architecture in multi-session-coordinator.md:
- Reads manifest JSON
- Spawns ONE server (or uses existing)
- Creates sessions via HTTP API
- Monitors signal files
- Provides aggregated reporting

This would be a separate infrastructure improvement task.

## Action Items

1. **Immediate**: Spawn 4 technology-researcher sessions using HTTP API for current research
2. **Future**: Create oc-coordinator.sh script for automated manifest-driven coordination
3. **Documentation**: Update multi-session-coordinator.md to clarify current vs future capabilities

## Test Results

### Research Coordinator Session

**Session ID**: ses_39307beb5ffekOqM1R4eajq9C2
**Status**: Completed research plan creation
**Output**: docs/knowledge/technical/research-plan.md (created successfully)
**Messages**: 6 messages stored
**Tokens**: 23,951+ consumed
**Verdict**: HTTP API spawning WORKS

### Next Step

Manually spawn the 4 technology-researcher sessions using HTTP API approach to execute R1-R4 research tasks.
