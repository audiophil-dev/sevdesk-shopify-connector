# Handover: Project Setup Infrastructure Issues

**Date**: 2026-02-17  
**Session Focus**: Project structure initialization and workspace migration  
**Recipient**: @agent-creator  
**Issue Level**: SYSTEM / WORKFLOW (Affects all new projects)

## Executive Summary

This session discovered critical infrastructure gaps in the `project-setup` skill and `setup-new-project.sh` script. New projects are not created with complete OpenCode symlink infrastructure, leading to manual work and inconsistent initialization across projects.

**Scope of Impact**: All new projects created with OpenCode setup process  
**Severity**: Medium (workaround exists, but manual and error-prone)  
**Frequency**: Every new project initialization

---

## Problem Statement

### What Happened

When initializing a new project (`sevdesk-shopify-connector`), the setup process created:

✅ **What Was Created**:
- `workspace/memory/` with context files
- `workspace/docs/` with volatility-based subdirectories
- `workspace/docs/global` symlink (correct)
- `workspace/scripts/global` symlink (correct)
- `.gitignore` entries

❌ **What Was Missing**:
- `.opencode/` directory with infrastructure symlinks
- `.opencode/workspace/` → ~/.config/opencode/workspace
- `.opencode/skills/` → ~/.config/opencode/skills
- `.opencode/agents/` → ~/.config/opencode/agents
- `.opencode/commands/` → ~/.config/opencode/commands
- `.github/agents/`, `.github/chatmodes/`, `.github/prompts/` symlinks at root
- AGENTS.md symlink at root level
- `.opencode/` entries in .gitignore

### Manual Workaround Applied

Session had to manually create:
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

---

## Root Causes

### 1. **Incomplete Project Setup Script**

**Location**: `~/.config/opencode/workspace/scripts/global/setup-new-project.sh`  
**Issue**: Script creates core structure but omits `.opencode/` infrastructure

**Current Logic**:
```bash
# Creates:
mkdir -p workspace/{memory,docs,scripts}
ln -sf ~/.config/opencode/docs/global workspace/docs/global
ln -sf ~/.config/opencode/scripts/global workspace/scripts/global

# Missing:
# - .opencode/ directory creation
# - .opencode/ symlinks
# - root-level AGENTS.md symlink
# - .github symlinks at root
```

**Impact**: Every new project needs manual fixup post-setup

### 2. **Incomplete project-setup Skill**

**Location**: `~/.config/opencode/skills/project-setup/SKILL.md`  
**Issue**: Skill documentation and examples incomplete regarding symlink infrastructure

**Problems**:
- Example structure omits `.opencode/` and `.github/` root symlinks
- Initialization steps don't mention `.opencode/` directory creation
- Workflow documentation doesn't list all required symlinks
- No troubleshooting section for missing symlinks

### 3. **Missing .gitignore Pattern Documentation**

**Location**: `.gitignore` template in project-setup  
**Issue**: Pattern list incomplete for `.opencode/` symlinks

**Missing entries**:
```
.opencode/workspace
.opencode/skills
.opencode/agents
.opencode/commands
```

### 4. **docs-structure Skill Incomplete**

**Location**: `~/.config/opencode/skills/docs-structure/SKILL.md`  
**Issue**: Doesn't cover root-level symlinks for OpenCode integration

**Missing**:
- Documentation of AGENTS.md symlink purpose
- `.github/` symlink structure (.agents/, .chatmodes/, .prompts/)
- `.opencode/` directory as unified infrastructure access point
- Relationship between `workspace/docs/global` and AGENTS.md symlink

---

## Required Improvements

### Task 1: Update setup-new-project.sh Script

**File**: `~/.config/opencode/workspace/scripts/global/setup-new-project.sh`  
**Changes Needed**:

1. **Add .opencode/ symlink creation**:
```bash
# Create .opencode infrastructure
mkdir -p .opencode
ln -sf ~/.config/opencode/workspace .opencode/workspace
ln -sf ~/.config/opencode/skills .opencode/skills
ln -sf ~/.config/opencode/agents .opencode/agents
ln -sf ~/.config/opencode/commands .opencode/commands
```

2. **Add root-level OpenCode integration symlinks**:
```bash
# Create root symlinks for OpenCode integration
ln -sf ~/.config/opencode/AGENTS.md AGENTS.md
ln -sf ~/.config/opencode/.github/agents .github/agents
ln -sf ~/.config/opencode/.github/chatmodes .github/chatmodes
ln -sf ~/.config/opencode/.github/prompts .github/prompts
```

3. **Ensure .gitignore has complete symlink patterns**:
```bash
# In generated .gitignore:
cat >> .gitignore << 'IGNORE'

# OpenCode Infrastructure Symlinks
.opencode/workspace
.opencode/skills
.opencode/agents
.opencode/commands
.github/agents
.github/chatmodes
.github/prompts
AGENTS.md
IGNORE
```

4. **Verify all symlinks before returning**:
```bash
# Test script should verify:
- .opencode/ is a directory
- All 4 .opencode/* symlinks exist and are valid
- AGENTS.md symlink exists and is valid
- All .github/* symlinks exist and are valid
- .gitignore contains all symlink patterns
```

### Task 2: Update project-setup Skill

**File**: `~/.config/opencode/skills/project-setup/SKILL.md`  
**Changes Needed**:

1. **Expand "Standard Structure Template" section**:
   - Add `.opencode/` with all 4 symlinks to example
   - Add root-level symlinks (AGENTS.md, .github/*)
   - Document purpose of each symlink

2. **Add new section: "OpenCode Integration Symlinks"**:
   ```markdown
   ## OpenCode Integration Symlinks
   
   These symlinks enable agent/skill/command access and unified tooling:
   
   | Symlink | Points To | Purpose |
   |---------|-----------|---------|
   | `.opencode/workspace` | ~/.config/opencode/workspace | Access shared memory patterns |
   | `.opencode/skills` | ~/.config/opencode/skills | Reference skill definitions |
   | `.opencode/agents` | ~/.config/opencode/agents | Reference agent patterns |
   | `.opencode/commands` | ~/.config/opencode/commands | Reference command templates |
   | `AGENTS.md` | ~/.config/opencode/AGENTS.md | Agent registry and coordination |
   | `.github/agents/` | ~/.config/opencode/.github/agents | GitHub Copilot agent sync |
   | `.github/chatmodes/` | ~/.config/opencode/.github/chatmodes | Chat mode definitions |
   | `.github/prompts/` | ~/.config/opencode/.github/prompts | Prompt templates (.alspec, .alplan) |
   ```

3. **Update "Workflow 1: Setting Up Documentation"**:
   - Add step 2a: "Create .opencode/ infrastructure"
   - Add step 2b: "Create root-level OpenCode integration symlinks"
   - Update verification checklist

4. **Add troubleshooting section**:
   - "Missing .opencode directory"
   - "Symlinks not working (permission issues)"
   - "Symlinks created but git not tracking them"

5. **Update .gitignore template**:
   - Add all `.opencode/*` patterns
   - Add `.github/agents`, `.github/chatmodes`, `.github/prompts`
   - Add AGENTS.md
   - Add comment explaining why each is needed

### Task 3: Update docs-structure Skill

**File**: `~/.config/opencode/skills/docs-structure/SKILL.md`  
**Changes Needed**:

1. **Expand "Standard Structure Template"**:
   - Show complete structure including `.opencode/` and root symlinks
   - Diagram should match setup-new-project.sh output

2. **Add section: "Root-Level OpenCode Symlinks"**:
   ```markdown
   ## Root-Level OpenCode Symlinks
   
   These provide unified access to OpenCode infrastructure:
   
   ### AGENTS.md Symlink
   - Points to: ~/.config/opencode/AGENTS.md
   - Purpose: Agent registry, agent assignments, coordination patterns
   - Updated when: New agents created or assignments change
   - Frequency: Rarely changed (stable reference)
   
   ### .github/ Symlinks
   - `.github/agents/` → shared agent definitions (GitHub Copilot sync)
   - `.github/chatmodes/` → chat mode configurations
   - `.github/prompts/` → prompt templates (.alspec, .alplan, .al, etc.)
   - Purpose: GitHub Copilot integration, shared prompts
   - Updated when: Agents or prompts are updated
   
   ### .opencode/ Directory
   - Unified access point to OpenCode infrastructure
   - Contains 4 symlinks (workspace, skills, agents, commands)
   - Agents can reference `.opencode/agents/` instead of long paths
   ```

3. **Update decision tree: "Where Does This Document Go?"**:
   - Clarify that these symlinks are infrastructure, not documentation
   - Note that they're auto-created by setup script
   - Don't go in docs/ hierarchy

### Task 4: Create Validation Script

**New File**: `~/.config/opencode/workspace/scripts/global/validate-project-setup.sh`  
**Purpose**: Verify project was set up correctly with all infrastructure

**Validation Checklist**:
```bash
#!/bin/bash
# Verify project setup completeness

PROJECT_PATH="${1:-.}"
ERRORS=0

echo "Validating OpenCode project setup at: $PROJECT_PATH"
echo ""

# Check .opencode/ infrastructure
echo "Checking .opencode/ infrastructure..."
for DIR in workspace skills agents commands; do
    if [ ! -L "$PROJECT_PATH/.opencode/$DIR" ]; then
        echo "  ERROR: .opencode/$DIR symlink missing"
        ERRORS=$((ERRORS + 1))
    else
        echo "  OK: .opencode/$DIR"
    fi
done

# Check root symlinks
echo ""
echo "Checking root-level OpenCode symlinks..."
for LINK in AGENTS.md .github/agents .github/chatmodes .github/prompts; do
    if [ ! -L "$PROJECT_PATH/$LINK" ]; then
        echo "  ERROR: $LINK symlink missing"
        ERRORS=$((ERRORS + 1))
    else
        echo "  OK: $LINK"
    fi
done

# Check workspace structure
echo ""
echo "Checking workspace/ structure..."
for DIR in workspace/memory workspace/docs workspace/scripts; do
    if [ ! -d "$PROJECT_PATH/$DIR" ]; then
        echo "  ERROR: $DIR directory missing"
        ERRORS=$((ERRORS + 1))
    else
        echo "  OK: $DIR"
    fi
done

# Check docs structure
echo ""
echo "Checking docs/ volatility organization..."
for DIR in workspace/docs/knowledge workspace/docs/planning workspace/docs/tracking; do
    if [ ! -d "$PROJECT_PATH/$DIR" ]; then
        echo "  ERROR: $DIR directory missing"
        ERRORS=$((ERRORS + 1))
    else
        echo "  OK: $DIR"
    fi
done

# Check .gitignore patterns
echo ""
echo "Checking .gitignore patterns..."
REQUIRED_PATTERNS=(
    ".opencode/workspace"
    ".opencode/skills"
    ".opencode/agents"
    ".opencode/commands"
    ".github/agents"
    ".github/chatmodes"
    ".github/prompts"
    "workspace/docs/global"
    "workspace/scripts/global"
)

for PATTERN in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -q "$PATTERN" "$PROJECT_PATH/.gitignore"; then
        echo "  ERROR: Missing .gitignore pattern: $PATTERN"
        ERRORS=$((ERRORS + 1))
    else
        echo "  OK: $PATTERN in .gitignore"
    fi
done

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed - project setup complete"
    exit 0
else
    echo "❌ $ERRORS error(s) found - project setup incomplete"
    exit 1
fi
```

---

## Implementation Priority

### P0 (Critical - Do First)
1. Update `setup-new-project.sh` to create all symlinks
2. Add `.gitignore` patterns to setup script
3. Create validation script

### P1 (High - Do Soon)
1. Update `project-setup` skill with complete structure examples
2. Update `docs-structure` skill with symlink documentation
3. Add troubleshooting sections to both skills

### P2 (Medium - Polish)
1. Add section to `file-naming` skill (if needed)
2. Update any onboarding documentation
3. Test with new project initialization

---

## Affected Documentation

These skills/scripts need updates after implementation:
- `~/.config/opencode/skills/project-setup/SKILL.md`
- `~/.config/opencode/skills/docs-structure/SKILL.md`
- `~/.config/opencode/workspace/scripts/global/setup-new-project.sh`
- `~/.config/opencode/workspace/scripts/global/setup-new-project.sh.template` (if exists)

---

## Test Case: New Project Initialization

After improvements, run this test:

```bash
# Create test project
mkdir /tmp/test-project && cd /tmp/test-project && git init

# Run setup script
bash ~/.config/opencode/workspace/scripts/global/setup-new-project.sh --project TestProject

# Run validation
bash ~/.config/opencode/workspace/scripts/global/validate-project-setup.sh .

# Expected: All checks pass
```

---

## Session Artifacts

**Files Modified**:
- `.opencode/` directory created with 4 symlinks
- `.gitignore` updated with .opencode patterns
- `workspace/memory/systemPatterns.md` updated with structure diagram
- `workspace/memory/activeContext.md` updated with migration timeline

**Git Commits**:
1. `refactor: complete workspace migration`
2. `docs: update memory bank to reflect workspace migration`
3. `chore: add .opencode symlink infrastructure`

**Project Now Has**:
- 3 commits with clean history
- Complete workspace structure
- All infrastructure symlinks
- Updated memory bank documentation
- Ready for research phase

---

## Recommendations

1. **Global Impact**: These changes affect ALL new projects created. Consider P0 priority.

2. **Automation**: Setup script should be idempotent (safe to run multiple times)

3. **Consistency**: Validation script should be run before any agent work begins

4. **Documentation**: Keep skill examples synchronized with actual script output

5. **Testing**: Add integration test to CI/CD that validates new project setup completeness

---

**Prepared by**: Session Coordinator  
**Date**: 2026-02-17 18:20:00  
**For**: @agent-creator improvements to setup infrastructure
