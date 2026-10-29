# Panchangam — Telugu Calendar Utilities
#
# Serves the Astro Chaganti Panchangam SPA locally. The SPA reads pre-generated
# `.ics` feed files from the `feeds/` directory for Tithi, Nakshatra, Yoga,
# Karana, Muhurtams, festivals, and more for 22 cities across 3 calculation
# systems (Drik Ganita, Surya Siddhanta, Vakya).
#
# Source: https://github.com/pain459/telugu-calendar-utilities
#
# ## Build
#
# The Dockerfile clones the repo at build time, runs `npm run build:site`,
# then serves the result with nginx. To rebuild with a newer version:
#
#   make rebuild STACK=panchangam
#
# ## Feeds
#
# The `.ics` files in `feeds/` are generated upstream via GitHub Actions on
# the 1st of each month. They cover 18 months ahead. The SPA fetches them
# from `/feeds/<city>-<system>.ics` at runtime.
#
# To regenerate feeds locally (requires Python 3.10+ and uv):
#
#   cd <source-repo>
#   uv sync --locked
#   uv run python -m telugu_panchangam.generate
#
# Then rebuild the stack.
#
# ## Access
#
# http://192.168.68.62:3023
