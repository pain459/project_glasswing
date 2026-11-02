"""
Ephemeris manager — Download, verify, and load JPL DE kernels.

Responsibilities:
- Download approved JPL kernels during explicit initialization
- Verify integrity using checksums
- Load kernels from local storage
- Expose kernel coverage and health information
- Avoid repeated network downloads
"""

import hashlib
import logging
import os
from pathlib import Path
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# Default JPL kernel configuration
DEFAULT_KERNEL = {
    "name": "de440s.bsp",
    "url": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp",
    "sha256": "c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2",
    "coverage_start": 1950,
    "coverage_end": 2050,
    "size_bytes": 32_726_016,
}

KERNELS = {
    "de440s": DEFAULT_KERNEL,
}


class EphemerisManager:
    """Manages JPL ephemeris kernel downloads and loading."""

    def __init__(self, data_dir: str = "/app/data/ephemeris"):
        self.data_dir = Path(data_dir)
        self._loaded_kernel = None
        self._kernel_info = None

    def ensure_kernel(self, kernel_name: str = "de440s") -> Path:
        """Ensure the specified kernel is available locally, downloading if needed."""
        config = KERNELS.get(kernel_name)
        if not config:
            raise ValueError(f"Unknown kernel: {kernel_name}. Available: {list(KERNELS.keys())}")

        self.data_dir.mkdir(parents=True, exist_ok=True)
        kernel_path = self.data_dir / config["name"]

        if kernel_path.exists():
            # Verify checksum
            actual_hash = hashlib.sha256(kernel_path.read_bytes()).hexdigest()
            if actual_hash == config["sha256"]:
                logger.info("Kernel %s verified at %s", kernel_name, kernel_path)
                self._kernel_info = {
                    "name": kernel_name,
                    "path": str(kernel_path),
                    "verified": True,
                    "coverage_start": config["coverage_start"],
                    "coverage_end": config["coverage_end"],
                }
                return kernel_path
            else:
                logger.warning(
                    "Kernel %s checksum mismatch (expected %s, got %s). Re-downloading.",
                    kernel_name, config["sha256"], actual_hash
                )

        # Download
        logger.info("Downloading kernel %s from %s", kernel_name, config["url"])
        _download_kernel(config["url"], kernel_path, config["sha256"])

        self._kernel_info = {
            "name": kernel_name,
            "path": str(kernel_path),
            "verified": True,
            "coverage_start": config["coverage_start"],
            "coverage_end": config["coverage_end"],
        }
        return kernel_path

    def load_kernel(self, kernel_path: Path):
        """Load a kernel file into Skyfield."""
        from skyfield.api import load

        self._loaded_kernel = load(str(kernel_path))
        logger.info("Loaded ephemeris kernel from %s", kernel_path)
        return self._loaded_kernel

    @property
    def loaded_kernel(self):
        return self._loaded_kernel

    @property
    def kernel_info(self) -> Optional[dict]:
        return self._kernel_info

    def is_date_supported(self, year: int) -> bool:
        """Check if a year falls within the loaded kernel's coverage."""
        if not self._kernel_info:
            return False
        return self._kernel_info["coverage_start"] <= year <= self._kernel_info["coverage_end"]


def _download_kernel(url: str, dest: Path, expected_sha256: str, timeout: int = 300):
    """Download a kernel file with checksum verification."""
    import requests as req

    response = req.get(url, timeout=timeout, stream=True)
    response.raise_for_status()

    chunk_size = 8192
    sha256 = hashlib.sha256()
    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=chunk_size):
            f.write(chunk)
            sha256.update(chunk)

    actual_hash = sha256.hexdigest()
    if actual_hash != expected_sha256:
        dest.unlink(missing_ok=True)
        raise RuntimeError(
            f"Kernel download checksum mismatch: expected {expected_sha256}, got {actual_hash}"
        )

    logger.info("Kernel downloaded and verified: %s (%d bytes)", dest, dest.stat().st_size)
