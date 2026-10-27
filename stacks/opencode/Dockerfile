FROM ghcr.io/anomalyco/opencode:2.1.2

RUN apk add --no-cache \
      bash \
      ca-certificates \
      curl \
      git \
      jq \
      make \
      nodejs \
      npm \
      openssh-client \
      py3-pip \
      python3 \
      tzdata

ENV HOME=/home/opencode

WORKDIR /workspace

EXPOSE 4096

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4096/health >/dev/null || exit 1

USER 1000:1000
