#!/bin/sh
# ComfyUI entrypoint — appends COMFYUI_EXTRA_ARGS (from Infisical /comfyui).
#
# COMFYUI_EXTRA_ARGS is a space-separated CLI argument string, so word splitting
# is intentional -- but pathname expansion must stay off, or a value such as
# "--enable-cors-header *" would expand to the contents of the working directory.
set -eu
set -f

# shellcheck disable=SC2086
exec python3 main.py \
    --listen 0.0.0.0 \
    --port 8188 \
    --enable-manager \
    ${COMFYUI_EXTRA_ARGS:-} \
    "$@"
