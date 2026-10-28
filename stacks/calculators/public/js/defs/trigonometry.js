// Trigonometry calculators
(function(reg) {
const R = reg.register.bind(reg, 'trigonometry');

// === SIN / COS / TAN ===

R('sin-cos-tan', {
  title: 'Sin / Cos / Tan Calculator',
  description: 'Calculate sine, cosine, and tangent for any angle.',
  tags: ['sin', 'cos', 'tan', 'trigonometric', 'angle'],
  fields: [
    { id: 'angle', label: 'Angle', type: 'number', step: 0.01, placeholder: 'e.g. 45' },
    { id: 'unit', label: 'Unit', type: 'select', options: [
      { value: 'deg', label: 'Degrees' },
      { value: 'rad', label: 'Radians' },
    ]},
  ],
  formula: '<p>sin(&theta;), cos(&theta;), tan(&theta;) for the given angle.</p>',
  calculate: function(v) {
    const rad = v.unit === 'deg' ? core.deg2rad(v.angle) : v.angle;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const tan = Math.abs(cos) < 1e-10 ? 'undefined' : core.formatNumber(Math.tan(rad), 6);
    var out = {};
    out['sin(' + v.angle + ')'] = core.formatNumber(sin, 6);
    out['cos(' + v.angle + ')'] = core.formatNumber(cos, 6);
    out['tan(' + v.angle + ')'] = tan;
    return out;
  }
});

// === INVERSE TRIG ===

R('asin-acos-atan', {
  title: 'Inverse Trigonometric Functions Calculator',
  description: 'Calculate arcsin, arccos, and arctan.',
  tags: ['arcsin', 'arccos', 'arctan', 'inverse', 'trigonometric'],
  fields: [
    { id: 'value', label: 'Value', type: 'number', step: 0.0001, placeholder: 'e.g. 0.5' },
    { id: 'outputUnit', label: 'Output Unit', type: 'select', options: [
      { value: 'deg', label: 'Degrees' },
      { value: 'rad', label: 'Radians' },
    ]},
  ],
  formula: '<p>arcsin(x) &#8712; [&#8722;&#960;/2, &#960;/2], arccos(x) &#8712; [0, &#960;], arctan(x) &#8712; (&#8722;&#960;/2, &#960;/2)</p>',
  calculate: function(v) {
    const x = v.value;
    var asin, acos;
    if (x < -1 || x > 1) {
      asin = 'undefined (|x| &#8804; 1 required)';
      acos = 'undefined (|x| &#8804; 1 required)';
    } else {
      var asinR = Math.asin(x), acosR = Math.acos(x);
      asin = v.outputUnit === 'deg' ? core.formatNumber(core.rad2deg(asinR), 6) + '&#176;' : core.formatNumber(asinR, 6) + ' rad';
      acos = v.outputUnit === 'deg' ? core.formatNumber(core.rad2deg(acosR), 6) + '&#176;' : core.formatNumber(acosR, 6) + ' rad';
    }
    var atanR = Math.atan(x);
    var atan = v.outputUnit === 'deg' ? core.formatNumber(core.rad2deg(atanR), 6) + '&#176;' : core.formatNumber(atanR, 6) + ' rad';
    var out = {};
    out['arcsin(' + x + ')'] = asin;
    out['arccos(' + x + ')'] = acos;
    out['arctan(' + x + ')'] = atan;
    return out;
  }
});

// === LAW OF SINES ===

R('law-of-sines', {
  title: 'Law of Sines Calculator',
  description: 'Solve a triangle using the Law of Sines: a/sin(A) = b/sin(B) = c/sin(C).',
  tags: ['law of sines', 'triangle', 'solve', 'trigonometry'],
  fields: [
    { id: 'mode', label: 'Given', type: 'select', options: [
      { value: 'AAS', label: 'Two angles and a side (AAS)' },
      { value: 'ASA', label: 'Two angles and included side (ASA)' },
      { value: 'SAS', label: 'Two sides and an angle (SAS)' },
    ]},
    { id: 'a', label: 'Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'b', label: 'Side b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7', half: true },
    { id: 'A', label: 'Angle A (degrees)', type: 'number', step: 0.1, min: 0.1, max: 179.9, placeholder: 'e.g. 30', half: true },
    { id: 'B', label: 'Angle B (degrees)', type: 'number', step: 0.1, min: 0.1, max: 179.9, placeholder: 'e.g. 45', half: true },
  ],
  formula: '<p><code>a/sin(A) = b/sin(B) = c/sin(C)</code></p>',
  calculate: function(v) {
    const A = core.deg2rad(v.A), B = core.deg2rad(v.B);
    var a = v.a, b = v.b, c, C, area;
    // Third angle
    C = Math.PI - A - B;
    if (C <= 0) return { error: 'Angles sum to &#8805; 180&#176;. Invalid triangle.' };
    // Third side via law of sines
    c = a * Math.sin(C) / Math.sin(A);
    area = 0.5 * a * b * Math.sin(C);
    return {
      'Angle C': core.formatNumber(core.rad2deg(C), 2) + '&#176;',
      'Side c': core.formatNumber(c, 4),
      'Area': core.formatNumber(area, 4),
      'a/sin(A)': core.formatNumber(a / Math.sin(A), 4),
      'b/sin(B)': core.formatNumber(b / Math.sin(B), 4),
      'c/sin(C)': core.formatNumber(c / Math.sin(C), 4),
    };
  }
});

// === LAW OF COSINES ===

R('law-of-cosines', {
  title: 'Law of Cosines Calculator',
  description: 'Solve a triangle using the Law of Cosines: c&#178; = a&#178; + b&#178; &#8722; 2ab cos(C).',
  tags: ['law of cosines', 'triangle', 'SAS', 'SSS'],
  fields: [
    { id: 'mode', label: 'Given', type: 'select', options: [
      { value: 'SAS', label: 'Two sides and included angle (SAS)' },
      { value: 'SSS', label: 'Three sides (SSS)' },
    ]},
    { id: 'a', label: 'Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'b', label: 'Side b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7', half: true },
    { id: 'c', label: 'Side c', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 8', half: true },
    { id: 'C', label: 'Angle C (degrees)', type: 'number', step: 0.1, min: 0.1, max: 179.9, placeholder: 'e.g. 60', half: true },
  ],
  formula: '<p><code>c&#178; = a&#178; + b&#178; &#8722; 2ab&#8226;cos(C)</code> and <code>cos(C) = (a&#178; + b&#178; &#8722; c&#178;) / (2ab)</code></p>',
  calculate: function(v) {
    const a = v.a, b = v.b;
    var c, A, B, C, area;
    if (v.mode === 'SAS') {
      C = core.deg2rad(v.C);
      c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C));
      A = Math.acos((b * b + c * c - a * a) / (2 * b * c));
      B = Math.PI - A - C;
    } else {
      c = v.c;
      C = Math.acos((a * a + b * b - c * c) / (2 * a * b));
      A = Math.acos((b * b + c * c - a * a) / (2 * b * c));
      B = Math.PI - A - C;
    }
    area = 0.5 * a * b * Math.sin(C);
    return {
      'Angle A': core.formatNumber(core.rad2deg(A), 2) + '&#176;',
      'Angle B': core.formatNumber(core.rad2deg(B), 2) + '&#176;',
      'Angle C': core.formatNumber(core.rad2deg(C), 2) + '&#176;',
      'Side c': core.formatNumber(c, 4),
      'Area': core.formatNumber(area, 4),
    };
  }
});

// === RIGHT TRIANGLE ===

R('right-triangle', {
  title: 'Right Triangle Solver',
  description: 'Solve a right triangle given two known values.',
  tags: ['right triangle', 'Pythagorean', 'solve', 'trigonometry'],
  fields: [
    { id: 'a', label: 'Side a (leg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'b', label: 'Side b (leg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'c', label: 'Side c (hypotenuse)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'A', label: 'Angle A (degrees)', type: 'number', step: 0.1, min: 0.1, max: 89.9, placeholder: 'e.g. 36.87', half: true },
  ],
  formula: '<p>Use Pythagorean theorem and trig ratios. Provide at least 2 values.</p>',
  calculate: function(v) {
    var a = v.a, b = v.b, c = v.c, A = v.A;
    // Solve missing values
    if (!c && a && b) c = Math.sqrt(a * a + b * b);
    else if (!a && b && c) a = Math.sqrt(c * c - b * b);
    else if (!b && a && c) b = Math.sqrt(c * c - a * a);
    if (a && c && !A) A = core.rad2deg(Math.asin(a / c));
    const B = 90 - A;
    const area = 0.5 * a * b;
    const perimeter = a + b + c;
    return {
      'Side a': core.formatNumber(a, 4),
      'Side b': core.formatNumber(b, 4),
      'Hypotenuse c': core.formatNumber(c, 4),
      'Angle A': core.formatNumber(A, 2) + '&#176;',
      'Angle B': core.formatNumber(B, 2) + '&#176;',
      'Area': core.formatNumber(area, 4),
      'Perimeter': core.formatNumber(perimeter, 4),
    };
  }
});

// === UNIT CIRCLE ===

R('unit-circle', {
  title: 'Unit Circle Calculator',
  description: 'Find coordinates and trig values for any angle on the unit circle.',
  tags: ['unit circle', 'coordinates', 'trigonometric', 'angle'],
  fields: [
    { id: 'angle', label: 'Angle', type: 'number', step: 0.01, placeholder: 'e.g. 45' },
    { id: 'unit', label: 'Unit', type: 'select', options: [
      { value: 'deg', label: 'Degrees' },
      { value: 'rad', label: 'Radians' },
    ]},
  ],
  formula: '<p>On the unit circle: x = cos(&theta;), y = sin(&theta;), r = 1</p>',
  calculate: function(v) {
    const rad = v.unit === 'deg' ? core.deg2rad(v.angle) : v.angle;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const tan = Math.abs(cos) < 1e-10 ? 'undefined' : core.formatNumber(Math.tan(rad), 6);
    const cot = Math.abs(sin) < 1e-10 ? 'undefined' : core.formatNumber(1 / Math.tan(rad), 6);
    const sec = Math.abs(cos) < 1e-10 ? 'undefined' : core.formatNumber(1 / cos, 6);
    const csc = Math.abs(sin) < 1e-10 ? 'undefined' : core.formatNumber(1 / sin, 6);
    const quad = (rad % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    var quadrant = quad < Math.PI / 2 ? 'I' : quad < Math.PI ? 'II' : quad < 3 * Math.PI / 2 ? 'III' : 'IV';
    return {
      'Coordinates': '(' + core.formatNumber(cos, 6) + ', ' + core.formatNumber(sin, 6) + ')',
      'sin(&theta;)': core.formatNumber(sin, 6),
      'cos(&theta;)': core.formatNumber(cos, 6),
      'tan(&theta;)': tan,
      'cot(&theta;)': cot,
      'sec(&theta;)': sec,
      'csc(&theta;)': csc,
      'Quadrant': quadrant,
    };
  }
});

// === HYPERBOLIC ===

R('hyperbolic', {
  title: 'Hyperbolic Functions Calculator',
  description: 'Calculate sinh, cosh, tanh, and their inverses.',
  tags: ['hyperbolic', 'sinh', 'cosh', 'tanh', 'functions'],
  fields: [
    { id: 'x', label: 'x', type: 'number', step: 0.01, placeholder: 'e.g. 1' },
  ],
  formula: '<p><code>sinh(x) = (e&#184; &#8722; e&#8722;&#184;)/2</code>, <code>cosh(x) = (e&#184; + e&#8722;&#184;)/2</code>, <code>tanh(x) = sinh(x)/cosh(x)</code></p>',
  calculate: function(v) {
    const x = v.x;
    const sinh = Math.sinh(x);
    const cosh = Math.cosh(x);
    const tanh = Math.tanh(x);
    const asinh = Math.asinh(x);
    var acosh = x >= 1 ? Math.acosh(x) : 'undefined (x &#8805; 1 required)';
    var atanh = Math.abs(x) < 1 ? Math.atanh(x) : 'undefined (|x| < 1 required)';
    var out = {};
    out['sinh(' + x + ')'] = core.formatNumber(sinh, 6);
    out['cosh(' + x + ')'] = core.formatNumber(cosh, 6);
    out['tanh(' + x + ')'] = core.formatNumber(tanh, 6);
    out['arcsinh(' + x + ')'] = core.formatNumber(asinh, 6);
    out['arccosh(' + x + ')'] = typeof acosh === 'string' ? acosh : core.formatNumber(acosh, 6);
    out['arctanh(' + x + ')'] = typeof atanh === 'string' ? atanh : core.formatNumber(atanh, 6);
    return out;
  }
});

// === TRIGONOMETRIC FUNCTIONS (alias for sin-cos-tan) ===

R('trigonometricfunctions', {
  title: 'Trigonometric Functions Calculator',
  description: 'Calculate sine, cosine, and tangent for any angle.',
  tags: ['sin', 'cos', 'tan', 'trigonometric', 'angle'],
  fields: [
    { id: 'angle', label: 'Angle', type: 'number', step: 0.01, placeholder: 'e.g. 45' },
    { id: 'unit', label: 'Unit', type: 'select', options: [
      { value: 'deg', label: 'Degrees' },
      { value: 'rad', label: 'Radians' },
    ]},
  ],
  formula: '<p>sin(&theta;), cos(&theta;), tan(&theta;) for the given angle.</p>',
  calculate: function(v) {
    const rad = v.unit === 'deg' ? core.deg2rad(v.angle) : v.angle;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const tan = Math.abs(cos) < 1e-10 ? 'undefined' : core.formatNumber(Math.tan(rad), 6);
    var out = {};
    out['sin(' + v.angle + ')'] = core.formatNumber(sin, 6);
    out['cos(' + v.angle + ')'] = core.formatNumber(cos, 6);
    out['tan(' + v.angle + ')'] = tan;
    return out;
  }
});

// === TRIGONOMETRIC FUNCTIONS PI (radians) ===

R('trigonometricfunctions-pi', {
  title: 'Trigonometric Functions Calculator f(&pi;)',
  description: 'Calculate trig functions for angles expressed as multiples of &pi;.',
  tags: ['sin', 'cos', 'tan', 'pi', 'radians', 'trigonometric'],
  fields: [
    { id: 'numerator', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'denominator', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  formula: '<p>Angle = (numerator/denominator) &pi; radians.</p>',
  calculate: function(v) {
    const angle = (v.numerator / v.denominator) * Math.PI;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const tan = Math.abs(cos) < 1e-10 ? 'undefined' : core.formatNumber(Math.tan(angle), 6);
    return {
      'Angle': '(' + v.numerator + '/' + v.denominator + ')&pi; = ' + core.formatNumber(angle, 6) + ' rad',
      'sin': core.formatNumber(sin, 6),
      'cos': core.formatNumber(cos, 6),
      'tan': tan,
    };
  }
});

// === INVERSE TRIGONOMETRIC FUNCTIONS (alias) ===

R('inversetrigonometricfunctions', {
  title: 'Inverse Trigonometric Functions Calculator',
  description: 'Calculate arcsin, arccos, and arctan.',
  tags: ['arcsin', 'arccos', 'arctan', 'inverse', 'trigonometric'],
  fields: [
    { id: 'value', label: 'Value', type: 'number', step: 0.0001, placeholder: 'e.g. 0.5' },
    { id: 'outputUnit', label: 'Output Unit', type: 'select', options: [
      { value: 'deg', label: 'Degrees' },
      { value: 'rad', label: 'Radians' },
    ]},
  ],
  formula: '<p>arcsin(x) &#8712; [&#8722;&#960;/2, &#960;/2], arccos(x) &#8712; [0, &#960;], arctan(x) &#8712; (&#8722;&#960;/2, &#960;/2)</p>',
  calculate: function(v) {
    const x = v.value;
    var asin, acos;
    if (x < -1 || x > 1) {
      asin = 'undefined (|x| &#8804; 1 required)';
      acos = 'undefined (|x| &#8804; 1 required)';
    } else {
      var asinR = Math.asin(x), acosR = Math.acos(x);
      asin = v.outputUnit === 'deg' ? core.formatNumber(core.rad2deg(asinR), 6) + '&#176;' : core.formatNumber(asinR, 6) + ' rad';
      acos = v.outputUnit === 'deg' ? core.formatNumber(core.rad2deg(acosR), 6) + '&#176;' : core.formatNumber(acosR, 6) + ' rad';
    }
    var atanR = Math.atan(x);
    var atan = v.outputUnit === 'deg' ? core.formatNumber(core.rad2deg(atanR), 6) + '&#176;' : core.formatNumber(atanR, 6) + ' rad';
    var out = {};
    out['arcsin(' + x + ')'] = asin;
    out['arccos(' + x + ')'] = acos;
    out['arctan(' + x + ')'] = atan;
    return out;
  }
});

// === GRAPHS: TRIGONOMETRIC FUNCTIONS ===

R('graphs-trigonometricfunctions', {
  title: 'Trigonometric Function Graphs F(x)',
  description: 'Reference table of trigonometric function values for common angles.',
  tags: ['graphs', 'trigonometric', 'reference', 'table'],
  fields: [],
  formula: '<p>Values of sin, cos, tan for common angles in degrees.</p>',
  calculate: function() {
    var angles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 270, 360];
    var html = '<table><tr><th>Angle (&#176;)</th><th>sin</th><th>cos</th><th>tan</th></tr>';
    angles.forEach(function(a) {
      var r = core.deg2rad(a);
      var s = Math.sin(r), c = Math.cos(r);
      var t = Math.abs(c) < 1e-10 ? '&#8734;' : core.formatNumber(Math.tan(r), 4);
      html += '<tr><td>' + a + '</td><td>' + core.formatNumber(s, 4) + '</td><td>' + core.formatNumber(c, 4) + '</td><td>' + t + '</td></tr>';
    });
    html += '</table>';
    return { html };
  }
});

// === GRAPHS: TRIGONOMETRIC FUNCTIONS PI ===

R('graphs-trigonometricfunctions-pi', {
  title: 'Trigonometric Function Graphs F(&pi;)',
  description: 'Reference table of trigonometric function values in radians (&pi; notation).',
  tags: ['graphs', 'trigonometric', 'pi', 'radians', 'reference'],
  fields: [],
  formula: '<p>Values of sin, cos, tan for common angles expressed as multiples of &pi;.</p>',
  calculate: function() {
    var entries = [
      { label: '0', val: 0 },
      { label: '&pi;/6', val: Math.PI / 6 },
      { label: '&pi;/4', val: Math.PI / 4 },
      { label: '&pi;/3', val: Math.PI / 3 },
      { label: '&pi;/2', val: Math.PI / 2 },
      { label: '2&pi;/3', val: 2 * Math.PI / 3 },
      { label: '3&pi;/4', val: 3 * Math.PI / 4 },
      { label: '5&pi;/6', val: 5 * Math.PI / 6 },
      { label: '&pi;', val: Math.PI },
      { label: '3&pi;/2', val: 3 * Math.PI / 2 },
      { label: '2&pi;', val: 2 * Math.PI },
    ];
    var html = '<table><tr><th>Angle</th><th>sin</th><th>cos</th><th>tan</th></tr>';
    entries.forEach(function(e) {
      var s = Math.sin(e.val), c = Math.cos(e.val);
      var t = Math.abs(c) < 1e-10 ? '&#8734;' : core.formatNumber(Math.tan(e.val), 4);
      html += '<tr><td>' + e.label + '</td><td>' + core.formatNumber(s, 4) + '</td><td>' + core.formatNumber(c, 4) + '</td><td>' + t + '</td></tr>';
    });
    html += '</table>';
    return { html };
  }
});

// === GRAPHS: INVERSE FUNCTIONS ===

R('graphs-inversefunctions', {
  title: 'Inverse Trigonometric Function Graphs',
  description: 'Reference values for arcsin, arccos, and arctan.',
  tags: ['graphs', 'inverse', 'arcsin', 'arccos', 'arctan', 'reference'],
  fields: [],
  formula: '<p>Reference values for inverse trigonometric functions.</p>',
  calculate: function() {
    var entries = [
      { x: 0, asin: true, acos: true, atan: true },
      { x: 0.5, asin: true, acos: true, atan: true },
      { x: Math.SQRT1_2, asin: true, acos: true, atan: true },
      { x: Math.sqrt(3) / 2, asin: true, acos: true, atan: true },
      { x: 1, asin: true, acos: true, atan: true },
    ];
    var html = '<table><tr><th>x</th><th>arcsin(x)</th><th>arccos(x)</th><th>arctan(x)</th></tr>';
    entries.forEach(function(e) {
      var a = core.formatNumber(core.rad2deg(Math.asin(e.x)), 2) + '&#176;';
      var b = core.formatNumber(core.rad2deg(Math.acos(e.x)), 2) + '&#176;';
      var c = core.formatNumber(core.rad2deg(Math.atan(e.x)), 2) + '&#176;';
      html += '<tr><td>' + core.formatNumber(e.x, 4) + '</td><td>' + a + '</td><td>' + b + '</td><td>' + c + '</td></tr>';
    });
    html += '</table>';
    return { html };
  }
});

// === TRIGONOMETRIC RATIOS ===

R('trigonometricratios', {
  title: 'Trigonometric Ratios Calculator',
  description: 'Calculate all six trig ratios from the sides of a right triangle.',
  tags: ['trigonometric ratios', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc'],
  fields: [
    { id: 'opp', label: 'Opposite', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'adj', label: 'Adjacent', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'hyp', label: 'Hypotenuse', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p>sin = opp/hyp, cos = adj/hyp, tan = opp/adj, cot = adj/opp, sec = hyp/adj, csc = hyp/opp. Provide any 2 sides.</p>',
  calculate: function(v) {
    var opp = v.opp, adj = v.adj, hyp = v.hyp;
    if (!hyp && opp && adj) hyp = Math.sqrt(opp * opp + adj * adj);
    else if (!opp && adj && hyp) opp = Math.sqrt(hyp * hyp - adj * adj);
    else if (!adj && opp && hyp) adj = Math.sqrt(hyp * hyp - opp * opp);
    else return { error: 'Provide at least 2 of the 3 sides.' };
    return {
      'sin': core.formatNumber(opp / hyp, 6),
      'cos': core.formatNumber(adj / hyp, 6),
      'tan': core.formatNumber(opp / adj, 6),
      'cot': core.formatNumber(adj / opp, 6),
      'sec': core.formatNumber(hyp / adj, 6),
      'csc': core.formatNumber(hyp / opp, 6),
      'Hypotenuse': core.formatNumber(hyp, 4),
    };
  }
});

})(calculatorRegistry);
