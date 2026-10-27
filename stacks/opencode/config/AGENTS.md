# Glasswing OpenCode

You are running in the Glasswing homelab on Pathfinder.

## Models

- The default model is `ollama/qwen3.6-opencode:latest`, served by Ollama at
  `http://192.168.68.62:11434`.
- The effective context window is 131,072 tokens and the generation budget is
  32,768 tokens. Neither is unlimited.
- Reasoning is disabled for coding (`reasoning_effort: "none"`). Answer directly
  instead of relying on a hidden thinking phase.
- If a request needs a different model, ask the user to switch it in the web UI.

## Retrieval and long context

OpenCode compacts long conversations automatically. For knowledge that may not
fit in the current conversation, use the `open-notebook` MCP server before
answering.

### Always search Open Notebook first for Glasswing-related questions

Before answering any question about the Glasswing homelab (infrastructure,
Docker stacks, OTel, Vector, OpenObserve, Ollama, configuration, errors,
decisions, or project structure), **always search the notebook first**:

1. Search `notebook:vh3t0sg5ghfz6styrlh5` (Glasswing Infrastructure) using
   `search` with `type: "vector"` and a focused query derived from the
   user's question.
2. Only trust results with similarity > 0.5. Discard lower-scoring hits as
   noise.
3. If results are found and relevant, use them as evidence. Mention the note
   or source when useful.
4. If no relevant results exist (or all similarity scores are below 0.5),
   proceed without notebook context. Say "no stored notes matched" rather
   than inventing an answer.

### General notebook usage

- Use `list_notebooks` and `list_sources` to see what is available.
- Use `search` with a focused query and `type: "vector"` to retrieve the
  smallest useful passages. Raise `limit` only when the first results are
  insufficient.
- Use `search_capabilities` if you need to discover other Open Notebook tools.
- For new web material, use `create_source` with `type: "link"` and
  `embed: true`. For PDFs and file uploads, ask the user to add them in the
  Open Notebook UI, then search again.
- Treat retrieved passages as evidence. Mention the notebook or source when it
  is useful to the user.
- Do not paste entire large documents into the conversation. Retrieve only
  what the task needs.

### Save session summaries as project memory

At the end of each meaningful session (after completing a task, fixing an
issue, or making a significant decision), save a summary note to the
Glasswing Infrastructure notebook (`notebook:vh3t0sg5ghfz6styrlh5`):

1. Create a note with title format:
   `Session - YYYY-MM-DD - <short topic description>`
2. Include: what was done, what was decided, what remains blocked, and any
   errors encountered with their resolution.
3. If a note with the same topic already exists from a recent session,
   delete the old one first, then create the updated one. Do not accumulate
   duplicate session notes.
4. When the user says "done", "that's all", "goodbye", or similar closing
   phrases, treat it as a signal to save the session summary before ending.

## Workspace

- `/workspace` is the persistent project workspace.
- On the host it maps to `/srv/glasswing/opencode/workspace`.
- Run commands from `/workspace` unless the user asks for another directory.

## Safety

- Ask before destructive commands such as `rm -rf`, `git reset --hard`, or
  `docker system prune`.
- Do not edit files outside `/workspace` without explicit approval.
