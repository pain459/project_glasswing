# Glasswing Calculators

Self-hosted, offline-capable calculator hub with 520+ calculators across 16 categories. No ads, no tracking.

## Architecture

```
public/
├── index.html              # Entry point, loads all JS files
├── css/site.css            # Styles
└── js/
    ├── core.js             # Shared utilities (formatNumber, getNumber, gcd, etc.)
    ├── router.js           # Hash-based SPA router
    ├── calculator-registry.js  # Registry + category metadata
    ├── renderer.js         # UI rendering from calculator configs
    └── defs/               # Calculator definitions by category
        ├── algebra.js
        ├── construction.js
        ├── conversions.js
        ├── discretemathematics.js
        ├── financial.js
        ├── geometry-plane.js
        ├── geometry-solids.js
        ├── health.js
        ├── homelab.js
        ├── math.js
        ├── physics.js
        ├── statistics.js
        ├── technology.js
        ├── time.js
        ├── tools.js
        └── trigonometry.js
```

### How It Works

1. `index.html` loads the core libraries, then each definition file in sequence
2. Each definition file calls `calculatorRegistry.register()` to add calculators
3. The registry normalizes titles and auto-deduplicates: if two calculators share the same normalized title, the second becomes an alias of the first
4. The router maps `#/<category>/<slug>` to the appropriate calculator
5. The renderer builds the UI from the calculator config (fields, formula, calculate function)

## Adding a New Calculator

Add a `R('slug', { ... })` block to the definition file for the appropriate category.

### Minimal Example

Append this to `public/js/defs/math.js` (or whichever file matches your category):

```js
R('my-new-calculator', {
  title: 'My New Calculator',
  description: 'One-line summary of what it does.',
  tags: ['keyword1', 'keyword2'],
  fields: [
    { id: 'inputA', label: 'First Input', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
    { id: 'inputB', label: 'Second Input', type: 'number', step: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>Result = A + B</code></p>',
  background: '<p>Some context about the formula and when to use it.</p>',
  calculate: function(v) {
    return {
      'Result': core.formatNumber(v.inputA + v.inputB),
    };
  }
});
```

### Config Fields

| Property | Required | Description |
|----------|----------|-------------|
| `title` | yes | Display title. Normalized for dedup (lowercased, suffixes stripped). |
| `description` | yes | Short description shown on category pages. |
| `tags` | yes | Array of keywords for search. |
| `fields` | yes | Array of input field definitions (see below). |
| `formula` | recommended | HTML string showing the mathematical formula. |
| `background` | recommended | HTML string with context about the formula. |
| `calculate` | yes | Function `(values) => { ... }` returning a results object. |

### Field Types

| Type | Properties |
|------|------------|
| `number` | `step`, `min`, `max`, `placeholder`, `half` (takes half-width) |
| `select` | `options: [{ value, label }]` |
| `textarea` | `placeholder`, `hint` |
| `text` | `placeholder` |

### Calculate Function

The `calculate` function receives an object with field values keyed by `id`. Return a plain object where each key is a result label and each value is the formatted result string. Use `core.formatNumber()`, `core.formatCurrency()`, `core.formatPercent()` for formatting.

For rich output, return `{ html: '<div>...</div>' }` instead.

### Title Deduplication

The registry normalizes titles by:
1. Lowercasing
2. Removing non-alphanumeric characters
3. Stripping common suffixes: `calculator`, `converter`, `counter`, `generator`, `checker`, `solver`, `estimator`, `matrix`, `table`

If two calculators normalize to the same string, the second becomes an alias of the first. This is safe: the alias resolves to the original at render time.

## Adding a New Category

### 1. Register Category Metadata

Add an entry to `calculatorRegistry.categoryInfo` in `public/js/calculator-registry.js`:

```js
categoryInfo: {
  // ... existing entries ...
  mycategory: { icon: "🆕", label: "My Category", desc: "Short description" },
}
```

### 2. Create a Definition File

Create `public/js/defs/mycategory.js` following the standard pattern:

```js
// My category calculators
(function(reg) {
const R = reg.register.bind(reg, 'mycategory');

R('my-calculator', {
  title: 'My Calculator',
  // ... config ...
});

})(calculatorRegistry);
```

### 3. Load the File

Add a `<script>` tag in `public/index.html` among the other definition files:

```html
<script src="js/defs/mycategory.js"></script>
```

### 4. (Optional) Rebuild & Deploy

If running via Docker:
```bash
cd stacks/calculators
docker compose up -d --build
```

The app is served from the `public/` directory via nginx. Changes to JS/HTML are picked up immediately on reload (no build step).

## Utility Functions (core.js)

| Function | Description |
|----------|-------------|
| `core.formatNumber(n, decimals)` | Format number with locale-aware commas |
| `core.formatCurrency(n, currency)` | Format as currency |
| `core.formatPercent(n, decimals)` | Format as percentage |
| `core.getNumber(id, min, max)` | Read and validate a number input |
| `core.getText(id)` | Read a text input |
| `core.getDataSet(id)` | Read comma-separated numbers from a textarea |
| `core.gcd(a, b)` | Greatest common divisor |
| `core.mean(data)` | Arithmetic mean |
| `core.median(data)` | Median |
| `core.stdDev(data)` | Sample standard deviation |
| `core.variance(data)` | Sample variance |
| `core.factorial(n)` | Factorial |
| `core.combinations(n, k)` | Binomial coefficient |
| `core.primeFactors(n)` | Prime factorization |
| `core.deg2rad(deg)` / `core.rad2deg(rad)` | Angle conversion |

## File Conventions

- Each definition file is wrapped in an IIFE: `(function(reg) { ... })(calculatorRegistry)`
- Create a shorthand `R = reg.register.bind(reg, 'category')` at the top
- Use `// === SECTION HEADER ===` comments to group related calculators
- Keep one calculator per `R()` call; don't nest them
- The `homelab.js` file demonstrates registering to multiple categories using separate shorthand aliases (`T` for technology, `F` for financial)
