# syntax=docker/dockerfile:1
# ComfyUI — self-built, pinned, non-root.
#
# Base: official PyTorch CUDA 13.0 runtime image (Ubuntu 24.04, Python 3.12).
#   - torch 2.14.1+cu130, torchvision 0.29.1+cu130, torchaudio 2.11.0+cu130
#     preinstalled, plus pip 26.x under /usr/local.
#   - Pinned by digest for reproducibility.
#
# ComfyUI: pinned by tag (v0.46.0, 2026-11-18).
#   - Requires torch >= 2.7 (comfy_kitchen list[int] fix, ComfyUI #17116).
#   - requirements.txt lists torch/torchvision UNPINNED, so a constraints file
#     is mandatory or pip would replace the CUDA build with PyPI's CPU wheel.
#   - ComfyUI-Manager is a PyPI package in v0.46.0 (not a custom node):
#     comfy/manager_requirements.txt pins comfyui_manager==4.2.2.
#
# Non-root: uid/gid 1000 (host user ravik) so /mnt/storage/comfyui/* is
# writable without root. The Ubuntu base already owns uid/gid 1000 as `ubuntu`,
# so that account is renamed instead of recreated.
#
# Build:  make rebuild STACK=comfyui
# Run:    make gpu-comfyui

ARG PYTORCH_BASE=pytorch/pytorch:2.14.1-cuda13.0-cudnn9-runtime@sha256:3c0b174a1339193a5bcc4b37d737c9f5ca3c4782a2293d3888e4271367eddf44
FROM ${PYTORCH_BASE}

ARG COMFYUI_REF=v0.46.0
ARG COMFYUI_MANAGER_REF=4.2.2
ARG APP_UID=1000
ARG APP_GID=1000

# PIP_USER is deliberately NOT set here: build-time packages must land in
# system site-packages. compose.yaml sets PIP_USER=1 at runtime so that
# Manager-installed custom-node requirements land in the mounted
# /home/comfy/.local and survive container recreation.
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_BREAK_SYSTEM_PACKAGES=1 \
    PYTHONUNBUFFERED=1 \
    COMFYUI_HOME=/app/ComfyUI

# --- System deps -------------------------------------------------------------
# git:   clone ComfyUI at a pinned tag.
# wget:  healthcheck.
# curl:  debugging.
# pip is already present in this base image; apt's python3-pip would shadow it.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        wget \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m pip --version

# --- Non-root user -----------------------------------------------------------
# The base image already owns uid/gid 1000 as `ubuntu`. Rename that account
# rather than deleting it, so uid/gid 1000 keeps mapping to the host user.
RUN set -eux; \
    if getent group "${APP_GID}" >/dev/null; then \
        existing_group="$(getent group "${APP_GID}" | cut -d: -f1)"; \
        if [ "${existing_group}" != "comfy" ]; then \
            groupmod --new-name comfy "${existing_group}"; \
        fi; \
    else \
        groupadd --gid "${APP_GID}" comfy; \
    fi; \
    if getent passwd "${APP_UID}" >/dev/null; then \
        existing_user="$(getent passwd "${APP_UID}" | cut -d: -f1)"; \
        if [ "${existing_user}" != "comfy" ]; then \
            usermod --login comfy --home /home/comfy --move-home "${existing_user}"; \
        fi; \
    else \
        useradd --uid "${APP_UID}" --gid "${APP_GID}" --create-home comfy; \
    fi; \
    usermod --shell /usr/sbin/nologin comfy; \
    mkdir -p /home/comfy; \
    chown "${APP_UID}:${APP_GID}" /home/comfy; \
    id comfy

# --- ComfyUI source (pinned tag) ---------------------------------------------
RUN git clone --branch ${COMFYUI_REF} --depth 1 \
        https://github.com/Comfy-Org/ComfyUI.git /app/ComfyUI \
    && cd /app/ComfyUI \
    && git log -1 --oneline

WORKDIR /app/ComfyUI

# --- Python deps -------------------------------------------------------------
# 1. Pin the torch trio to the exact CUDA builds already in the base image.
#    requirements.txt lists them unpinned, so this is what keeps CUDA 13.0.
# 2. Install ComfyUI requirements with that constraints file.
# 3. Install ComfyUI-Manager at the version ComfyUI's own
#    comfy/manager_requirements.txt pins (4.2.2).
RUN python3 -c "import torch, torchvision, torchaudio; \
    print(f'torch={torch.__version__} torchvision={torchvision.__version__} torchaudio={torchaudio.__version__}'); \
    open('/tmp/torch-constraints.txt','w').write(\
        f'torch=={torch.__version__}\ntorchvision=={torchvision.__version__}\ntorchaudio=={torchaudio.__version__}\n')" \
    && cat /tmp/torch-constraints.txt

RUN python3 -m pip install --no-cache-dir \
        -c /tmp/torch-constraints.txt \
        -r requirements.txt \
    && python3 -m pip install --no-cache-dir \
        -c /tmp/torch-constraints.txt \
        comfyui_manager==${COMFYUI_MANAGER_REF}

# --- Build-time assertion: torch >= 2.7 and CUDA 13.0 ------------------------
# Version/ABI checks only — BuildKit build containers have no GPU, so
# torch.cuda.is_available() can never be asserted here. That check lives in
# post-up.sh, which reads /system_stats from the running container.
RUN python3 -c "import torch; \
    assert torch.__version__ >= '2.7', f'torch {torch.__version__} < 2.7 (required by ComfyUI v0.46.0)'; \
    assert torch.version.cuda == '13.0', f'CUDA {torch.version.cuda} != 13.0 (required for RTX 4090)'; \
    print(f'OK: torch {torch.__version__} CUDA {torch.version.cuda}')"

# --- Entrypoint --------------------------------------------------------------
# Appends $COMFYUI_EXTRA_ARGS (Infisical /comfyui) to main.py's arguments.
COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# --- Ownership ---------------------------------------------------------------
RUN chown -R ${APP_UID}:${APP_GID} /app/ComfyUI /home/comfy

# --- Runtime -----------------------------------------------------------------
# Listens on 0.0.0.0:8188 inside the container; compose publishes it on
# ${GLASSWING_HOST_IP}:3042 only (ComfyUI has no authentication).
USER comfy
EXPOSE 8188
HEALTHCHECK --interval=10s --timeout=5s --start-period=180s --retries=12 \
    CMD wget -q -O /dev/null http://127.0.0.1:8188/system_stats || exit 1
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD []
