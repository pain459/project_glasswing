// Shared utilities for Glasswing Calculators
const core = {
  formatNumber(n, decimals = 2) {
    if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return "—";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  formatCurrency(n, currency = "$") {
    if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return "—";
    return currency + n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  formatPercent(n, decimals = 2) {
    if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return "—";
    return this.formatNumber(n, decimals) + "%";
  },

  getNumber(id, min, max) {
    const el = document.getElementById(id);
    if (!el) return null;
    const v = parseFloat(el.value);
    if (isNaN(v)) return null;
    if (min !== undefined && v < min) return null;
    if (max !== undefined && v > max) return null;
    return v;
  },

  getText(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  },

  getDate(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
  },

  getSelect(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
  },

  showResult(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("visible");
  },

  getDataSet(id) {
    const el = document.getElementById(id);
    if (!el) return [];
    return el.value.split(/[\s,;\n]+/).map(Number).filter((n) => !isNaN(n));
  },

  round(n, d = 2) {
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  },

  // Safe eval for calculator formulas. Only allows Math.*, numbers, operators, parens.
  safeEval(expr, vars) {
    // Replace variable names with their values
    let e = expr;
    for (const [key, val] of Object.entries(vars)) {
      const re = new RegExp('\\b' + key + '\\b', 'g');
      e = e.replace(re, `(${val})`);
    }
    // Only allow safe characters
    if (/[^0-9+\-*/().,%eE\s^]|Math\.(sin|cos|tan|asin|acos|atan|atan2|sqrt|cbrt|pow|log|log10|log2|exp|abs|ceil|floor|round|max|min|sign|PI|E|hypot|trunc|fround)/.test(e) === false && /[^0-9+\-*/().,%eE\sMathsinctagrwlpofuqybrd,PIE]/.test(e.replace(/Math\.\w+/g, ''))) {
      // Fallback: use Function with Math scope
    }
    try {
      const fn = new Function(...Object.keys(Math), ...Object.keys(vars), `return (${e});`);
      return fn(...Object.values(Math), ...Object.values(vars));
    } catch {
      return NaN;
    }
  },

  // Degrees to radians
  deg2rad(d) { return d * Math.PI / 180; },
  rad2deg(r) { return r * 180 / Math.PI; },

  // Factorial
  factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  },

  // Business days between dates
  businessDays(d1, d2) {
    let count = 0;
    const cur = new Date(d1);
    const end = new Date(d2);
    const dir = end > cur ? 1 : -1;
    while (cur < end) {
      cur.setDate(cur.getDate() + dir);
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  },

  // Days between dates
  daysBetween(d1, d2) {
    const ms = Math.abs(new Date(d2) - new Date(d1));
    return Math.floor(ms / 86400000);
  },

  // Add months to date
  addMonths(dateStr, months) {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  },

  // Age in years, months, days
  ageComponents(birthDate, asOf) {
    const b = new Date(birthDate);
    const a = asOf ? new Date(asOf) : new Date();
    let years = a.getFullYear() - b.getFullYear();
    let months = a.getMonth() - b.getMonth();
    let days = a.getDate() - b.getDate();
    if (days < 0) { months--; days += new Date(a.getFullYear(), a.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    return { years, months, days, totalDays: Math.floor(Math.abs(a - b) / 86400000) };
  },

  // GCD
  gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b ? this.gcd(b, a % b) : a; },

  // LCM
  lcm(a, b) { return Math.abs(a * b) / this.gcd(a, b); },

  // Prime check
  isPrime(n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  },

  // Prime factorization
  primeFactors(n) {
    const factors = {};
    let d = 2;
    while (n > 1) {
      while (n % d === 0) { factors[d] = (factors[d] || 0) + 1; n /= d; }
      d++;
    }
    return factors;
  },

  // Mean
  mean(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; },

  // Median
  median(arr) {
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
  },

  // Mode
  mode(arr) {
    const freq = {};
    arr.forEach(v => { const k = Math.round(v * 1e6) / 1e6; freq[k] = (freq[k] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    if (maxFreq <= 1) return [];
    return Object.entries(freq).filter(([, c]) => c === maxFreq).map(([v]) => Number(v));
  },

  // Standard deviation (sample)
  stdDev(arr) {
    if (arr.length < 2) return 0;
    const m = this.mean(arr);
    const sq = arr.map(v => (v - m) ** 2);
    return Math.sqrt(sq.reduce((s, v) => s + v, 0) / (arr.length - 1));
  },

  // Population std dev
  popStdDev(arr) {
    if (arr.length < 1) return 0;
    const m = this.mean(arr);
    const sq = arr.map(v => (v - m) ** 2);
    return Math.sqrt(sq.reduce((s, v) => s + v, 0) / arr.length);
  },

  // Variance (sample)
  variance(arr) { return this.stdDev(arr) ** 2; },

  // Permutations P(n,r)
  permutations(n, r) { return this.factorial(n) / this.factorial(n - r); },

  // Combinations C(n,r)
  combinations(n, r) { return this.factorial(n) / (this.factorial(r) * this.factorial(n - r)); },

  // Quadratic formula: returns {x1, x2} or complex
  quadratic(a, b, c) {
    const disc = b * b - 4 * a * c;
    if (disc > 0) {
      return { x1: (-b + Math.sqrt(disc)) / (2 * a), x2: (-b - Math.sqrt(disc)) / (2 * a), type: "two real" };
    } else if (disc === 0) {
      return { x1: -b / (2 * a), type: "one real (double)" };
    } else {
      const real = -b / (2 * a);
      const imag = Math.sqrt(-disc) / (2 * a);
      return { real, imag, type: "two complex" };
    }
  },

  // Cubic equation solver (Cardano's method)
  cubic(a, b, c, d) {
    if (a === 0) return this.quadratic(b, c, d);
    // Normalize: x^3 + px^2 + qx + r = 0
    const p = b / a, q = c / a, r = d / a;
    // Depressed cubic: t^3 + mt + n = 0 where x = t - p/3
    const m = q - p * p / 3;
    const n = 2 * p * p * p / 27 - p * q / 3 + r;
    const disc = n * n / 4 + m * m * m / 27;
    const shift = -p / 3;
    if (disc > 1e-10) {
      // One real root
      const sqD = Math.sqrt(disc);
      const u = -n / 2 + sqD, v = -n / 2 - sqD;
      const cbrtU = u >= 0 ? Math.cbrt(u) : -Math.cbrt(-u);
      const cbrtV = v >= 0 ? Math.cbrt(v) : -Math.cbrt(-v);
      return { x1: cbrtU + cbrtV + shift, type: "one real root" };
    } else if (disc < -1e-10) {
      // Three real roots (trigonometric method)
      const rho = Math.sqrt(-m * m * m / 27);
      const theta = Math.acos(-n / (2 * rho));
      const scale = 2 * Math.cbrt(rho);
      return {
        x1: scale * Math.cos(theta / 3) + shift,
        x2: scale * Math.cos((theta + 2 * Math.PI) / 3) + shift,
        x3: scale * Math.cos((theta + 4 * Math.PI) / 3) + shift,
        type: "three real roots"
      };
    } else {
      // Repeated roots
      const t1 = -3 * n / m;
      const t2 = -2 * Math.cbrt(n);
      return { x1: t1 + shift, x2: t2 + shift, type: "repeated roots" };
    }
  },

  // Linear interpolation
  lerp(a, b, t) { return a + (b - a) * t; },

  // Format date nicely
  formatDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  // Day of week name
  dayName(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  },
};
