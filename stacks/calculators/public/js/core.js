// Shared utilities for Glasswing Calculators
const core = {
  // Format number with commas and specified decimal places
  formatNumber(n, decimals = 2) {
    if (isNaN(n) || !isFinite(n)) return "—";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  // Format as currency
  formatCurrency(n, currency = "$") {
    if (isNaN(n) || !isFinite(n)) return "—";
    return currency + this.formatNumber(n, 2);
  },

  // Format as percentage
  formatPercent(n, decimals = 2) {
    if (isNaN(n) || !isFinite(n)) return "—";
    return this.formatNumber(n, decimals) + "%";
  },

  // Validate a numeric input, return parsed value or null
  getNumber(id, min, max) {
    const el = document.getElementById(id);
    const v = parseFloat(el.value);
    if (isNaN(v)) return null;
    if (min !== undefined && v < min) return null;
    if (max !== undefined && v > max) return null;
    return v;
  },

  // Show the result div
  showResult(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("visible");
  },

  // Read comma-separated numbers from a textarea/input
  getDataSet(id) {
    const el = document.getElementById(id);
    if (!el) return [];
    return el.value
      .split(/[\s,;\n]+/)
      .map(Number)
      .filter((n) => !isNaN(n));
  },

  // Populate a <select> with options from an array of {value, label}
  populateSelect(id, options) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = "";
    options.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
  },

  // Get value from URL params (for shareable links)
  urlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  // Round to n decimal places
  round(n, d = 2) {
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  },
};
