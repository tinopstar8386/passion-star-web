# CodeGraph CLI & MCP Complete Reference

## 1. CLI Commands

### Project Lifecycle
- `codegraph init [path] [--yes]`: Initializes a `.codegraph/` directory in the repository, parses project files matching git track list, and builds the SQLite AST graph.
- `codegraph status [path]`: Displays index statistics (total nodes, edges, file count, and last sync timestamp).
- `codegraph sync [path]`: Triggers an incremental graph sync to parse modified or newly created files.
- `codegraph index [path] [--force] [--quiet]`: Forces a complete re-indexing of the entire codebase from scratch.
- `codegraph uninit [path] [--force]`: Removes `.codegraph/` and cleans up index state.

### Code Intelligence & Navigation
- `codegraph explore "<query or symbols>" [-j, --json]`: Queries the knowledge graph for architectural context, semantic paths, or relationships between symbols.
- `codegraph node <symbol-or-file> [-j, --json]`: Dumps detailed AST node information (definition file, line range, docstring/comments, signature, outgoing calls/imports).
- `codegraph callers <symbol> [-j, --json]`: Finds all upstream call sites and references to the specified function, method, or class.
- `codegraph affected [--stdin] [--filter "<pattern>"] [-j, --json]`: Traces downstream impact and blast radius. Typically paired with git:
  ```bash
  git diff --name-only main | codegraph affected --stdin
  ```

### Tooling & Agent Management
- `codegraph install [--yes] [--init]`: Automatically detects installed agent tools (Antigravity, Claude Code, Cursor, Codex CLI, Gemini CLI, Copilot) and registers the MCP server configuration and subagent instructions.
- `codegraph uninstall [--keep-cli]`: Removes agent wiring and subagent blocks.
- `codegraph upgrade [--check]`: In-place upgrade of the CodeGraph binary/package.
- `codegraph serve --mcp`: Starts the stdio Model Context Protocol (MCP) server.

---

## 2. MCP Tools Specification

When running as an MCP server, the following tools are exposed via JSON-RPC:

### `codegraph_search`
- **Description**: Fast full-text symbol search across the indexed repository.
- **Parameters**:
  - `query` (string, required): Symbol name, prefix, or natural search query.
  - `projectPath` (string, optional): Target repository root for multi-project workspaces.
  - `limit` (number, optional): Maximum results (default: 20).

### `codegraph_node`
- **Description**: Retrieves detailed node information for a specific symbol or source file.
- **Parameters**:
  - `target` (string, required): Symbol identifier or relative file path (e.g., `UserService` or `src/services/user.ts:UserService`).
  - `projectPath` (string, optional): Target workspace path.

### `codegraph_callers`
- **Description**: Returns all known callers and incoming references pointing to the target symbol.
- **Parameters**:
  - `symbol` (string, required): Function, method, or symbol name.
  - `projectPath` (string, optional): Target workspace path.

### `codegraph_callees`
- **Description**: Returns all outgoing calls and routines invoked by the target symbol.
- **Parameters**:
  - `symbol` (string, required): Function, method, or symbol name.
  - `projectPath` (string, optional): Target workspace path.

### `codegraph_impact`
- **Description**: Performs blast-radius analysis to identify files, symbols, and tests impacted by changes to the specified target.
- **Parameters**:
  - `symbol` (string, required): The symbol being modified or deleted.
  - `depth` (number, optional): Maximum dependency depth (default: 2).
  - `projectPath` (string, optional): Target workspace path.

### `codegraph_explore`
- **Description**: High-level semantic code graph path exploration between components or architectural layers.
- **Parameters**:
  - `query` (string, optional): Conceptual architecture query.
  - `from` (string, optional): Source symbol.
  - `to` (string, optional): Destination symbol.

---

## 3. File Discovery & Ignore Behavior

- **Zero-Config Exclusion**: CodeGraph uses `git ls-files` under the hood. Any pattern ignored in `.gitignore` is automatically excluded from the index.
- **Default Excludes**: Even in non-git directories, standard dependency trees (e.g. `node_modules/`, `vendor/`, `dist/`, `build/`, `.venv/`) are ignored by default.
- **Negation Overrides**: Use standard git negation syntax (e.g. `!vendor/critical-lib/`) in `.gitignore` to force indexing of specific directories.
- **Database Location**: State is stored in `.codegraph/codegraph.db`. Ensure `.codegraph/` is included in your global or project `.gitignore`.
