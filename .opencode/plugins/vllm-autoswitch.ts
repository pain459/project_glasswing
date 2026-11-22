// Ensure the vLLM backend for the selected LiteLLM model is awake before
// OpenCode dispatches a request. Profiles are backend configs of one served
// model ID, so this only ever targets the registry entry matching that ID.
import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { promisify } from "node:util"
import { Plugin } from "@opencode/plugin"

const exec = promisify(execFile)

interface RegistryEntry {
  model: string
  port: string
}

function readRegistry(path: string): RegistryEntry[] {
  const entries: RegistryEntry[] = []
  let model = ""
  let port = ""
  const flush = () => {
    if (model && port) entries.push({ model, port })
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (/^\s*#/.test(line) || !line.trim()) continue
    const name = line.match(/^  ([A-Za-z0-9_.-]+):\s*$/)
    if (name) {
      flush()
      model = name[1]!
      port = ""
      continue
    }
    const value = line.match(/^    port:\s*(\d+)/)
    if (value && model) port = value[1]!
  }
  flush()
  return entries
}

function hostIP(repo: string): string {
  let ip = process.env.GLASSWING_HOST_IP ?? ""
  if (!ip) {
    try {
      const env = readFileSync(join(repo, "stacks/infisical/.env"), "utf8")
      const found = env.match(/^(?:GLASSWING_HOST_IP|HOST_IP)=(.*)$/m)
      if (found) ip = found[1]!.trim().replace(/^["']|["']$/g, "")
    } catch {
      // Fall back to the documented default below.
    }
  }
  return ip || "192.168.68.62"
}

export default Plugin.define({
  id: "glasswing.vllm-autoswitch",
  async setup(ctx) {
    const repo = ctx.location.project?.canonical || ctx.location.directory
    const registry = join(repo, "stacks/vllm/model-registry.yaml")
    const host = hostIP(repo)
    let entries: RegistryEntry[]
    try {
      entries = readRegistry(registry)
    } catch {
      // No registry in this project (or not the Glasswing repo): stay inert.
      return
    }

    // One switch at a time per model; concurrent prompts must not race.
    const locks = new Map<string, Promise<void>>()

    const ensureAwake = async (model: { providerID: string; id: string }) => {
      if (model.providerID !== "litellm") return
      const target = entries.find((entry) => entry.model === model.id)
      if (!target) return

      let sleeping = true
      try {
        const response = await fetch(`http://${host}:${target.port}/is_sleeping`, {
          signal: AbortSignal.timeout(1500),
        })
        if (response.ok) {
          const state = (await response.json()) as { is_sleeping?: boolean }
          sleeping = state.is_sleeping !== false
        }
      } catch {
        sleeping = true // container stopped or unreachable → let switch-model start it
      }
      if (!sleeping) return

      const previous = locks.get(target.model) ?? Promise.resolve()
      const next = previous.catch(() => undefined).then(async () => {
        console.log(`[vllm-autoswitch] starting ${target.model} for litellm/${model.id}`)
        await exec("make", ["-C", repo, "vllm-model", `MODEL=${target.model}`], {
          env: { ...process.env, GLASSWING_HOST_IP: host },
          maxBuffer: 1024 * 1024,
        })
      })
      locks.set(target.model, next)
      try {
        await next
      } finally {
        if (locks.get(target.model) === next) locks.delete(target.model)
      }
    }

    // context = agent loop, compaction = checkpoints, title/generate = helpers.
    for (const hook of ["context", "compaction", "generate", "title"] as const) {
      await ctx.session.hook(
        hook,
        async (event) => {
          await ensureAwake(event.model)
        },
        { providerID: "litellm" },
      )
    }
  },
})
