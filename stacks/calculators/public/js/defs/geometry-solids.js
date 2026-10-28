// Solid Geometry calculators
(function(reg) {
const R = reg.register.bind(reg, 'geometry-solids');

// === 3D DISTANCE ===

R('distance-two-points', {
  title: '3D Distance Calculator',
  description: 'Calculate the distance between two points in 3D space.',
  tags: ['distance', '3d', 'three dimensional', 'coordinates'],
  fields: [
    { id: 'x1', label: 'X₁', type: 'number', step: 0.01, placeholder: 'e.g. 7', half: true },
    { id: 'y1', label: 'Y₁', type: 'number', step: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'z1', label: 'Z₁', type: 'number', step: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'x2', label: 'X₂', type: 'number', step: 0.01, placeholder: 'e.g. 17', half: true },
    { id: 'y2', label: 'Y₂', type: 'number', step: 0.01, placeholder: 'e.g. 6', half: true },
    { id: 'z2', label: 'Z₂', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
  ],
  formula: '<p><code>d = √((x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²)</code></p>',
  calculate: function(v) {
    const x1 = v.x1, y1 = v.y1, z1 = v.z1;
    const x2 = v.x2, y2 = v.y2, z2 = v.z2;
    if (x1 === undefined || x1 === null || x1 === '' || x2 === undefined || x2 === null || x2 === '') return { error: 'Enter coordinates for both points' };
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return {
      'Distance': core.formatNumber(d, 6),
      'ΔX': core.formatNumber(dx, 4),
      'ΔY': core.formatNumber(dy, 4),
      'ΔZ': core.formatNumber(dz, 4),
    };
  }
});

// === CYLINDER ===

R('cylinder', {
  title: 'Cylinder Calculator',
  description: 'Calculate volume, lateral surface area, and total surface area of a cylinder.',
  tags: ['cylinder', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'radius', label: 'Radius (r)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'height', label: 'Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>V = πr²h</code>, <code>Lateral SA = 2πrh</code>, <code>Total SA = 2πr(r + h)</code></p>',
  calculate: function(v) {
    const r = v.radius, h = v.height;
    if (!r || !h) return { error: 'Enter valid dimensions' };
    return {
      'Volume': core.formatNumber(Math.PI * r * r * h, 4),
      'Lateral Surface Area': core.formatNumber(2 * Math.PI * r * h, 4),
      'Total Surface Area': core.formatNumber(2 * Math.PI * r * (r + h), 4),
      'Base Area': core.formatNumber(Math.PI * r * r, 4),
    };
  }
});

// === CONE ===

R('cone', {
  title: 'Cone Calculator',
  description: 'Calculate volume, lateral surface area, and total surface area of a right circular cone.',
  tags: ['cone', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'radius', label: 'Radius (r)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'height', label: 'Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>V = (1/3)πr²h</code>, <code>Lateral SA = πrs</code>, <code>Total SA = πr(r + s)</code> where <code>s = √(r² + h²)</code></p>',
  calculate: function(v) {
    const r = v.radius, h = v.height;
    if (!r || !h) return { error: 'Enter valid dimensions' };
    const s = Math.sqrt(r * r + h * h);
    return {
      'Volume': core.formatNumber((1 / 3) * Math.PI * r * r * h, 4),
      'Slant Height': core.formatNumber(s, 4),
      'Lateral Surface Area': core.formatNumber(Math.PI * r * s, 4),
      'Total Surface Area': core.formatNumber(Math.PI * r * (r + s), 4),
      'Base Area': core.formatNumber(Math.PI * r * r, 4),
    };
  }
});

// === SPHERE ===

R('sphere', {
  title: 'Sphere Calculator',
  description: 'Calculate volume and surface area of a sphere.',
  tags: ['sphere', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'radius', label: 'Radius (r)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'diameter', label: 'Diameter (d)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>V = (4/3)πr³</code>, <code>SA = 4πr²</code></p>',
  calculate: function(v) {
    let r;
    if (v.radius) r = v.radius;
    else if (v.diameter) r = v.diameter / 2;
    else return { error: 'Enter radius or diameter' };
    return {
      'Radius': core.formatNumber(r, 4),
      'Diameter': core.formatNumber(2 * r, 4),
      'Volume': core.formatNumber((4 / 3) * Math.PI * r * r * r, 4),
      'Surface Area': core.formatNumber(4 * Math.PI * r * r, 4),
    };
  }
});

// === CUBE ===

R('cube', {
  title: 'Cube Calculator',
  description: 'Calculate volume, surface area, and diagonals of a cube.',
  tags: ['cube', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'side', label: 'Side Length (a)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'volume', label: 'Volume', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 125', half: true },
  ],
  formula: '<p><code>V = a³</code>, <code>SA = 6a²</code>, <code>Face Diagonal = a√2</code>, <code>Space Diagonal = a√3</code></p>',
  calculate: function(v) {
    let a;
    if (v.side) a = v.side;
    else if (v.volume) a = Math.cbrt(v.volume);
    else return { error: 'Enter side length or volume' };
    return {
      'Side': core.formatNumber(a, 4),
      'Volume': core.formatNumber(a * a * a, 4),
      'Surface Area': core.formatNumber(6 * a * a, 4),
      'Face Diagonal': core.formatNumber(a * Math.sqrt(2), 4),
      'Space Diagonal': core.formatNumber(a * Math.sqrt(3), 4),
    };
  }
});

// === RECTANGULAR PRISM ===

R('rectangularprism', {
  title: 'Rectangular Prism Calculator',
  description: 'Calculate volume, surface area, and space diagonal of a rectangular prism.',
  tags: ['rectangular prism', 'cuboid', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'length', label: 'Length (l)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5' },
    { id: 'width', label: 'Width (w)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'height', label: 'Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4', half: true },
  ],
  formula: '<p><code>V = lwh</code>, <code>SA = 2(lw + lh + wh)</code>, <code>Diagonal = √(l² + w² + h²)</code></p>',
  calculate: function(v) {
    const l = v.length, w = v.width, h = v.height;
    if (!l || !w || !h) return { error: 'Enter valid dimensions' };
    return {
      'Volume': core.formatNumber(l * w * h, 4),
      'Surface Area': core.formatNumber(2 * (l * w + l * h + w * h), 4),
      'Space Diagonal': core.formatNumber(Math.sqrt(l * l + w * w + h * h), 4),
    };
  }
});

// === CAPSULE ===

R('capsule', {
  title: 'Capsule Calculator',
  description: 'Calculate volume and surface area of a capsule (cylinder with hemispherical ends).',
  tags: ['capsule', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'radius', label: 'Radius (r)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'height', label: 'Capsule Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>V = (4/3)πr³ + 2πr²(h − 2r)</code> when h ≥ 2r. <code>SA = 4πr² + 2πr(h − 2r)</code></p>',
  calculate: function(v) {
    const r = v.radius, h = v.height;
    if (!r || !h) return { error: 'Enter valid dimensions' };
    const cylH = Math.max(0, h - 2 * r);
    const sphereVol = (4 / 3) * Math.PI * r * r * r;
    const cylVol = Math.PI * r * r * cylH;
    const sphereSA = 4 * Math.PI * r * r;
    const cylSA = 2 * Math.PI * r * cylH;
    return {
      'Volume': core.formatNumber(sphereVol + cylVol, 4),
      'Surface Area': core.formatNumber(sphereSA + cylSA, 4),
      'Cylinder Height': core.formatNumber(cylH, 4),
      'Sphere Volume (both ends)': core.formatNumber(sphereVol, 4),
      'Cylinder Volume': core.formatNumber(cylVol, 4),
    };
  }
});

// === CONICAL FRUSTUM ===

R('conicalfrustum', {
  title: 'Conical Frustum Calculator',
  description: 'Calculate volume and surface area of a conical frustum.',
  tags: ['frustum', 'cone', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'radiusTop', label: 'Top Radius (r₁)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'radiusBottom', label: 'Bottom Radius (r₂)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'height', label: 'Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7', half: true },
  ],
  formula: '<p><code>V = (1/3)πh(r₁² + r₁r₂ + r₂²)</code>, <code>Lateral SA = π(r₁ + r₂)s</code> where <code>s = √((r₂ − r₁)² + h²)</code></p>',
  calculate: function(v) {
    const r1 = v.radiusTop, r2 = v.radiusBottom, h = v.height;
    if (!r1 || !r2 || !h) return { error: 'Enter valid dimensions' };
    const s = Math.sqrt((r2 - r1) * (r2 - r1) + h * h);
    return {
      'Volume': core.formatNumber((1 / 3) * Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2), 4),
      'Slant Height': core.formatNumber(s, 4),
      'Lateral Surface Area': core.formatNumber(Math.PI * (r1 + r2) * s, 4),
      'Total Surface Area': core.formatNumber(Math.PI * (r1 * r1 + r2 * r2 + (r1 + r2) * s), 4),
      'Top Base Area': core.formatNumber(Math.PI * r1 * r1, 4),
      'Bottom Base Area': core.formatNumber(Math.PI * r2 * r2, 4),
    };
  }
});

// === PYRAMID (Square) ===

R('pyramid', {
  title: 'Square Pyramid Calculator',
  description: 'Calculate volume and surface area of a square pyramid.',
  tags: ['pyramid', 'square', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'base', label: 'Base Side (a)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 6', half: true },
    { id: 'height', label: 'Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 8', half: true },
  ],
  formula: '<p><code>V = (1/3)a²h</code>, <code>Lateral SA = a√(a² + 4h²)</code>, <code>Total SA = a² + a√(a² + 4h²)</code></p>',
  calculate: function(v) {
    const a = v.base, h = v.height;
    if (!a || !h) return { error: 'Enter valid dimensions' };
    const slant = Math.sqrt((a / 2) * (a / 2) + h * h);
    const lateralSA = a * Math.sqrt(a * a + 4 * h * h);
    return {
      'Volume': core.formatNumber((1 / 3) * a * a * h, 4),
      'Slant Height': core.formatNumber(slant, 4),
      'Base Area': core.formatNumber(a * a, 4),
      'Lateral Surface Area': core.formatNumber(lateralSA, 4),
      'Total Surface Area': core.formatNumber(a * a + lateralSA, 4),
    };
  }
});

// === HEMISPHERE ===

R('hemisphere', {
  title: 'Hemisphere Calculator',
  description: 'Calculate volume and surface area of a hemisphere.',
  tags: ['hemisphere', 'sphere', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'radius', label: 'Radius (r)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'diameter', label: 'Diameter (d)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>V = (2/3)πr³</code>, <code>Curved SA = 2πr²</code>, <code>Total SA = 3πr²</code></p>',
  calculate: function(v) {
    let r;
    if (v.radius) r = v.radius;
    else if (v.diameter) r = v.diameter / 2;
    else return { error: 'Enter radius or diameter' };
    return {
      'Radius': core.formatNumber(r, 4),
      'Volume': core.formatNumber((2 / 3) * Math.PI * r * r * r, 4),
      'Curved Surface Area': core.formatNumber(2 * Math.PI * r * r, 4),
      'Total Surface Area': core.formatNumber(3 * Math.PI * r * r, 4),
      'Base Area': core.formatNumber(Math.PI * r * r, 4),
    };
  }
});

// === TRIANGULAR PRISM ===

R('triangular-prism', {
  title: 'Triangular Prism Calculator',
  description: 'Calculate volume and surface area of a triangular prism using Heron\'s formula.',
  tags: ['triangular prism', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'sideA', label: 'Triangle Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'sideB', label: 'Triangle Side b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'sideC', label: 'Triangle Side c', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 6', half: true },
    { id: 'height', label: 'Prism Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>V = (h/4)√((a+b+c)(b+c−a)(c+a−b)(a+b−c))</code>, <code>SA = 2 × Base Area + h(a+b+c)</code></p>',
  calculate: function(v) {
    const a = v.sideA, b = v.sideB, c = v.sideC, h = v.height;
    if (!a || !b || !c || !h) return { error: 'Enter all three sides and height' };
    // Heron's formula for triangle area
    const s = (a + b + c) / 2;
    const triArea = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    if (isNaN(triArea) || triArea <= 0) return { error: 'Sides do not form a valid triangle' };
    const vol = triArea * h;
    const lateralSA = h * (a + b + c);
    const totalSA = 2 * triArea + lateralSA;
    return {
      'Volume': core.formatNumber(vol, 4),
      'Base Area': core.formatNumber(triArea, 4),
      'Lateral Surface Area': core.formatNumber(lateralSA, 4),
      'Total Surface Area': core.formatNumber(totalSA, 4),
      'Triangle Perimeter': core.formatNumber(a + b + c, 4),
    };
  }
});

// === PYRAMID FRUSTUM ===

R('pyramid-frustum', {
  title: 'Pyramid Frustum Calculator',
  description: 'Calculate volume of a square or triangular pyramid frustum.',
  tags: ['pyramid', 'frustum', 'volume', 'solid'],
  fields: [
    { id: 'sides', label: 'Number of Base Sides', type: 'select', options: [
      { value: '4', label: '4 (Square)', default: true },
      { value: '3', label: '3 (Triangular)' }
    ]},
    { id: 'sideTop', label: 'Top Side Length (a)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'sideBottom', label: 'Bottom Side Length (b)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'height', label: 'Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7', half: true },
  ],
  formula: '<p><code>V = (1/3)h(a + b + √(ab))²</code> for square base. For triangular base, area scales by √3/4 factor.</p>',
  calculate: function(v) {
    const a = v.sideTop, b = v.sideBottom, h = v.height;
    if (!a || !b || !h) return { error: 'Enter valid dimensions' };
    const n = parseInt(v.sides) || 4;
    // V = (1/3) * h * (A_top + A_bottom + sqrt(A_top * A_bottom))
    // For square: A = side², for triangle: A = (√3/4) * side²
    const shapeFactor = n === 3 ? Math.sqrt(3) / 4 : 1;
    const A_top = shapeFactor * a * a;
    const A_bottom = shapeFactor * b * b;
    const vol = (1 / 3) * h * (A_top + A_bottom + Math.sqrt(A_top * A_bottom));
    return {
      'Volume': core.formatNumber(vol, 4),
      'Top Base Area': core.formatNumber(A_top, 4),
      'Bottom Base Area': core.formatNumber(A_bottom, 4),
    };
  }
});

// === TUBE (Hollow Cylinder) ===

R('tube', {
  title: 'Tube Calculator',
  description: 'Calculate volume, surface area, and properties of a tube (hollow cylinder).',
  tags: ['tube', 'hollow cylinder', 'pipe', 'volume', 'surface area', 'solid'],
  fields: [
    { id: 'outerRadius', label: 'Outer Radius (r₁)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'innerRadius', label: 'Inner Radius (r₂)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'height', label: 'Height (h)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>V = π(r₁² − r₂²)h</code>, <code>Wall Thickness = r₁ − r₂</code>, <code>End Area = π(r₁² − r₂²)</code></p>',
  calculate: function(v) {
    const r1 = v.outerRadius, r2 = v.innerRadius, h = v.height;
    if (!r1 || !r2 || !h) return { error: 'Enter valid dimensions' };
    if (r2 >= r1) return { error: 'Inner radius must be less than outer radius' };
    const t = r1 - r2;
    const C1 = 2 * Math.PI * r1;
    const C2 = 2 * Math.PI * r2;
    const L1 = 2 * Math.PI * r1 * h;
    const L2 = 2 * Math.PI * r2 * h;
    const A = Math.PI * (r1 * r1 - r2 * r2);
    const V1 = Math.PI * r1 * r1 * h;
    const V2 = Math.PI * r2 * r2 * h;
    const V = V1 - V2;
    return {
      'Volume (solid)': core.formatNumber(V, 4),
      'Outer Volume': core.formatNumber(V1, 4),
      'Inner Volume': core.formatNumber(V2, 4),
      'Outer Surface Area': core.formatNumber(L1, 4),
      'Inner Surface Area': core.formatNumber(L2, 4),
      'End Cross-section Area': core.formatNumber(A, 4),
      'Outer Circumference': core.formatNumber(C1, 4),
      'Inner Circumference': core.formatNumber(C2, 4),
      'Wall Thickness': core.formatNumber(t, 4),
    };
  }
});

// === GEOMETRIC SHAPES REFERENCE ===

R('geometricshapes', {
  title: 'Solid Geometry Shapes Reference',
  description: 'Reference table of volume and surface area formulas for common solid shapes.',
  tags: ['shapes', 'reference', 'formulas', 'solid geometry'],
  fields: [
    { id: 'shape', label: 'Shape', type: 'select', options: [
      { value: 'all', label: 'All Shapes' },
      { value: 'sphere', label: 'Sphere' },
      { value: 'cylinder', label: 'Cylinder' },
      { value: 'cone', label: 'Cone' },
      { value: 'cube', label: 'Cube' },
      { value: 'rectangular-prism', label: 'Rectangular Prism' },
      { value: 'pyramid', label: 'Square Pyramid' },
      { value: 'hemisphere', label: 'Hemisphere' },
      { value: 'capsule', label: 'Capsule' },
      { value: 'conical-frustum', label: 'Conical Frustum' },
      { value: 'triangular-prism', label: 'Triangular Prism' },
    ]},
  ],
  calculate: function(v) {
    const shapes = {
      sphere: { name: 'Sphere', volume: '(4/3)πr³', surface: '4πr²', notes: 'r = radius' },
      cylinder: { name: 'Cylinder', volume: 'πr²h', surface: '2πr(r + h)', notes: 'r = radius, h = height' },
      cone: { name: 'Cone', volume: '(1/3)πr²h', surface: 'πr(r + s)', notes: 's = √(r² + h²)' },
      cube: { name: 'Cube', volume: 'a³', surface: '6a²', notes: 'a = side length' },
      'rectangular-prism': { name: 'Rectangular Prism', volume: 'lwh', surface: '2(lw + lh + wh)', notes: 'l, w, h = dimensions' },
      pyramid: { name: 'Square Pyramid', volume: '(1/3)a²h', surface: 'a² + a√(a² + 4h²)', notes: 'a = base side, h = height' },
      hemisphere: { name: 'Hemisphere', volume: '(2/3)πr³', surface: '3πr²', notes: 'r = radius' },
      capsule: { name: 'Capsule', volume: '(4/3)πr³ + 2πr²(h−2r)', surface: '4πr² + 2πr(h−2r)', notes: 'r = radius, h = total height' },
      'conical-frustum': { name: 'Conical Frustum', volume: '(1/3)πh(r₁²+r₁r₂+r₂²)', surface: 'π(r₁²+r₂²+(r₁+r₂)s)', notes: 's = slant height' },
      'triangular-prism': { name: 'Triangular Prism', volume: 'A_base × h', surface: '2A_base + h(a+b+c)', notes: 'A_base = triangle area' },
    };
    let rows = '';
    const filter = v.shape || 'all';
    const entries = filter === 'all' ? Object.entries(shapes) : [[filter, shapes[filter]]];
    for (const [key, s] of entries) {
      if (!s) continue;
      rows += '<tr><td>' + s.name + '</td><td>' + s.volume + '</td><td>' + s.surface + '</td><td>' + s.notes + '</td></tr>';
    }
    return {
      html: '<table><tr><th>Shape</th><th>Volume Formula</th><th>Surface Area Formula</th><th>Notes</th></tr>' + rows + '</table>'
    };
  }
});

// === SURFACE AREA CALCULATOR (Multi-shape) ===

R('surfacearea', {
  title: 'Surface Area Calculator',
  description: 'Calculate the surface area of various solid geometric shapes.',
  tags: ['surface area', 'solid', 'multi-shape'],
  fields: [
    { id: 'shape', label: 'Shape', type: 'select', options: [
      { value: 'sphere', label: 'Sphere', default: true },
      { value: 'cylinder', label: 'Cylinder' },
      { value: 'cone', label: 'Cone' },
      { value: 'cube', label: 'Cube' },
      { value: 'rectangular-prism', label: 'Rectangular Prism' },
      { value: 'pyramid', label: 'Square Pyramid' },
      { value: 'hemisphere', label: 'Hemisphere' },
      { value: 'capsule', label: 'Capsule' },
      { value: 'conical-frustum', label: 'Conical Frustum' },
      { value: 'triangular-prism', label: 'Triangular Prism' },
    ]},
    { id: 'dim1', label: 'Dimension 1', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'dim2', label: 'Dimension 2', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'dim3', label: 'Dimension 3', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p>Select a shape and enter the required dimensions. See the <a href="#calc-geometricshapes">Solid Geometry Reference</a> for formulas.</p>',
  calculate: function(v) {
    const shape = v.shape || 'sphere';
    const d1 = v.dim1, d2 = v.dim2, d3 = v.dim3;
    let totalSA, lateralSA, baseSA;
    switch (shape) {
      case 'sphere':
        if (!d1) return { error: 'Enter the radius' };
        totalSA = 4 * Math.PI * d1 * d1;
        return { 'Surface Area': core.formatNumber(totalSA, 4) };
      case 'cylinder':
        if (!d1 || !d2) return { error: 'Enter radius and height' };
        lateralSA = 2 * Math.PI * d1 * d2;
        baseSA = Math.PI * d1 * d1;
        totalSA = 2 * Math.PI * d1 * (d1 + d2);
        return { 'Total Surface Area': core.formatNumber(totalSA, 4), 'Lateral SA': core.formatNumber(lateralSA, 4), 'Base Area': core.formatNumber(baseSA, 4) };
      case 'cone':
        if (!d1 || !d2) return { error: 'Enter radius and height' };
        const s = Math.sqrt(d1 * d1 + d2 * d2);
        lateralSA = Math.PI * d1 * s;
        baseSA = Math.PI * d1 * d1;
        totalSA = Math.PI * d1 * (d1 + s);
        return { 'Total Surface Area': core.formatNumber(totalSA, 4), 'Lateral SA': core.formatNumber(lateralSA, 4), 'Base Area': core.formatNumber(baseSA, 4) };
      case 'cube':
        if (!d1) return { error: 'Enter the side length' };
        totalSA = 6 * d1 * d1;
        return { 'Surface Area': core.formatNumber(totalSA, 4) };
      case 'rectangular-prism':
        if (!d1 || !d2 || !d3) return { error: 'Enter all three dimensions' };
        totalSA = 2 * (d1 * d2 + d1 * d3 + d2 * d3);
        return { 'Surface Area': core.formatNumber(totalSA, 4) };
      case 'pyramid':
        if (!d1 || !d2) return { error: 'Enter base side and height' };
        lateralSA = d1 * Math.sqrt(d1 * d1 + 4 * d2 * d2);
        baseSA = d1 * d1;
        totalSA = baseSA + lateralSA;
        return { 'Total Surface Area': core.formatNumber(totalSA, 4), 'Lateral SA': core.formatNumber(lateralSA, 4), 'Base Area': core.formatNumber(baseSA, 4) };
      case 'hemisphere':
        if (!d1) return { error: 'Enter the radius' };
        totalSA = 3 * Math.PI * d1 * d1;
        return { 'Total Surface Area': core.formatNumber(totalSA, 4), 'Curved SA': core.formatNumber(2 * Math.PI * d1 * d1, 4), 'Base Area': core.formatNumber(Math.PI * d1 * d1, 4) };
      case 'capsule':
        if (!d1 || !d2) return { error: 'Enter radius and height' };
        const cylH = Math.max(0, d2 - 2 * d1);
        totalSA = 4 * Math.PI * d1 * d1 + 2 * Math.PI * d1 * cylH;
        return { 'Surface Area': core.formatNumber(totalSA, 4) };
      case 'conical-frustum':
        if (!d1 || !d2 || !d3) return { error: 'Enter top radius, bottom radius, and height' };
        const sf = Math.sqrt((d2 - d1) * (d2 - d1) + d3 * d3);
        lateralSA = Math.PI * (d1 + d2) * sf;
        totalSA = Math.PI * (d1 * d1 + d2 * d2 + (d1 + d2) * sf);
        return { 'Total Surface Area': core.formatNumber(totalSA, 4), 'Lateral SA': core.formatNumber(lateralSA, 4) };
      case 'triangular-prism':
        if (!d1 || !d2 || !d3 || !v.dim4) return { error: 'Enter all three sides and height' };
        const a = d1, b = d2, c = d3, h = v.dim4;
        const sp = (a + b + c) / 2;
        const triA = Math.sqrt(sp * (sp - a) * (sp - b) * (sp - c));
        if (isNaN(triA) || triA <= 0) return { error: 'Sides do not form a valid triangle' };
        lateralSA = h * (a + b + c);
        totalSA = 2 * triA + lateralSA;
        return { 'Total Surface Area': core.formatNumber(totalSA, 4), 'Lateral SA': core.formatNumber(lateralSA, 4), 'Base Area': core.formatNumber(triA, 4) };
      default:
        return { error: 'Select a valid shape' };
    }
  }
});

// === VOLUME CALCULATOR (Multi-shape) ===

R('volume', {
  title: 'Volume Calculator',
  description: 'Calculate the volume of various solid geometric shapes.',
  tags: ['volume', 'solid', 'multi-shape'],
  fields: [
    { id: 'shape', label: 'Shape', type: 'select', options: [
      { value: 'sphere', label: 'Sphere', default: true },
      { value: 'cylinder', label: 'Cylinder' },
      { value: 'cone', label: 'Cone' },
      { value: 'cube', label: 'Cube' },
      { value: 'rectangular-prism', label: 'Rectangular Prism' },
      { value: 'pyramid', label: 'Square Pyramid' },
      { value: 'hemisphere', label: 'Hemisphere' },
      { value: 'capsule', label: 'Capsule' },
      { value: 'conical-frustum', label: 'Conical Frustum' },
      { value: 'triangular-prism', label: 'Triangular Prism' },
    ]},
    { id: 'dim1', label: 'Dimension 1', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'dim2', label: 'Dimension 2', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'dim3', label: 'Dimension 3', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p>Select a shape and enter the required dimensions. See the <a href="#calc-geometricshapes">Solid Geometry Reference</a> for formulas.</p>',
  calculate: function(v) {
    const shape = v.shape || 'sphere';
    const d1 = v.dim1, d2 = v.dim2, d3 = v.dim3;
    let vol;
    switch (shape) {
      case 'sphere':
        if (!d1) return { error: 'Enter the radius' };
        vol = (4 / 3) * Math.PI * d1 * d1 * d1;
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'cylinder':
        if (!d1 || !d2) return { error: 'Enter radius and height' };
        vol = Math.PI * d1 * d1 * d2;
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'cone':
        if (!d1 || !d2) return { error: 'Enter radius and height' };
        vol = (1 / 3) * Math.PI * d1 * d1 * d2;
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'cube':
        if (!d1) return { error: 'Enter the side length' };
        vol = d1 * d1 * d1;
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'rectangular-prism':
        if (!d1 || !d2 || !d3) return { error: 'Enter all three dimensions' };
        vol = d1 * d2 * d3;
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'pyramid':
        if (!d1 || !d2) return { error: 'Enter base side and height' };
        vol = (1 / 3) * d1 * d1 * d2;
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'hemisphere':
        if (!d1) return { error: 'Enter the radius' };
        vol = (2 / 3) * Math.PI * d1 * d1 * d1;
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'capsule':
        if (!d1 || !d2) return { error: 'Enter radius and height' };
        const cylH2 = Math.max(0, d2 - 2 * d1);
        vol = (4 / 3) * Math.PI * d1 * d1 * d1 + Math.PI * d1 * d1 * cylH2;
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'conical-frustum':
        if (!d1 || !d2 || !d3) return { error: 'Enter top radius, bottom radius, and height' };
        vol = (1 / 3) * Math.PI * d3 * (d1 * d1 + d1 * d2 + d2 * d2);
        return { 'Volume': core.formatNumber(vol, 4) };
      case 'triangular-prism':
        if (!d1 || !d2 || !d3 || !v.dim4) return { error: 'Enter all three sides and height' };
        const a2 = d1, b2 = d2, c2 = d3, h2 = v.dim4;
        const sp2 = (a2 + b2 + c2) / 2;
        const triA2 = Math.sqrt(sp2 * (sp2 - a2) * (sp2 - b2) * (sp2 - c2));
        if (isNaN(triA2) || triA2 <= 0) return { error: 'Sides do not form a valid triangle' };
        vol = triA2 * h2;
        return { 'Volume': core.formatNumber(vol, 4) };
      default:
        return { error: 'Select a valid shape' };
    }
  }
});

})(calculatorRegistry);
