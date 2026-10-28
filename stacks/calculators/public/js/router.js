// Hash-based router for SPA navigation
const router = {
  routes: {},
  currentRoute: null,

  register(path, handler) {
    this.routes[path] = handler;
  },

  // Parse hash into route + params
  parse() {
    const hash = window.location.hash.slice(2) || '/';
    return hash;
  },

  navigate(path) {
    window.location.hash = '#' + path;
  },

  start() {
    window.addEventListener('hashchange', () => this.dispatch());
    this.dispatch();
  },

  dispatch() {
    const path = this.parse();

    // Exact match
    if (this.routes[path]) {
      this.currentRoute = path;
      this.routes[path]();
      return;
    }

    // Calculator route: /<category>/<slug>
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 2) {
      const category = parts[0];
      const slug = parts[1];
      if (calculatorRegistry.get(category, slug)) {
        this.currentRoute = path;
        renderer.showCalculator(category, slug);
        return;
      }
    }

    // Search route
    if (path === 'search') {
      this.currentRoute = path;
      renderer.showSearch();
      return;
    }

    // 404
    this.currentRoute = path;
    renderer.showNotFound(path);
  },
};
