# Comprehensive Transfer Prompt for @agent-creator

**Date**: 2026-02-17  
**Source**: sevdesk-shopify-connector project setup phase  
**Recipient**: @agent-creator  
**Priority**: P0 - Critical Infrastructure Improvement  
**Scope**: Global impact on all new OpenCode projects  

---

## Executive Summary

The `sevdesk-shopify-connector` project initialization revealed systematic gaps in the OpenCode project setup infrastructure. New projects are not created with complete symlink configuration, forcing manual workarounds on every initialization. This transfer prompt documents all discovered issues and provides complete specifications for improvements.

**Key Statistics**:
- 4 infrastructure scripts/skills require updates
- 1 new validation script needs creation
- 8 symlink patterns missing from automation
- Every new project affected (high-impact bug)
- Workaround required for each new project (overhead)

---

## Problem Context

### What We Were Doing

Initializing a new Shopify-Sevdesk integration project (`sevdesk-shopify-connector`) with OpenCode infrastructure. The project needed:
1. Complete workspace structure (memory, docs with volatility organization, scripts)
2. All OpenCode symlinks (agents, skills, prompts, workspace access)
3. Proper .gitignore configuration
4. Ready state for research phase

### What Worked

The setup process successfully created:
- `workspace/memory/` with all 6 context files
- `workspace/docs/` with volatility-based subdirectories (knowledge, planning, tracking)
- `workspace/docs/global` symlink (enabling access to OpenCode global docs)
- `workspace/scripts/global` symlink (enabling access to OpenCode global scripts)
- `.gitignore` with most critical patterns

### What Failed

The setup process **did NOT create**:
- `.opencode/` directory
- `.opencode/workspace` symlink (needed by agents to reference patterns)
- `.opencode/skills` symlink (needed by agents to reference skill definitions)
- `.opencode/agents` symlink (needed by agents to reference other agents)
- `.opencode/commands` symlink (needed by agents to reference commands)
- `AGENTS.md` symlink at root level (needed for agent registry and coordination)
- `.github/agents` symlink (needed for GitHub Copilot integration)
- `.github/chatmodes` symlink (needed for chat mode definitions)
- `.github/prompts` symlink (needed for prompt templates)
- `.gitignore` entries for the above symlinks

### Manual Workaround Applied

Session had to manually execute:
```bash
mkdir -p .opencode && \
ln -sf ~/.config/opencode/workspace .opencode/workspace && \
ln -sf ~/.config/opencode/skills .opencode/skills && \
ln -sf ~/.config/opencode/agents .opencode/agents && \
ln -sf ~/.config/opencode/commands .opencode/commands && \
ln -sf ~/.config/opencode/AGENTS.md AGENTS.md && \
ln -sf ~/.config/opencode/.github/agents .github/agents && \
ln -sf ~/.config/opencode/.github/chatmodes .github/chatmodes && \
ln -sf ~/.config/opencode/.github/prompts .github/prompts
```

This workaround:
- Takes ~5 minutes to execute manually
- Is error-prone (easy to miss a symlink)
- Repeats for EVERY new project
- Should be automated

---

## Root Cause Analysis

### Issue 1: Incomplete setup-new-project.sh Script

**File**: `~/.config/opencode/workspace/scripts/global/setup-new-project.sh`

**Current State**:
The script creates core structure but stops after:
```bash
mkdir -p workspace/{memory,docs,scripts}
ln -sf ~/.config/opencode/docs/global workspace/docs/global
ln -sf ~/.config/opencode/scripts/global workspace/scripts/global
```

**Missing Steps**:
1. `.opencode/` directory creation
2. Four `.opencode/*` symlinks (workspace, skills, agents, commands)
3. Root-level AGENTS.md symlink
4. Three `.github/*` symlinks
5. .gitignore entries for all of the above

**Why It Matters**:
- Agents cannot reference `.opencode/agents/` for pattern matching
- Agents cannot access `.opencode/skills/` for skill definitions
- GitHub Copilot integration unavailable (no `.github/prompts`)
- Project structure inconsistent across new projects

**Impact**: Every new project requires manual post-setup fixup

---

### Issue 2: Incomplete project-setup Skill

**File**: `~/.config/opencode/skills/project-setup/SKILL.md`

**Current State**:
The skill documentation provides general guidance but is incomplete regarding symlinks.

**Missing Documentation**:
1. Example structure omits `.opencode/` directory and symlinks
2. Example omits root-level AGENTS.md and `.github/` symlinks
3. Workflow steps don't mention `.opencode/` creation
4. No troubleshooting section for symlink issues
5. .gitignore template missing symlink patterns

**Examples That Need Updating**:
- "Standard Structure Template" section
- "Workflow 1: Setting Up Documentation" section
- .gitignore template

**Why It Matters**:
- Users following skill documentation won't understand full structure
- Documentation contradicts what agents should do
- Inconsistent guidance leads to inconsistent projects

**Impact**: Skill-driven users get incomplete setup

---

### Issue 3: Missing .gitignore Pattern Documentation

**Current Gaps**:
The .gitignore patterns for `.opencode/` symlinks are not documented in any skill or script.

**Missing Patterns**:
```
.opencode/workspace
.opencode/skills
.opencode/agents
.opencode/commands
.github/agents
.github/chatmodes
.github/prompts
AGENTS.md
```

**Why Each Pattern Is Needed**:
- **`.opencode/workspace`**: Symlink to ~/.config/opencode/workspace (should not be tracked)
- **`.opencode/skills`**: Symlink to ~/.config/opencode/skills (should not be tracked)
- **`.opencode/agents`**: Symlink to ~/.config/opencode/agents (should not be tracked)
- **`.opencode/commands`**: Symlink to ~/.config/opencode/commands (should not be tracked)
- **`.github/agents`**: Symlink to GitHub Copilot agent definitions (should not be tracked)
- **`.github/chatmodes`**: Symlink to chat mode definitions (should not be tracked)
- **`.github/prompts`**: Symlink to prompt templates (should not be tracked)
- **`AGENTS.md`**: Symlink to agent registry (should not be tracked)

**Why It Matters**:
- Without .gitignore entries, symlinks could be accidentally committed
- Inconsistent .gitignore across projects
- New developers don't understand why these patterns are needed

**Impact**: Risk of symlinks being tracked in git

---

### Issue 4: Incomplete docs-structure Skill

**File**: `~/.config/opencode/skills/docs-structure/SKILL.md`

**Current State**:
Skill covers volatility-based organization but doesn't address symlink infrastructure.

**Missing Documentation**:
1. Root-level symlinks section (AGENTS.md, `.github/*`)
2. `.opencode/` directory purpose and structure
3. Relationship between `.opencode/` and `workspace/docs/global`
4. Why agents need `.opencode/agents/` access
5. Troubleshooting symlink issues

**Examples Missing From**:
- "Standard Structure Template" diagram
- Decision tree for file organization

**Why It Matters**:
- Agents reading docs-structure skill won't understand complete architecture
- No explanation of why symlinks are needed
- Doesn't explain difference between "infrastructure symlinks" and "documentation structure"

**Impact**: Skill users get incomplete mental model

---

## Required Improvements

### Improvement 1: Update setup-new-project.sh Script

**Priority**: P0 - Critical  
**File**: `~/.config/opencode/workspace/scripts/global/setup-new-project.sh`  
**Estimated Work**: 1-2 hours  

**Specification**:

#### Step A: Create .opencode/ directory and symlinks

Add this section after workspace setup:
```bash
# Create .opencode infrastructure directory
mkdir -p .opencode
chmod 755 .opencode

# Create .opencode symlinks for agent access
ln -sf ~/.config/opencode/workspace .opencode/workspace
ln -sf ~/.config/opencode/skills .opencode/skills
ln -sf ~/.config/opencode/agents .opencode/agents
ln -sf ~/.config/opencode/commands .opencode/commands

# Verify .opencode symlinks were created
if [ ! -L ".opencode/workspace" ] || [ ! -L ".opencode/skills" ] || [ ! -L ".opencode/agents" ] || [ ! -L ".opencode/commands" ]; then
    echo "ERROR: Failed to create .opencode symlinks"
    exit 1
fi
```

#### Step B: Create root-level OpenCode integration symlinks

Add this section:
```bash
# Create root symlinks for OpenCode integration
ln -sf ~/.config/opencode/AGENTS.md AGENTS.md
mkdir -p .github
ln -sf ~/.config/opencode/.github/agents .github/agents
ln -sf ~/.config/opencode/.github/chatmodes .github/chatmodes
ln -sf ~/.config/opencode/.github/prompts .github/prompts

# Verify root symlinks were created
if [ ! -L "AGENTS.md" ] || [ ! -L ".github/agents" ] || [ ! -L ".github/chatmodes" ] || [ ! -L ".github/prompts" ]; then
    echo "ERROR: Failed to create root-level symlinks"
    exit 1
fi
```

#### Step C: Update .gitignore with symlink patterns

Append to .gitignore after other patterns:
```bash
# Append OpenCode infrastructure patterns
cat >> .gitignore << 'OPENCODE_IGNORE'

# OpenCode Infrastructure Symlinks (DO NOT COMMIT)
# These provide local access to shared OpenCode resources
# Each developer has the same symlinks but pointing to their own OpenCode installation
.opencode/workspace
.opencode/skills
.opencode/agents
.opencode/commands

# GitHub integration symlinks (shared GitHub Copilot configuration)
# Project-specific overrides go in local .github/ files (git-tracked)
.github/agents
.github/chatmodes
.github/prompts

# Agent registry symlink (read-only reference)
AGENTS.md
OPENCODE_IGNORE

# Verify patterns were added
if ! grep -q ".opencode/workspace" .gitignore; then
    echo "ERROR: Failed to add .gitignore patterns"
    exit 1
fi
```

#### Step D: Add comprehensive verification at script end

```bash
# Final verification before returning
verify_setup() {
    local ERRORS=0
    
    echo ""
    echo "Verifying OpenCode project setup..."
    
    # Check .opencode/ infrastructure
    for DIR in workspace skills agents commands; do
        if [ ! -L ".opencode/$DIR" ]; then
            echo "  ERROR: .opencode/$DIR symlink missing"
            ERRORS=$((ERRORS + 1))
        else
            echo "  OK: .opencode/$DIR"
        fi
    done
    
    # Check root symlinks
    for LINK in AGENTS.md ".github/agents" ".github/chatmodes" ".github/prompts"; do
        if [ ! -L "$LINK" ]; then
            echo "  ERROR: $LINK symlink missing"
            ERRORS=$((ERRORS + 1))
        else
            echo "  OK: $LINK"
        fi
    done
    
    # Check .gitignore patterns
    REQUIRED_PATTERNS=(
        ".opencode/workspace"
        ".opencode/skills"
        ".opencode/agents"
        ".opencode/commands"
        "AGENTS.md"
    )
    
    for PATTERN in "${REQUIRED_PATTERNS[@]}"; do
        if ! grep -q "$PATTERN" .gitignore; then
            echo "  ERROR: Missing .gitignore pattern: $PATTERN"
            ERRORS=$((ERRORS + 1))
        else
            echo "  OK: $PATTERN in .gitignore"
        fi
    done
    
    if [ $ERRORS -eq 0 ]; then
        echo "✓ Setup complete - all infrastructure in place"
        return 0
    else
        echo "✗ Setup incomplete - $ERRORS error(s) found"
        return 1
    fi
}

verify_setup || exit 1
```

**Acceptance Criteria**:
- [ ] `.opencode/` directory created
- [ ] All four `.opencode/*` symlinks point to ~/.config/opencode/...
- [ ] AGENTS.md symlink at root level
- [ ] All three `.github/*` symlinks created
- [ ] .gitignore contains all 8 symlink patterns
- [ ] Verification passes (or script exits with error)
- [ ] Script is idempotent (safe to run multiple times)

---

### Improvement 2: Update project-setup Skill

**Priority**: P1 - High  
**File**: `~/.config/opencode/skills/project-setup/SKILL.md`  
**Estimated Work**: 2-3 hours  

**Specification**:

#### Change 2.1: Update "Standard Structure Template" section

Replace the current structure example with:
```markdown
## Standard Structure Template

Every OpenCode project starts with this structure:

\`\`\`
ProjectName/
├── .opencode/                          # ← Infrastructure access (git-ignored)
│   ├── workspace → ~/.config/opencode/workspace
│   ├── skills → ~/.config/opencode/skills
│   ├── agents → ~/.config/opencode/agents
│   └── commands → ~/.config/opencode/commands
│
├── .github/                            # ← GitHub integration (git-ignored symlinks)
│   ├── agents → ~/.config/opencode/.github/agents
│   ├── chatmodes → ~/.config/opencode/.github/chatmodes
│   └── prompts → ~/.config/opencode/.github/prompts
│
├── AGENTS.md → ~/.config/opencode/AGENTS.md  # ← Agent registry (git-ignored)
│
├── workspace/                          # ← Project-specific context
│   ├── memory/
│   │   ├── core/
│   │   │   ├── project.md              # Project overview
│   │   │   ├── patterns.md             # Architecture patterns
│   │   │   └── active-decisions.md     # Active decisions
│   │   └── active/
│   │       ├── context.md              # Current focus
│   │       ├── progress.md             # Milestones
│   │       └── taskRegistry.md         # Task coordination
│   │
│   ├── docs/
│   │   ├── global → ~/.config/opencode/workspace/docs/global  # Shared docs
│   │   ├── knowledge/                  # Stable reference (low volatility)
│   │   │   ├── market/
│   │   │   ├── business/
│   │   │   ├── technical/
│   │   │   └── research/
│   │   ├── planning/                   # Active plans (medium volatility)
│   │   └── tracking/                   # Progress tracking (high volatility)
│   │       ├── timeline.md
│   │       ├── milestones.md
│   │       └── sprints/
│   │
│   └── scripts/
│       └── global → ~/.config/opencode/scripts/global  # Shared scripts
│
├── .gitignore
├── README.md
├── [source code directories]
└── .git/
\`\`\`

**Structure Layers**:
1. **Infrastructure Symlinks** (root-level + .opencode/)
   - Enable agent access to shared resources
   - All git-ignored (do not commit)
   - Created automatically by setup script
   
2. **Workspace Structure** (workspace/)
   - Contains project-specific context
   - Shared by all agents working on project
   - Git-tracked (except symlinks within workspace/)
   
3. **Documentation** (workspace/docs/)
   - Organized by volatility (knowledge → planning → tracking)
   - Includes symlinks to global OpenCode docs
   - Git-tracked (except global symlink)
```

#### Change 2.2: Add new section "OpenCode Integration Symlinks"

Add this new section early in the skill:
```markdown
## OpenCode Integration Symlinks

Every project has these symlinks to access shared OpenCode infrastructure:

| Symlink Location | Points To | Purpose | Git-Ignored |
|---|---|---|---|
| `.opencode/workspace` | `~/.config/opencode/workspace` | Access shared memory patterns and global docs | Yes |
| `.opencode/skills` | `~/.config/opencode/skills` | Reference skill definitions and guidelines | Yes |
| `.opencode/agents` | `~/.config/opencode/agents` | Reference agent patterns and specifications | Yes |
| `.opencode/commands` | `~/.config/opencode/commands` | Reference command templates | Yes |
| `AGENTS.md` | `~/.config/opencode/AGENTS.md` | Agent registry, assignments, coordination guide | Yes |
| `.github/agents` | `~/.config/opencode/.github/agents` | GitHub Copilot agent definitions | Yes |
| `.github/chatmodes` | `~/.config/opencode/.github/chatmodes` | Chat mode configurations | Yes |
| `.github/prompts` | `~/.config/opencode/.github/prompts` | Prompt templates (.alspec, .alplan, .al, etc.) | Yes |
| `workspace/docs/global` | `~/.config/opencode/workspace/docs/global` | Shared documentation (React, Express, testing, etc.) | Yes |
| `workspace/scripts/global` | `~/.config/opencode/scripts/global` | Shared utility scripts | Yes |

**Why These Are Git-Ignored**:
Each developer has these symlinks pointing to their own OpenCode installation directory (`~/.config/opencode`). The paths are developer-specific, so they should never be committed to git. When another developer clones the project, the setup script creates fresh symlinks pointing to their own OpenCode installation.

**Creating Symlinks**:
The setup script (`setup-new-project.sh`) creates all of these automatically. Do NOT create them manually.
```

#### Change 2.3: Update "Workflow 1: Setting Up Documentation" section

Add steps for symlink creation:
```markdown
## Workflow 1: Setting Up Documentation

### Step 1: Create project directory and initialize git
\`\`\`bash
mkdir my-project
cd my-project
git init
\`\`\`

### Step 2: Create core infrastructure
\`\`\`bash
bash ~/.config/opencode/workspace/scripts/global/setup-new-project.sh \
    --project "My Project"
\`\`\`

This creates:
- All workspace/ directories and symlinks
- All .opencode/ symlinks for agent access
- All .github/ symlinks for GitHub integration
- AGENTS.md symlink for agent registry
- Complete .gitignore with all infrastructure patterns
- Memory bank context files
- Documentation structure

### Step 3: Verify setup is complete
\`\`\`bash
bash ~/.config/opencode/workspace/scripts/global/validate-project-setup.sh
\`\`\`

Expected output:
\`\`\`
Validating OpenCode project setup at: .
Checking .opencode/ infrastructure...
  OK: .opencode/workspace
  OK: .opencode/skills
  OK: .opencode/agents
  OK: .opencode/commands
Checking root-level OpenCode symlinks...
  OK: AGENTS.md
  OK: .github/agents
  OK: .github/chatmodes
  OK: .github/prompts
Checking workspace/ structure...
  OK: workspace/memory
  OK: workspace/docs
  OK: workspace/scripts
Checking docs/ volatility organization...
  OK: workspace/docs/knowledge
  OK: workspace/docs/planning
  OK: workspace/docs/tracking
Checking .gitignore patterns...
  OK: .opencode/workspace in .gitignore
  OK: .opencode/skills in .gitignore
  OK: .opencode/agents in .gitignore
  OK: .opencode/commands in .gitignore
  OK: AGENTS.md in .gitignore
  OK: .github/agents in .gitignore
  OK: .github/chatmodes in .gitignore
  OK: .github/prompts in .gitignore

✓ All checks passed - project setup complete
\`\`\`

### Step 4: Begin work
\`\`\`bash
git add -A
git commit -m "chore: initialize OpenCode project infrastructure"
\`\`\`
```

#### Change 2.4: Add "Troubleshooting" section

```markdown
## Troubleshooting

### Problem: .opencode directory doesn't exist

**Symptom**: Files or agents cannot reference `.opencode/agents/`

**Causes**:
- Setup script didn't run or failed
- Manual project creation (not using setup script)

**Solution**:
\`\`\`bash
# Run setup script to create all infrastructure
bash ~/.config/opencode/workspace/scripts/global/setup-new-project.sh \
    --project "My Project"

# Verify setup
bash ~/.config/opencode/workspace/scripts/global/validate-project-setup.sh
\`\`\`

### Problem: Symlinks not working (permission denied)

**Symptom**: Cannot read files through `.opencode/agents/`, permission errors

**Causes**:
- Wrong symlink target (pointing to non-existent path)
- ~/.config/opencode not readable
- Symlink created but OpenCode not installed

**Solution**:
\`\`\`bash
# Check if OpenCode is installed
ls ~/.config/opencode/ || echo "ERROR: OpenCode not installed"

# Check if symlinks are valid
ls -la .opencode/
readlink -f .opencode/agents  # Should show full path

# Recreate symlinks if invalid
rm .opencode/*
bash ~/.config/opencode/workspace/scripts/global/setup-new-project.sh
\`\`\`

### Problem: Symlinks were accidentally committed to git

**Symptom**: \`git status\` shows symlinks as modified or staged

**Causes**:
- Manual git add without checking .gitignore
- .gitignore patterns incomplete

**Solution**:
\`\`\`bash
# Remove from git tracking (keep local symlinks)
git rm --cached .opencode/workspace
git rm --cached .opencode/skills
git rm --cached .opencode/agents
git rm --cached .opencode/commands
git rm --cached AGENTS.md
git rm --cached .github/agents
git rm --cached .github/chatmodes
git rm --cached .github/prompts

# Verify .gitignore is complete
bash ~/.config/opencode/workspace/scripts/global/validate-project-setup.sh

# Commit gitignore cleanup
git commit -m "fix: remove infrastructure symlinks from git tracking"
\`\`\`

### Problem: Agents cannot access .opencode/agents/ reference

**Symptom**: Error messages like "cannot access .opencode/agents/xxx.md"

**Causes**:
- Project not set up with symlinks
- Symlink created but pointing to wrong location
- OpenCode installation moved

**Solution**:
\`\`\`bash
# Validate project setup
bash ~/.config/opencode/workspace/scripts/global/validate-project-setup.sh

# If errors found, run setup again
bash ~/.config/opencode/workspace/scripts/global/setup-new-project.sh --force

# If symlink points to wrong location, check OpenCode config
echo "OpenCode config location: $HOME/.config/opencode"
ls ~/.config/opencode/agents/  # Should list agent files
\`\`\`
```

#### Change 2.5: Update .gitignore template in skill

Include commented explanation:
```bash
# In the .gitignore template section, add:

### OpenCode Infrastructure Symlinks
# Each developer has local symlinks pointing to their OpenCode installation
# ~/.config/opencode/ is developer-specific, so symlinks are never committed
.opencode/workspace
.opencode/skills
.opencode/agents
.opencode/commands

### GitHub Integration Symlinks
# Local GitHub Copilot integration configurations
# Project-specific overrides go in git-tracked .github/ files
.github/agents
.github/chatmodes
.github/prompts

### Agent Registry Symlink
# Read-only reference to global agent registry
AGENTS.md

### Documentation Symlinks
# Local access to shared OpenCode documentation
workspace/docs/global
workspace/scripts/global

### Memory Bank Task Registry
# Coordination file updated during runtime, not committed
workspace/memory/active/taskRegistry.md
```

**Acceptance Criteria**:
- [ ] Structure template includes all infrastructure symlinks
- [ ] "OpenCode Integration Symlinks" section added with complete table
- [ ] "Workflow 1" includes symlink creation and verification steps
- [ ] "Troubleshooting" section covers 5 common problems
- [ ] .gitignore template includes all 8 patterns with explanations
- [ ] Examples match actual setup-new-project.sh output
- [ ] Clear explanation of why symlinks are git-ignored

---

### Improvement 3: Update docs-structure Skill

**Priority**: P1 - High  
**File**: `~/.config/opencode/skills/docs-structure/SKILL.md`  
**Estimated Work**: 2-3 hours  

**Specification**:

#### Change 3.1: Update "Standard Structure Template" diagram

Expand the current diagram to include infrastructure layer:
```markdown
## Standard Structure Template

\`\`\`
ProjectName/                                          [Root directory (git-tracked, except symlinks)]
│
├── .opencode/                                        [Infrastructure access layer - GIT-IGNORED]
│   ├── workspace → ~/.config/opencode/workspace     [Access shared memory patterns]
│   ├── skills → ~/.config/opencode/skills           [Access skill definitions]
│   ├── agents → ~/.config/opencode/agents           [Access agent patterns]
│   └── commands → ~/.config/opencode/commands       [Access command templates]
│
├── .github/                                          [GitHub integration - GIT-IGNORED SYMLINKS]
│   ├── agents → ~/.config/opencode/.github/agents   [Copilot agent definitions]
│   ├── chatmodes → ~/.config/opencode/.github/chatmodes
│   ├── prompts → ~/.config/opencode/.github/prompts [Prompt templates]
│   └── [project-specific .github files - GIT-TRACKED]
│
├── AGENTS.md → ~/.config/opencode/AGENTS.md         [Agent registry - GIT-IGNORED]
│
├── workspace/                                        [Project-specific context - GIT-TRACKED]
│   ├── memory/
│   │   ├── core/                                    [Foundational context - stable]
│   │   │   ├── project.md                           [Product overview, architecture]
│   │   │   ├── patterns.md                          [Code patterns, conventions]
│   │   │   └── active-decisions.md                  [Active constraints]
│   │   │
│   │   └── active/                                  [Session-scoped context - changes frequently]
│   │       ├── context.md                           [Current focus, goals, blockers]
│   │       ├── progress.md                          [Milestones (last 30 days)]
│   │       └── taskRegistry.md                      [Active work, git-ignored]
│   │
│   ├── docs/
│   │   ├── global → ~/.config/opencode/workspace/docs/global  [Shared documentation]
│   │   │
│   │   ├── knowledge/                               [Stable reference (LOW volatility)]
│   │   │   ├── market/                              [Market research]
│   │   │   │   ├── competitors.md
│   │   │   │   ├── user-research.md
│   │   │   │   └── trends.md
│   │   │   ├── business/                            [Business model]
│   │   │   │   ├── pricing-models.md
│   │   │   │   └── revenue-streams.md
│   │   │   ├── technical/                           [Technical deep-dives]
│   │   │   │   ├── api-research.md
│   │   │   │   └── architecture-options.md
│   │   │   └── research/                            [Raw data]
│   │   │       └── [raw artifacts]
│   │   │
│   │   ├── planning/                                [Active plans (MEDIUM volatility)]
│   │   │   ├── roadmap.md
│   │   │   ├── sprint-plans.md
│   │   │   └── specs/
│   │   │       ├── feature-spec.md
│   │   │       └── implementation-plan.md
│   │   │
│   │   └── tracking/                                [Progress tracking (HIGH volatility)]
│   │       ├── timeline.md
│   │       ├── milestones.md
│   │       ├── sprints/
│   │       │   └── sprint-1.md
│   │       └── handovers/
│   │           └── [session-specific artifacts]
│   │
│   └── scripts/
│       └── global → ~/.config/opencode/scripts/global
│
├── [Source code directories]
│   └── [Follow project-specific conventions]
│
├── .gitignore                                        [Symlink patterns + source patterns]
├── README.md
├── package.json / requirements.txt / etc.
└── .git/
```

#### Change 3.2: Add new section "Root-Level OpenCode Symlinks"

Add this section after "Standard Structure Template":
```markdown
## Root-Level OpenCode Symlinks

The root of every OpenCode project contains symlinks that provide unified access to shared infrastructure. Understanding these is critical for agent coordination.

### Infrastructure Access Layer (.opencode/)

The `.opencode/` directory provides a single access point for agents to reference shared resources:

| Symlink | Points To | Purpose | Who Uses |
|---------|-----------|---------|----------|
| `.opencode/workspace` | `~/.config/opencode/workspace` | Access shared memory patterns, coordination scripts | Agents, build scripts |
| `.opencode/skills` | `~/.config/opencode/skills` | Reference skill definitions and best practices | Agents, documentation |
| `.opencode/agents` | `~/.config/opencode/agents` | Reference agent patterns and specifications | Agents, coordinators |
| `.opencode/commands` | `~/.config/opencode/commands` | Reference command templates and workflows | Agents, CLI tools |

**Why .opencode/ Exists**:
- Provides short, memorable paths (`./opencode/agents/` vs `~/.config/opencode/agents/`)
- Enables relative references in documentation
- Centralizes all infrastructure access in one location
- Makes project structure self-documenting

**Example Usage (in agent**):
\`\`\`bash
# Agent accessing a pattern from another agent
cat .opencode/agents/frontend-specialist.md

# Agent reading a skill definition
cat .opencode/skills/memory-writer/SKILL.md

# Build script accessing coordination scripts
bash .opencode/workspace/scripts/global/task-registry.sh claim
\`\`\`

### GitHub Integration Layer (.github/)

These symlinks enable GitHub Copilot integration and shared prompt templates:

| Symlink | Points To | Purpose |
|---------|-----------|---------|
| `.github/agents` | `~/.config/opencode/.github/agents` | GitHub Copilot agent definitions |
| `.github/chatmodes` | `~/.config/opencode/.github/chatmodes` | Chat mode configurations |
| `.github/prompts` | `~/.config/opencode/.github/prompts` | Prompt templates (.alspec, .alplan, .al) |

**Project-Specific vs. Shared**:
- **Git-ignored symlinks**: `.github/agents/`, `.github/chatmodes/`, `.github/prompts/` (shared, same for all projects)
- **Git-tracked files**: Project-specific GitHub configuration (workflows, settings.json, etc.)

### Agent Registry (AGENTS.md)

The `AGENTS.md` symlink at root level provides access to the global agent registry:

| Symlink | Points To | Purpose |
|---------|-----------|---------|
| `AGENTS.md` | `~/.config/opencode/AGENTS.md` | Complete agent registry, assignments, coordination patterns |

**Contains**:
- List of all available agents
- Agent capabilities and domains
- Agent assignment decision flowchart
- Cross-agent coordination patterns
- Handover protocols

**Who Uses**:
- Agents (reference what other agents can do)
- Coordinators (understand agent ecosystem)
- Human users (see agent capabilities)
```

#### Change 3.3: Update "Decision Tree: Where Does This Document Go?" section

Add clarity about infrastructure vs. documentation:
```markdown
## Decision Tree: Where Does This Document Go?

Use this decision tree to determine the correct location for any document.

```
START: "Where should this document go?"
│
├─ Q1: "Is this an OpenCode infrastructure symlink or configuration?"
│   ├─ YES: "Not a document - infrastructure only. Symlinks are created by setup-new-project.sh"
│   └─ NO: Go to Q2
│
├─ Q2: "Is this project-wide context (memory bank)?"
│   ├─ YES: "workspace/memory/{core|active}/ - Only updated during /finish-session"
│   └─ NO: Go to Q3
│
├─ Q3: "Is this documentation?"
│   ├─ NO: "This is code or data - goes in source directories"
│   └─ YES: Go to Q4
│
├─ Q4: "How volatile is this documentation?"
│   ├─ LOW (stable reference, rarely changes):
│   │   └─ "workspace/docs/knowledge/"
│   │       ├─ Market research?           → knowledge/market/
│   │       ├─ Business context?          → knowledge/business/
│   │       ├─ Technical deep-dive?       → knowledge/technical/
│   │       └─ Raw research artifacts?    → knowledge/research/
│   │
│   ├─ MEDIUM (active plans, evolve during project):
│   │   └─ "workspace/docs/planning/"
│   │       ├─ Feature specification?     → planning/specs/
│   │       ├─ Implementation plan?       → planning/plans/
│   │       ├─ Architecture decision?     → planning/architecture/
│   │       └─ Roadmap?                   → planning/roadmap.md
│   │
│   └─ HIGH (progress tracking, changes frequently):
│       └─ "workspace/docs/tracking/"
│           ├─ Timeline or milestones?    → tracking/timeline.md
│           ├─ Sprint tracking?           → tracking/sprints/
│           ├─ Session handovers?         → tracking/handovers/
│           └─ Progress updates?          → tracking/progress.md
│
└─ Q5: "Shared documentation (global patterns)?"
    ├─ YES: "Symlinked in workspace/docs/global/ - Read-only for project context"
    └─ NO: "Project-specific documentation in appropriate volatility tier"
```

**Infrastructure ≠ Documentation**:
- **Infrastructure**: Symlinks, directories, scripts (setup by automation)
- **Documentation**: Content files (created by humans/agents)

Infrastructure is metadata about HOW the project is organized. Documentation is the actual content of the project.

#### Change 3.4: Add "Symlink Management" section

```markdown
## Symlink Management

### Creating Symlinks

Symlinks are created automatically by the setup script. Do NOT create them manually:

\`\`\`bash
# WRONG - manual symlink creation
ln -sf ~/.config/opencode/workspace .opencode/workspace

# RIGHT - use setup script
bash ~/.config/opencode/workspace/scripts/global/setup-new-project.sh
\`\`\`

**Why Automation?**:
- Ensures consistency across all projects
- Prevents typos and broken symlinks
- Centralizes best practices
- Easy to update all projects (update script once)

### Verifying Symlinks

After setup, verify all symlinks are correct:

\`\`\`bash
# Run validation script
bash ~/.config/opencode/workspace/scripts/global/validate-project-setup.sh

# Or manual check
ls -la .opencode/
ls -la .github/
ls -la AGENTS.md
\`\`\`

### Gitignoring Symlinks

All infrastructure symlinks are git-ignored:

\`\`\`bash
# See what's ignored
cat .gitignore | grep -A 20 "OpenCode Infrastructure"

# Verify symlinks aren't staged
git status | grep -E "\.opencode|\.github|AGENTS"  # Should show nothing
\`\`\`

### Common Symlink Issues

See Troubleshooting section in `project-setup` skill for solutions:
- Symlinks don't exist
- Symlinks permission denied
- Symlinks accidentally committed
- Agents can't access .opencode/
```

**Acceptance Criteria**:
- [ ] Structure diagram includes .opencode/ and .github/ layers
- [ ] Infrastructure symlinks clearly marked as GIT-IGNORED
- [ ] "Root-Level OpenCode Symlinks" section explains all 8 symlinks
- [ ] Purpose of each symlink documented with "Who Uses" info
- [ ] Decision tree includes infrastructure check (Q1)
- [ ] "Symlink Management" section added with examples
- [ ] References to troubleshooting in project-setup skill
- [ ] Diagram matches actual setup-new-project.sh output

---

### Improvement 4: Create Validation Script

**Priority**: P0 - Critical (blocking new project setup)  
**File**: `~/.config/opencode/workspace/scripts/global/validate-project-setup.sh`  
**Estimated Work**: 1-2 hours  

**Specification**:

Create new executable script to verify complete project setup:

```bash
#!/bin/bash
#
# validate-project-setup.sh
# Validates that an OpenCode project has complete infrastructure setup
#
# Usage:
#   validate-project-setup.sh [PROJECT_PATH]
#
# Examples:
#   validate-project-setup.sh              # Check current directory
#   validate-project-setup.sh /path/to/project
#   validate-project-setup.sh .
#

set -e

# Get project path (default to current directory)
PROJECT_PATH="${1:-.}"

# Track errors
ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
error() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}!${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# Main validation
echo "Validating OpenCode project setup"
echo "Project path: $PROJECT_PATH"
echo ""

# 1. Check .opencode/ infrastructure
echo "1. Checking .opencode/ infrastructure..."
if [ ! -d "$PROJECT_PATH/.opencode" ]; then
    error ".opencode/ directory missing"
else
    success ".opencode/ directory exists"
    
    # Check each symlink
    for DIR in workspace skills agents commands; do
        LINK="$PROJECT_PATH/.opencode/$DIR"
        if [ ! -L "$LINK" ]; then
            error ".opencode/$DIR symlink missing"
        elif [ ! -d "$LINK" ]; then
            error ".opencode/$DIR symlink broken (target doesn't exist)"
        else
            TARGET=$(readlink -f "$LINK")
            success ".opencode/$DIR → $(dirname $(dirname $TARGET))"
        fi
    done
fi
echo ""

# 2. Check root-level symlinks
echo "2. Checking root-level OpenCode symlinks..."
for LINK in "AGENTS.md" ".github/agents" ".github/chatmodes" ".github/prompts"; do
    if [ ! -L "$PROJECT_PATH/$LINK" ]; then
        error "$LINK symlink missing"
    elif [ ! -e "$PROJECT_PATH/$LINK" ] 2>/dev/null; then
        error "$LINK symlink broken (target doesn't exist)"
    else
        success "$LINK exists"
    fi
done
echo ""

# 3. Check workspace structure
echo "3. Checking workspace/ structure..."
for DIR in workspace/memory workspace/docs workspace/scripts; do
    if [ ! -d "$PROJECT_PATH/$DIR" ]; then
        error "$DIR directory missing"
    else
        success "$DIR exists"
    fi
done
echo ""

# 4. Check memory bank layers
echo "4. Checking workspace/memory/ organization..."
# Check core layer
for FILE in core/project.md core/patterns.md core/active-decisions.md; do
    if [ ! -f "$PROJECT_PATH/workspace/memory/$FILE" ]; then
        error "workspace/memory/$FILE missing"
    else
        success "workspace/memory/$FILE exists"
    fi
done
# Check active layer
for FILE in active/context.md active/progress.md active/taskRegistry.md; do
    if [ ! -f "$PROJECT_PATH/workspace/memory/$FILE" ]; then
        warning "workspace/memory/$FILE missing (will be created on first agent work)"
    else
        success "workspace/memory/$FILE exists"
    fi
done
echo ""

# 5. Check docs volatility organization
echo "5. Checking workspace/docs/ volatility organization..."
for DIR in knowledge planning tracking; do
    if [ ! -d "$PROJECT_PATH/workspace/docs/$DIR" ]; then
        error "workspace/docs/$DIR directory missing"
    else
        success "workspace/docs/$DIR exists"
    fi
done
echo ""

# 6. Check docs symlinks
echo "6. Checking workspace/docs/ symlinks..."
if [ ! -L "$PROJECT_PATH/workspace/docs/global" ]; then
    error "workspace/docs/global symlink missing"
elif [ ! -d "$PROJECT_PATH/workspace/docs/global" ]; then
    error "workspace/docs/global symlink broken (target doesn't exist)"
else
    success "workspace/docs/global symlink exists"
fi

if [ ! -L "$PROJECT_PATH/workspace/scripts/global" ]; then
    error "workspace/scripts/global symlink missing"
elif [ ! -d "$PROJECT_PATH/workspace/scripts/global" ]; then
    error "workspace/scripts/global symlink broken (target doesn't exist)"
else
    success "workspace/scripts/global symlink exists"
fi
echo ""

# 7. Check .gitignore patterns
echo "7. Checking .gitignore patterns..."
REQUIRED_PATTERNS=(
    ".opencode/workspace"
    ".opencode/skills"
    ".opencode/agents"
    ".opencode/commands"
    ".github/agents"
    ".github/chatmodes"
    ".github/prompts"
    "AGENTS.md"
    "workspace/docs/global"
    "workspace/scripts/global"
)

MISSING_COUNT=0
for PATTERN in "${REQUIRED_PATTERNS[@]}"; do
    if [ -f "$PROJECT_PATH/.gitignore" ]; then
        if grep -q "^$PATTERN$" "$PROJECT_PATH/.gitignore"; then
            success "$PATTERN in .gitignore"
        else
            error "$PATTERN missing from .gitignore"
            MISSING_COUNT=$((MISSING_COUNT + 1))
        fi
    else
        error ".gitignore file missing"
        break
    fi
done
echo ""

# 8. Check for git tracking of infrastructure
echo "8. Checking if infrastructure symlinks are git-tracked..."
if [ -d "$PROJECT_PATH/.git" ]; then
    TRACKED=0
    for LINK in ".opencode" "AGENTS.md" ".github/agents" ".github/chatmodes" ".github/prompts"; do
        if git -C "$PROJECT_PATH" ls-files --error-unmatch "$LINK" 2>/dev/null >/dev/null; then
            error "$LINK is tracked by git (should be in .gitignore)"
            TRACKED=$((TRACKED + 1))
        fi
    done
    
    if [ $TRACKED -eq 0 ]; then
        success "No infrastructure symlinks tracked by git"
    fi
else
    warning ".git directory not found (not a git repository)"
fi
echo ""

# Summary
echo "═════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed - project setup complete${NC}"
    [ $WARNINGS -gt 0 ] && echo -e "${YELLOW}! $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "${RED}✗ Setup incomplete - $ERRORS error(s) found${NC}"
    [ $WARNINGS -gt 0 ] && echo -e "${YELLOW}! $WARNINGS warning(s)${NC}"
    echo ""
    echo "To fix:"
    echo "  bash ~/.config/opencode/workspace/scripts/global/setup-new-project.sh [--force]"
    exit 1
fi
```

**Acceptance Criteria**:
- [ ] Script checks all 8 infrastructure symlinks
- [ ] Script validates complete workspace structure
- [ ] Script checks .gitignore patterns
- [ ] Script detects git-tracked infrastructure (security issue)
- [ ] Script provides clear error messages and fixes
- [ ] Script returns exit code 0 on success, 1 on errors
- [ ] Script is executable (`chmod +x`)
- [ ] Script handles missing .git gracefully

---

## Implementation Roadmap

### Phase 1: Infrastructure Script (P0)
**Estimated**: 2-4 hours
**Deliverables**:
1. Update `setup-new-project.sh` (1-2 hrs)
2. Create `validate-project-setup.sh` (1-2 hrs)
3. Test on new project (30 min)

**Success Criteria**:
- New project created with all 8 infrastructure symlinks
- Validation script passes completely
- No manual workarounds needed

### Phase 2: Skill Updates (P1)
**Estimated**: 4-6 hours
**Deliverables**:
1. Update `project-setup` skill (2-3 hrs)
2. Update `docs-structure` skill (2-3 hrs)

**Success Criteria**:
- Skill examples match actual setup output
- Complete symlink infrastructure documented
- Troubleshooting covers 5+ scenarios

### Phase 3: Testing & Documentation (P2)
**Estimated**: 2-3 hours
**Deliverables**:
1. Test new project initialization workflow
2. Update any onboarding documentation
3. Add integration test (if applicable)

**Success Criteria**:
- New project works end-to-end
- No manual fixes needed
- Repeatable across developers

---

## Impact Analysis

### What This Fixes

1. **Eliminates manual workaround** - New projects have complete setup automatically
2. **Improves consistency** - All projects created the same way
3. **Better agent coordination** - Agents can reference `.opencode/agents/` patterns
4. **GitHub Copilot ready** - All projects have GitHub integration configured
5. **Self-documenting** - Structure explains itself through skills

### Affected Workflows

| Workflow | Before | After |
|----------|--------|-------|
| **New project setup** | 15 min (includes manual fixup) | 5 min (automatic) |
| **Onboarding new developer** | "Create symlinks manually..." | "Run setup script - done" |
| **Agent reference lookup** | Long relative paths | `.opencode/agents/...` |
| **GitHub Copilot setup** | Manual `.github/` creation | Automatic |
| **Troubleshooting setup** | "What symlinks should exist?" | Run validation script |

### Projects Affected

**This impacts**: ALL new projects created with OpenCode  
**Estimated projects**: 10+ in 2026  
**Time saved per project**: 10 minutes (workaround time)  
**Total time saved in 2026**: 100+ minutes  

---

## References

### Related Skills
- `project-setup` - Project initialization workflow
- `docs-structure` - Documentation organization (volatility-based)
- `file-naming` - File naming conventions
- `git-safety` - Git operations safety

### Related Scripts
- `~/.config/opencode/workspace/scripts/global/setup-new-project.sh`
- `~/.config/opencode/workspace/scripts/global/validate-project-setup.sh` (NEW)

### Commit History (sevdesk-shopify-connector)
- `d7a3d8e` - fix: add AGENTS.md to .opencode directory and clean .gitignore
- `e540cbc` - chore: add .opencode symlink infrastructure
- `2fe3446` - docs: update memory bank to reflect workspace migration

---

## Next Steps for @agent-creator

1. **Review this transfer prompt** and confirm understanding of all issues
2. **Prioritize improvements**: Start with P0 (script changes), then P1 (skill updates)
3. **Implement in order**:
   - Update `setup-new-project.sh` (most critical)
   - Create `validate-project-setup.sh` (verification)
   - Update skills (documentation)
4. **Test thoroughly**: Run validation on existing projects and new ones
5. **Deploy**: Update global OpenCode configuration
6. **Document rollout**: Notify developers of new setup workflow

---

**Created**: 2026-02-17 18:35:00  
**Source Session**: sevdesk-shopify-connector project initialization  
**For**: Comprehensive improvements to OpenCode project setup infrastructure
