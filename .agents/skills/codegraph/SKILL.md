---
name: codegraph
description: Fast local code intelligence and knowledge graph using Tree-sitter and SQLite. Eliminates exploratory grep/read loops, traces callers/callees, performs blast-radius impact analysis, and integrates via MCP or CLI. Use when exploring unfamiliar codebases, analyzing refactoring impact, or setting up CodeGraph.
metadata:
  origin: colbymchenry/codegraph
---

# CodeGraph Intelligence & Impact Analysis

CodeGraph is a local-first, pre-indexed code knowledge graph tool designed to eliminate the "exploration tax" paid by AI coding agents. Instead of running repetitive, expensive `grep`, `glob`, and blind file-reading loops, CodeGraph parses source code into Abstract Syntax Trees (ASTs) with Tree-sitter, mapping symbols, calls, imports, and dependencies into a lightweight local SQLite database (`.codegraph/codegraph.db`) with FTS5 search.

---

## When to Activate

- **Unfamiliar Codebases**: Exploring architecture, entry points, or module dependencies without reading dozens of raw files.
- **Pre-Refactor Impact Analysis (Blast Radius)**: Finding all callers, implementations, and downstream dependencies before renaming, modifying, or deleting symbols.
- **Call Chain Tracing**: Tracing upstream callers (`who calls X?`) or downstream callees (`what does X invoke?`).
- **Post-Edit / PR Verification**: Checking which files and tests are affected by modified code via `git diff`.
- **Subagent Delegation**: Providing background or isolated subagents with structured graph queries (`codegraph explore`) instead of unbounded directory scans.
- **CodeGraph Setup & Maintenance**: Installing CLI/MCP, initializing `.codegraph/`, or re-indexing after large branch switches.

---

## Architecture & Core Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                       Source Code                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Tree-sitter WASM / Native)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    AST Symbol Extraction                    │
│  - Nodes: Functions, Methods, Classes, Interfaces, Types    │
│  - Edges: Calls, Imports, Inheritance, Type References      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Local SQLite Graph (.codegraph/)               │
│  - Graph relational schema + FTS5 full-text symbol search   │
│  - Auto-syncs on file changes via OS file watchers          │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│   MCP Server (stdio)         ││  CLI Tool (Terminal/Subagent│
│   codegraph serve --mcp      ││  codegraph explore / node   │
└──────────────────────────────┘└─────────────────────────────┘
```

- **100% Local & Private**: Runs entirely on machine; no cloud embeddings, no remote telemetry, safe for proprietary repositories.
- **Multi-Language Support (30+ Languages)**: TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, C#, Kotlin, Swift, PHP, Ruby, Dart, ArkTS, Terraform/HCL, and more.

---

## Integration Modes

### Mode 1: Model Context Protocol (MCP)

When configured as an MCP server, CodeGraph exposes structured tools directly into the agent toolset:

#### MCP Client Configuration
```json
{
  "mcpServers": {
    "codegraph": {
      "command": "codegraph",
      "args": ["serve", "--mcp"]
    }
  }
}
```

#### Primary MCP Tools
| MCP Tool | Purpose | Typical Input |
| :--- | :--- | :--- |
| `codegraph_search` | Search symbols by name or full-text query | `{"query": "AuthService"}` |
| `codegraph_node` | Inspect full details of a symbol (def line, docstring, signature, edges) | `{"target": "src/auth/service.ts:AuthService"}` |
| `codegraph_callers` | Find all functions/methods calling a given symbol | `{"symbol": "validateSession"}` |
| `codegraph_callees` | Find all routines invoked by a given symbol | `{"symbol": "loginUser"}` |
| `codegraph_impact` | Compute blast radius (all impacted symbols, files, and tests) | `{"symbol": "PaymentGateway", "depth": 2}` |
| `codegraph_explore` | Query architecture relationships, paths between two symbols | `{"from": "LoginController", "to": "UserRepository"}` |

### Mode 2: CLI Commands (Shell & Subagents)

For subagents without direct MCP access, or running in terminal/bash sessions:

```bash
# 1. Initialize graph in current repository
codegraph init

# 2. Query knowledge graph for symbols or questions
codegraph explore "auth session validation"

# 3. Inspect a symbol or file node
codegraph node AuthService
codegraph node src/auth/service.ts

# 4. Trace callers of a function
codegraph callers validateToken

# 5. Blast-radius impact analysis from git diff
git diff --name-only origin/main | codegraph affected --stdin

# 6. Check health and node count
codegraph status

# 7. Incremental sync or force re-indexing
codegraph sync
codegraph index --force
```

---

## Standard Workflows & SOPs

### Workflow 1: Token-Efficient Codebase Reconnaissance

Instead of reading 10 files blindly:

1. **Check Status**:
   ```bash
   codegraph status
   ```
   If not initialized:
   ```bash
   codegraph init --yes
   ```
2. **Find Entry Points & Key Abstractions**:
   Use `codegraph_search` or CLI `codegraph explore "main handler"` to identify central coordination points.
3. **Inspect Target Node**:
   Query `codegraph_node` to view signature, exports, and outgoing edges without dumping file content into context.
4. **Follow Only Relevant Edges**:
   Target specific imported modules rather than broad directory globbing.

### Workflow 2: Safe Refactoring & Blast-Radius Calculation

Before modifying a shared function, class signature, or interface:

1. **Query Callers**:
   ```bash
   codegraph callers <TargetFunction>
   ```
   Or call `codegraph_callers` / `codegraph_impact`.
2. **Review Affected Call Sites**:
   - Check which modules directly invoke the target.
   - Note which external consumers depend on return types or parameters.
3. **Identify Test Coverage**:
   Filter affected nodes for test files (`*.test.ts`, `*_test.go`, `test_*.py`) to determine exactly which test suites must be executed after modification.
4. **Execute Change & Verify**:
   Make edits, then re-run `codegraph affected` to confirm no unintended call sites were severed.

### Workflow 3: Git Diff Impact Analysis

To assess the blast radius of a branch before submitting a PR:

```bash
# Pipes changed files directly into impact analyzer
git diff --name-only HEAD~1 | codegraph affected --stdin --json
```

Output highlights:
- Directly modified symbols.
- Transitive callers impacted by modified interfaces.
- Downstream unit/integration test files that exercise those symbols.

---

## Subagent Integration Pattern

In agentic systems (like Antigravity or Claude Code), spawned subagents run in isolated conversation contexts and may not inherit MCP connections from the parent process.

To ensure subagents leverage CodeGraph rather than falling back to wasteful `grep`/`read` loops, inject the following instruction block in `AGENTS.md` or `GEMINI.md`:

```markdown
<!-- CODEGRAPH_START -->
## Code Navigation & Exploration Rules
Before running recursive grep or reading multiple files to explore code structure, use CodeGraph:
- Explore architecture: `codegraph explore "<question or symbol>"`
- Inspect symbol/file: `codegraph node <symbol-or-path>`
- Find upstream callers: `codegraph callers <symbol>`
- Check blast radius: `codegraph affected`
<!-- CODEGRAPH_END -->
```

---

## Setup & Maintenance Runbook

### Global Installation
```bash
# Global install via npm
npm install -g @colbymchenry/codegraph

# Run interactive agent wiring (auto-configures detected agents)
codegraph install --yes
```

### Repository Hygiene
Add the local database directory to `.gitignore`:
```gitignore
# CodeGraph local index
.codegraph/
```

### Troubleshooting Out-of-Sync Graphs
| Symptom | Cause | Remedy |
| :--- | :--- | :--- |
| Stale symbol definitions | External git branch switch or rebase | Run `codegraph sync` or `codegraph index --force` |
| Graph database locked | Concurrent write or crashed process | Stop lingering process; check `.codegraph/codegraph.db-journal` |
| Missing language symbols | Unsupported file extension | Check file extension mapping in config; upgrade with `codegraph upgrade` |
| Subagent ignores graph | MCP tools not passed to subagent | Ensure `<!-- CODEGRAPH_START -->` block is present in `AGENTS.md` |
