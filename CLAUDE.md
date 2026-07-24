@AGENTS.md

<!-- BEGIN:project-memory-system -->
# 🧠 Project Memory System

This project uses **memories.sh** for persistent memory across sessions.

## MCP Tools Available

The `memories` MCP server exposes these tools:
- `get_context(query)` — Load relevant memories + rules for the current task
- `add_memory(content, type, tags)` — Store a new memory (types: rule, decision, fact, note)
- `search_memories(query)` — Full-text search across all memories
- `list_memories()` — List recent memories

## Required Workflow

1. **Session start** — Call `get_context` with a description of what you're about to work on
2. **File creation** — Call `add_memory` with type `fact` and tags `["file", "<area>"]` for every new file created
3. **Architecture decisions** — Call `add_memory` with type `decision` and tags `["architecture"]`
4. **Project rules** — Call `add_memory` with type `rule` for any discovered conventions/constraints
5. **Before guessing** — Call `search_memories` to find relevant past context

## Tags Convention
- `file` — Records about specific files
- `api` — API endpoints
- `architecture` — Design decisions
- `convention` — Coding rules
- `tech-stack` — Technology choices
- `security` — Security constraints
- `db` — Database
- `deployment` — DevOps
<!-- END:project-memory-system -->
