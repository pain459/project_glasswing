# ─────────────────────────────────────────────────────────────────────────────
# glasswing-power — Rust power/energy metering agent (Scaphandre fork)
#
# Built from source (no prebuilt image). Single-stage build on rust:1.95:
#   1. cargo build --release  (links against the image's system OpenSSL)
#   2. The binary runs in the same image, so the OpenSSL version matches.
#
# Using a separate ubuntu runtime image fails because rust:1.95 (Debian)
# compiles against OpenSSL 3.2, while ubuntu:24.04 ships OpenSSL 3.0.13.
# Building and running on the same base image avoids the version mismatch.
#
# The image has no shell/curl, so the healthcheck uses the binary's own
# `--version` probe (the Prometheus HTTP endpoint is verified externally by
# Uptime Kuma via siteMonitor).
# ─────────────────────────────────────────────────────────────────────────────

FROM rust:1.95
WORKDIR /app

# Increase cargo network timeout for slow/unreliable connections
ENV CARGO_NET_RETRY=5
ENV CARGO_HTTP_TIMEOUT=600

COPY . .
RUN cargo build --release

# Move the binary to a stable location and clean up the build tree
RUN install -m 0755 target/release/glasswing-power /usr/local/bin/glasswing-power \
    && rm -rf /app/target /app/src /app/Cargo.lock /app/Cargo.toml

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/glasswing-power"]
CMD ["prometheus"]
