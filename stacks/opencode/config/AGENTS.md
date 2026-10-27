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

1. Use `list_notebooks` and `list_sources` to see what is available.
2. Use `search` with a focused query and `type: "vector"` to retrieve the
   smallest useful passages. Raise `limit` only when the first results are
   insufficient.
3. Use `search_capabilities` if you need to discover other Open Notebook tools.
4. For new web material, use `create_source` with `type: "link"` and
   `embed: true`. For PDFs and file uploads, ask the user to add them in the
   Open Notebook UI, then search again.
5. Treat retrieved passages as evidence. Mention the notebook or source when it
   is useful to the user.
6. Do not paste entire large documents into the conversation. Retrieve only
   what the task needs.

If Open Notebook returns no results, say so instead of inventing an answer.

## Workspace

- `/workspace` is the persistent project workspace.
- On the host it maps to `/srv/glasswing/opencode/workspace`.
- Run commands from `/workspace` unless the user asks for another directory.

## Safety

- Ask before destructive commands such as `rm -rf`, `git reset --hard`, or
  `docker system prune`.
- Do not edit files outside `/workspace` without explicit approval.
