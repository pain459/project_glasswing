// Renderer — builds UI from calculator configs
const renderer = {
  app: null,

  init() {
    this.app = document.getElementById('app');
  },

  // Render home page with category cards
  showHome() {
    const cats = calculatorRegistry.getCategories();
    let html = `
      <div class="home-heading">
        <h1>Calculator Hub</h1>
        <p>${calculatorRegistry.count()} calculators — all offline, no ads.</p>
      </div>
      <div class="category-grid">`;

    for (const cat of cats) {
      const info = calculatorRegistry.categoryInfo[cat];
      if (!info) continue;
      const calcs = this._validEntries(calculatorRegistry.getCategory(cat));
      const count = calcs.length;
      if (count === 0) continue;
      html += `
        <a href="#/${cat}/" class="category-card">
          <div class="category-icon">${info.icon}</div>
          <div>
            <h2>${info.label}</h2>
            <p>${info.desc} · ${count} calculators</p>
          </div>
        </a>`;
    }

    html += '</div>';
    this.app.innerHTML = html;
  },

  // Render a calculator page
  showCalculator(category, slug) {
    const cfg = calculatorRegistry.get(category, slug);
    if (!cfg) { this.showNotFound(`${category}/${slug}`); return; }

    const catInfo = calculatorRegistry.categoryInfo[category] || { icon: "📐", label: category };
    const fieldsHtml = (cfg.fields || []).map(f => this._fieldHtml(f)).join('');
    const explanationHtml = cfg.formula ? `
      <div class="explanation">
        <h3>How it works</h3>
        ${cfg.formula}
      </div>` : '';

    this.app.innerHTML = `
      <a href="#/${category}/" class="back-link">← ${catInfo.label}</a>
      <div class="calc-header">
        <h1>${cfg.title}</h1>
        ${cfg.description ? `<p>${cfg.description}</p>` : ''}
      </div>
      <div class="calc-card">
        <form id="calcForm" data-category="${category}" data-slug="${slug}">
          ${fieldsHtml}
          <button type="submit">Calculate</button>
        </form>
        <div id="result" class="result"></div>
      </div>
      ${explanationHtml}`;

    // Bind submit handler
    document.getElementById('calcForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleCalculation(category, slug, cfg);
    });

    // Handle select change events for dynamic fields
    if (cfg.onFieldChange) {
      this._bindFieldChanges(cfg);
    }

    // Scroll to top
    window.scrollTo(0, 0);
  },

  // Filter a category map down to usable entries
  _validEntries(calcs) {
    return Object.entries(calcs || {}).filter(
      ([, cfg]) => cfg && typeof cfg === 'object' && cfg.title
    );
  },

  // Render category index page
  showCategoryIndex(category) {
    const calcs = this._validEntries(calculatorRegistry.getCategory(category));
    const catInfo = calculatorRegistry.categoryInfo[category] || { icon: "📐", label: category };

    let html = `
      <a href="#/" class="back-link">← Home</a>
      <div class="calc-header">
        <h1>${catInfo.icon} ${catInfo.label}</h1>
        <p>${calcs.length} calculators</p>
      </div>
      <div class="calculator-list">`;

    for (const [slug, cfg] of calcs) {
      html += `<a href="#/${category}/${slug}" class="calculator-link">${cfg.title}</a>`;
    }

    html += '</div>';
    this.app.innerHTML = html;
  },

  // Render search page
  showSearch() {
    this.app.innerHTML = `
      <div class="calc-header">
        <h1>Search Calculators</h1>
      </div>
      <div class="calc-card">
        <div class="field">
          <input type="text" id="searchInput" placeholder="Type to search..." autofocus style="font-size:1.1rem;padding:.75rem 1rem">
        </div>
        <div id="searchResults" class="search-results"></div>
      </div>`;

    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!q) { results.innerHTML = ''; return; }
      const matches = calculatorRegistry.search(q);
      if (!matches.length) {
        results.innerHTML = '<p class="no-results">No calculators found.</p>';
        return;
      }
      let html = '';
      for (const m of matches.slice(0, 50)) {
        const catInfo = calculatorRegistry.categoryInfo[m.category] || {};
        html += `<a href="#/${m.category}/${m.slug}" class="search-result-item">
          <span class="search-result-icon">${catInfo.icon || '📐'}</span>
          <span class="search-result-title">${m.title}</span>
          <span class="search-result-cat">${catInfo.label || m.category}</span>
        </a>`;
      }
      results.innerHTML = html;
    });

    // Focus the input
    setTimeout(() => input.focus(), 50);
  },

  // Render 404
  showNotFound(path) {
    this.app.innerHTML = `
      <div class="calc-header">
        <h1>Calculator not found</h1>
        <p>Route: ${path}</p>
      </div>
      <a href="#/" class="back-link">← Go Home</a>`;
  },

  // Build HTML for a field
  _fieldHtml(f) {
    const id = f.id || ('field_' + Math.random().toString(36).slice(2, 8));
    const label = f.label || id;
    const attrs = [];
    if (f.placeholder) attrs.push(`placeholder="${f.placeholder}"`);
    if (f.min !== undefined) attrs.push(`min="${f.min}"`);
    if (f.max !== undefined) attrs.push(`max="${f.max}"`);
    if (f.step !== undefined) attrs.push(`step="${f.step}"`);
    if (f.required) attrs.push('required');
    if (f.value) attrs.push(`value="${f.value}"`);
    const attrStr = attrs.join(' ');

    if (f.type === 'select') {
      const options = (f.options || []).map(o =>
        `<option value="${o.value}"${o.default ? ' selected' : ''}>${o.label}</option>`
      ).join('');
      return `<div class="field${f.half ? ' half' : ''}">
        <label for="${id}">${label}</label>
        <select id="${id}" ${attrStr}>${options}</select>
      </div>`;
    }

    if (f.type === 'textarea') {
      return `<div class="field">
        <label for="${id}">${label}</label>
        <textarea id="${id}" rows="${f.rows || 4}" ${attrStr} style="resize:vertical"></textarea>
        ${f.hint ? `<small style="color:var(--text-muted)">${f.hint}</small>` : ''}
      </div>`;
    }

    return `<div class="field${f.half ? ' half' : ''}">
      <label for="${id}">${label}</label>
      <input type="${f.type || 'number'}" id="${id}" ${attrStr}>
      ${f.hint ? `<small style="color:var(--text-muted)">${f.hint}</small>` : ''}
    </div>`;
  },

  // Handle form submission
  _handleCalculation(category, slug, cfg) {
    try {
      const result = cfg.calculate(this._gatherInputs(cfg.fields));
      const resultEl = document.getElementById('result');

      if (typeof result === 'string') {
        resultEl.innerHTML = result;
      } else if (result && result.html) {
        resultEl.innerHTML = result.html;
      } else if (result && typeof result === 'object') {
        // Auto-render key-value result
        let html = '<table>';
        for (const [key, val] of Object.entries(result)) {
          if (key === 'html') continue;
          html += `<tr><th>${key}</th><td>${val}</td></tr>`;
        }
        html += '</table>';
        resultEl.innerHTML = html;
      }

      core.showResult('result');
    } catch (err) {
      document.getElementById('result').innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
      core.showResult('result');
    }
  },

  // Gather form input values
  _gatherInputs(fields) {
    const inputs = {};
    for (const f of (fields || [])) {
      const id = f.id || f.name;
      if (!id) continue;
      const el = document.getElementById(id);
      if (!el) continue;
      if (f.type === 'number' || f.type === 'range') {
        inputs[id] = parseFloat(el.value) || 0;
      } else if (f.type === 'date') {
        inputs[id] = el.value;
      } else if (f.type === 'textarea') {
        inputs[id] = el.value.trim();
      } else if (f.type === 'select') {
        inputs[id] = el.value;
      } else {
        inputs[id] = el.value;
      }
    }
    return inputs;
  },

  // Bind field change events
  _bindFieldChanges(cfg) {
    for (const f of (cfg.fields || [])) {
      if (f.onChange) {
        const el = document.getElementById(f.id);
        if (el) el.addEventListener('change', () => f.onChange(el.value, cfg));
      }
    }
  },
};

// Override router dispatch to handle category index pages
const originalDispatch = router.dispatch.bind(router);
router.dispatch = function () {
  const path = router.parse();
  const parts = path.split('/').filter(Boolean);

  // Category index: /<category>/
  if (parts.length === 1) {
    const catInfo = calculatorRegistry.categoryInfo[parts[0]];
    if (catInfo) {
      renderer.showCategoryIndex(parts[0]);
      return;
    }
  }

  originalDispatch();
};

// Register home route
router.register('/', () => renderer.showHome());

// Initialize
renderer.init();
// router.start() is called after all definition files have loaded (see tools.js)
