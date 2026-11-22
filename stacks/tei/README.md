# TEI — Text Embeddings Inference

CPU-based embedding server replacing Ollama for all embedding workloads.
Zero GPU contention — runs alongside vLLM and ComfyUI without competing for VRAM.

## Model

- **castorini/nomic-embed-text-v1.5** (768 dimensions, 8192 max tokens)
- Downloaded to `/mnt/storage/models/tei/model/`

## Commands

```bash
# Download the model (one-time)
HF_TOKEN=hf_... huggingface-cli download castorini/nomic-embed-text-v1.5 \
  --local-dir /mnt/storage/models/tei/model

# Start TEI
make up STACK=tei

# Validate
curl http://192.168.68.62:3046/health
curl http://192.168.68.62:3046/embed \
  -H "Content-Type: application/json" \
  -d '{"inputs": ["hello world"]}'
```

## Consumers

- **Open Notebook**: direct connection to `:3046` for embeddings
- **AnythingLLM**: `EMBEDDING_ENGINE=generic-openai`, `EMBEDDING_BASE_PATH=http://glasswing-tei:80/v1`

## API

TEI exposes an OpenAI-compatible API:
- `POST /embed` — embed text
- `POST /embed_batch` — batch embed
- `GET /health` — health check
- `GET /info` — model info
