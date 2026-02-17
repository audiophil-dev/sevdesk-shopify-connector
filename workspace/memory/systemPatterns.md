# System Patterns: Coding Standards & Architecture

# System Patterns: Coding Standards & Architecture

## Project Structure

```
workspace/
├── memory/                 # Agent context (persistent across sessions)
│   ├── productContext.md
│   ├── activeContext.md
│   ├── systemPatterns.md   (this file)
│   ├── decisionLog.md
│   ├── progress.md
│   └── taskRegistry.md     (git-ignored)
├── docs/                   # All project documentation
│   ├── global/             # Symlink → ~/.config/opencode/workspace/docs/global
│   ├── knowledge/          # Stable reference material (low volatility)
│   │   ├── market/         # Market research, Sevdesk ecosystem
│   │   ├── business/       # Business model, pricing
│   │   ├── technical/      # API research, technical deep-dives
│   │   └── research/       # Raw data, research artifacts
│   ├── planning/           # Active plans and strategy (medium volatility)
│   │   └── integration-architecture-spec.md  # Shopify-Sevdesk integration design
│   └── tracking/           # Progress tracking (high volatility)
│       ├── timeline.md
│       ├── milestones.md
│       └── sprints/
└── scripts/                # Utility scripts
    └── global/             # Symlink → ~/.config/opencode/scripts/global
```

**OpenCode Integration**:
- `AGENTS.md` → symlink to ~/.config/opencode/AGENTS.md
- `.github/agents/` → symlink to ~/.config/opencode/.github/agents
- `.github/chatmodes/` → symlink to ~/.config/opencode/.github/chatmodes
- `.github/prompts/` → symlink to ~/.config/opencode/.github/prompts

## Document Ownership

| Document | Owner | Purpose |
|----------|-------|---------|
| `docs/knowledge/technical/shopify-api-research.md` | @technology-researcher | Shopify API capabilities |
| `docs/knowledge/technical/sevdesk-api-research.md` | @technology-researcher | Sevdesk API documentation |
| `workspace/docs/planning/integration-architecture-spec.md` | @software-architect | Architecture decisions |
| `workspace/docs/tracking/timeline.md` | @planning-collaborator | Development timeline |

## Architecture Overview
[TBD - To be determined during research phase]

## Integration Architecture

**Core Flow**:
1. Monitor Shopify for payment completion events
2. Extract order and payment data
3. Transform to Sevdesk invoice format
4. Create invoice in Sevdesk
5. Trigger payment confirmation email via Shopify

**Key Components** (TBD):
- Payment event listener (webhook vs. polling)
- Data transformation layer
- API clients (Shopify, Sevdesk)
- Email notification system
- Error handling and retry logic

## Key Patterns

### Error Handling
[How errors are handled in this project]
- Error types and hierarchy
- Error propagation strategy
- User-facing error messages
- Logging and monitoring

### Logging
[Logging standards and practices]
- Log levels (debug, info, warn, error)
- Log format and structure
- Where logs are stored
- Log rotation and retention

### Testing
[Testing framework and patterns]
- Unit test patterns
- Integration test patterns
- E2E test patterns
- Test coverage requirements
- Mocking strategies

### State Management
[If applicable - Redux, Context API, Vuex, etc.]
- State structure
- Action patterns
- Reducer patterns
- Side effect handling

### API Design
[If applicable - REST, GraphQL, gRPC]
- Endpoint naming conventions
- Request/response formats
- Authentication/authorization
- Error response format

## Framework-Specific Patterns

### [Framework Name]
[Framework conventions and best practices specific to this project]

## Performance Patterns
[Performance optimization patterns and guidelines]
- Caching strategies
- Database query optimization
- Asset optimization
- Bundle size management

## Security Patterns
[Security best practices for this project]
- Authentication flow
- Authorization checks
- Input validation
- Sensitive data handling

---

**Last Updated**: 2026-02-17 18:16:00 (workspace migration completed)
