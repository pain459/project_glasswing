// Algebra calculators
(function(reg) {
const R = reg.register.bind(reg, 'algebra');

// === QUADRATIC & CUBIC EQUATIONS ===

R('quadratic-formula-calculator', {
  title: 'Quadratic Formula Calculator',
  description: 'Solve quadratic equations of the form ax² + bx + c = 0.',
  tags: ['quadratic', 'formula', 'polynomial', 'equation', 'roots'],
  fields: [
    { id: 'a', label: 'Coefficient a', type: 'number', step: 0.01, placeholder: 'e.g. 1' },
    { id: 'b', label: 'Coefficient b', type: 'number', step: 0.01, placeholder: 'e.g. -5' },
    { id: 'c', label: 'Coefficient c', type: 'number', step: 0.01, placeholder: 'e.g. 6' },
  ],
  formula: '<p><code>x = (−b ± √(b² − 4ac)) / 2a</code> where the discriminant <code>D = b² − 4ac</code> determines the nature of the roots.</p>',
  background: '<p>The quadratic formula solves any second-degree equation in one variable, giving both roots at once and revealing through the discriminant whether they are real, repeated or complex. It appears throughout school algebra, projectile motion and optimisation, and it works because completing the square on the general equation produces a perfect square whose root isolates the unknown. A negative discriminant means the parabola never crosses the axis, so the roots are complex conjugates.</p>',
  calculate: function(v) {
    const a = v.a, b = v.b, c = v.c;
    if (!a) return { error: 'Coefficient a cannot be zero for a quadratic equation.' };
    const result = core.quadratic(a, b, c);
    const D = b * b - 4 * a * c;
    const out = {
      'Discriminant (D)': core.formatNumber(D, 4),
    };
    if (result.type === 'two-real') {
      out['Root 1 (x₁)'] = core.formatNumber(result.x1, 6);
      out['Root 2 (x₂)'] = core.formatNumber(result.x2, 6);
      out['Root Type'] = 'Two distinct real roots';
    } else if (result.type === 'one-real') {
      out['Root (x)'] = core.formatNumber(result.x1, 6);
      out['Root Type'] = 'One repeated real root';
    } else {
      const real = -b / (2 * a);
      const imag = Math.sqrt(Math.abs(D)) / (2 * a);
      out['Root 1'] = core.formatNumber(real, 6) + ' + ' + core.formatNumber(imag, 6) + 'i';
      out['Root 2'] = core.formatNumber(real, 6) + ' − ' + core.formatNumber(imag, 6) + 'i';
      out['Root Type'] = 'Two complex conjugate roots';
    }
    return out;
  }
});

R('cubicequation', {
  title: 'Cubic Equation Calculator',
  description: 'Solve cubic equations of the form ax³ + bx² + cx + d = 0.',
  tags: ['cubic', 'polynomial', 'equation', 'third-order', 'roots'],
  fields: [
    { id: 'a', label: 'Coefficient a', type: 'number', step: 0.01, placeholder: 'e.g. 1' },
    { id: 'b', label: 'Coefficient b', type: 'number', step: 0.01, placeholder: 'e.g. -6' },
    { id: 'c', label: 'Coefficient c', type: 'number', step: 0.01, placeholder: 'e.g. 11' },
    { id: 'd', label: 'Coefficient d', type: 'number', step: 0.01, placeholder: 'e.g. -6' },
  ],
  formula: '<p>Solves <code>ax³ + bx² + cx + d = 0</code> using Cardano\'s method. Returns up to three real roots.</p>',
  background: '<p>A cubic equation has a highest power of three and, over the real numbers, always has at least one real root because its curve must cross the horizontal axis. Cubic models appear in volume problems, beam deflection and animation easing, and Cardano\'s method reduces the equation to a simpler depressed cubic before extracting roots. Every real cubic factors into a linear term and a quadratic, which is why up to three real roots are possible.</p>',
  calculate: function(v) {
    const a = v.a, b = v.b, c = v.c, d = v.d;
    if (!a) return { error: 'Coefficient a cannot be zero for a cubic equation.' };
    const result = core.cubic(a, b, c, d);
    const out = {};
    if (result.roots) {
      result.roots.forEach(function(r, i) {
        out['Real Root x' + (i + 1)] = core.formatNumber(r, 6);
      });
      out['Number of Real Roots'] = result.roots.length;
    } else {
      out['Result'] = result.message || 'No real roots found';
    }
    return out;
  }
});

R('completing-the-square-calculator', {
  title: 'Completing the Square Calculator',
  description: 'Rewrite a quadratic expression by completing the square.',
  tags: ['completing', 'square', 'quadratic', 'vertex', 'form'],
  fields: [
    { id: 'a', label: 'Coefficient a', type: 'number', step: 0.01, placeholder: 'e.g. 1' },
    { id: 'b', label: 'Coefficient b', type: 'number', step: 0.01, placeholder: 'e.g. 6' },
    { id: 'c', label: 'Coefficient c', type: 'number', step: 0.01, placeholder: 'e.g. 2' },
  ],
  formula: '<p>Transforms <code>ax² + bx + c</code> into vertex form <code>a(x − h)² + k</code> where h = −b/(2a) and k = c − b²/(4a).</p>',
  background: '<p>Completing the square rewrites a quadratic so the variable appears only once, inside a squared bracket, which exposes the vertex of its parabola and makes the equation easy to solve. It is the derivation behind the quadratic formula and is used to convert circle equations into standard form. The method works because adding and subtracting the same square leaves the expression unchanged while creating a perfect square.</p>',
  calculate: function(v) {
    const a = v.a, b = v.b, c = v.c;
    if (!a) return { error: 'Coefficient a cannot be zero.' };
    const h = -b / (2 * a);
    const k = c - (b * b) / (4 * a);
    const D = b * b - 4 * a * c;
    let steps = '';
    steps += '<p>Given: ' + core.formatNumber(a, 2) + 'x² + ' + core.formatNumber(b, 2) + 'x + ' + core.formatNumber(c, 2) + '</p>';
    steps += '<p>Factor out a: ' + core.formatNumber(a, 2) + '(x² + ' + core.formatNumber(b / a, 4) + 'x) + ' + core.formatNumber(c, 2) + '</p>';
    steps += '<p>Half of b/a: ' + core.formatNumber(h, 4) + '</p>';
    steps += '<p>Square it: ' + core.formatNumber(h * h, 4) + '</p>';
    steps += '<p>Vertex form: ' + core.formatNumber(a, 2) + '(x − (' + core.formatNumber(h, 4) + '))² + ' + core.formatNumber(k, 4) + '</p>';
    return {
      html: '<h3>Vertex Form</h3>' + steps +
        '<p><strong>Vertex:</strong> (' + core.formatNumber(h, 4) + ', ' + core.formatNumber(k, 4) + ')</p>' +
        '<p><strong>Axis of Symmetry:</strong> x = ' + core.formatNumber(h, 4) + '</p>' +
        '<p><strong>Discriminant:</strong> ' + core.formatNumber(D, 4) + '</p>' +
        '<p><strong>Direction:</strong> ' + (a > 0 ? 'Opens upward (minimum)' : 'Opens downward (maximum)') + '</p>'
    };
  }
});

// === EXPONENTS ===

R('exponent', {
  title: 'Exponents Calculator',
  description: 'Calculate the result of a base raised to an exponent.',
  tags: ['exponent', 'power', 'raise', 'base'],
  fields: [
    { id: 'base', label: 'Base', type: 'number', step: 0.01, placeholder: 'e.g. 2' },
    { id: 'exp', label: 'Exponent', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>base^exponent</code> — raises the base to the given power.</p>',
  background: '<p>An exponent records repeated multiplication, so a power is shorthand for multiplying the base by itself the stated number of times. Powers appear in compound interest, scientific notation, memory sizes and polynomial algebra, and the exponent laws follow from counting factors. Negative and zero exponents extend the pattern consistently: a negative power means a reciprocal, and any nonzero base to the zero power is one.</p>',
  calculate: function(v) {
    const base = v.base, exp = v.exp;
    if (base === 0 && exp <= 0) return { error: '0 raised to a non-positive power is undefined.' };
    const result = Math.pow(base, exp);
    if (!isFinite(result)) return { error: 'Result is too large or undefined.' };
    return {
      'Result': core.formatNumber(result, 10),
      'Expression': core.formatNumber(base, 4) + '^' + core.formatNumber(exp, 4) + ' = ' + core.formatNumber(result, 10),
    };
  }
});

R('large-exponent-calculator', {
  title: 'Large Exponents Calculator',
  description: 'Calculate very large exponents and display the result in scientific notation.',
  tags: ['large', 'exponent', 'scientific', 'notation', 'big'],
  fields: [
    { id: 'base', label: 'Base', type: 'number', step: 0.01, placeholder: 'e.g. 2' },
    { id: 'exp', label: 'Exponent', type: 'number', step: 1, placeholder: 'e.g. 1000' },
  ],
  formula: '<p>Computes <code>base^exponent</code> even for very large values, showing the result in scientific notation.</p>',
  background: '<p>Very large powers grow explosively and quickly exceed the range where ordinary decimal notation is readable, so scientific notation keeps the leading digits and the scale separate. Such values arise in cryptography, combinatorics and algorithm analysis, where the exponent often dominates the outcome. Floating-point arithmetic rounds the result, so the final digits shown are approximate rather than exact integers.</p>',
  calculate: function(v) {
    const base = v.base, exp = v.exp;
    if (base === 0 && exp <= 0) return { error: '0 raised to a non-positive power is undefined.' };
    const result = Math.pow(base, exp);
    if (!isFinite(result)) {
      return {
        'Result': 'Infinity (too large to represent)',
        'Scientific Notation': '∞',
        'Digits (approx.)': 'Too large',
      };
    }
    const sci = result.toExponential(10);
    const digits = Math.ceil(Math.log10(Math.abs(result))) + 1;
    return {
      'Result': core.formatNumber(result, 10),
      'Scientific Notation': sci,
      'Number of Digits': digits,
    };
  }
});

R('exponentsolve', {
  title: 'Solve for Exponents Calculator',
  description: 'Find the unknown exponent in an equation of the form base^x = result.',
  tags: ['solve', 'exponent', 'unknown', 'logarithm'],
  fields: [
    { id: 'base', label: 'Base', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 2' },
    { id: 'result', label: 'Result', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1024' },
  ],
  formula: '<p>Solves <code>base^x = result</code> for x using logarithms: <code>x = log(result) / log(base)</code></p>',
  background: '<p>Solving for an unknown exponent means asking how many times a base must be multiplied by itself to reach a target, which logarithms answer directly because they undo exponentiation. This appears in compound-interest doubling times, radioactive decay and learning-rate schedules. The base must be positive and different from one, and the target must be positive for a real solution.</p>',
  calculate: function(v) {
    const base = v.base, result = v.result;
    if (base <= 0 || base === 1) return { error: 'Base must be positive and not equal to 1.' };
    if (result <= 0) return { error: 'Result must be positive.' };
    const x = Math.log(result) / Math.log(base);
    return {
      'Exponent (x)': core.formatNumber(x, 8),
      'Verification': core.formatNumber(base, 4) + '^' + core.formatNumber(x, 8) + ' = ' + core.formatNumber(Math.pow(base, x), 8),
      'Expression': core.formatNumber(base, 4) + '^' + core.formatNumber(x, 8) + ' = ' + core.formatNumber(result, 4),
    };
  }
});

R('exponent-fractions', {
  title: 'Fraction Exponents Calculator',
  description: 'Calculate expressions with fractional exponents like 8^(2/3).',
  tags: ['fraction', 'exponent', 'rational', 'power', 'root'],
  fields: [
    { id: 'base', label: 'Base', type: 'number', step: 0.01, placeholder: 'e.g. 8' },
    { id: 'num', label: 'Numerator of exponent', type: 'number', step: 1, placeholder: 'e.g. 2' },
    { id: 'den', label: 'Denominator of exponent', type: 'number', step: 1, min: 1, placeholder: 'e.g. 3' },
  ],
  formula: '<p><code>base^(numerator/denominator) = (base^(1/denominator))^numerator</code> — equivalent to taking the denominator-th root, then raising to the numerator power.</p>',
  background: '<p>A fractional exponent combines a root and a power: the denominator selects which root to take and the numerator says how many times to multiply the result. This notation appears when simplifying radicals and in formulas for area, growth and scaling. It works because raising a power to a power multiplies the exponents, so the root and the power can be applied in a predictable order.</p>',
  calculate: function(v) {
    const base = v.base, num = v.num, den = v.den;
    if (!den) return { error: 'Denominator cannot be zero.' };
    const fracExp = num / den;
    const result = Math.pow(base, fracExp);
    if (!isFinite(result)) return { error: 'Result is undefined or too large.' };
    const root = Math.pow(base, 1 / den);
    var out = {
      'Result': core.formatNumber(result, 8),
      'Fractional Exponent': num + '/' + den + ' = ' + core.formatNumber(fracExp, 6),
      'Expression': core.formatNumber(base, 4) + '^(' + num + '/' + den + ') = ' + core.formatNumber(result, 8),
    };
    out['Step 1 (' + den + 'th root of ' + base + ')'] = core.formatNumber(root, 8);
    out['Step 2 (raise to power ' + num + ')'] = core.formatNumber(Math.pow(root, num), 8);
    return out;
  }
});

// === ROOTS ===

R('squareroots', {
  title: 'Square Roots Calculator',
  description: 'Calculate the square root of a number.',
  tags: ['square', 'root', 'sqrt'],
  fields: [
    { id: 'number', label: 'Number', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 144' },
  ],
  formula: '<p><code>√n</code> — the non-negative number which, when squared, gives n.</p>',
  background: '<p>The square root asks which side length would give a particular area, so it undoes squaring and is defined as the non-negative answer by convention. Roots appear in the Pythagorean theorem, standard deviation and distance formulas, and every positive number has two square roots differing only in sign. Negative numbers have no real square root, which is why complex numbers were introduced.</p>',
  calculate: function(v) {
    const n = v.number;
    if (n < 0) return { error: 'Cannot take the square root of a negative number (in real numbers).' };
    const r = Math.sqrt(n);
    const isPerfect = Number.isInteger(r);
    return {
      'Square Root': core.formatNumber(r, 10),
      'Verification': core.formatNumber(r, 10) + '² = ' + core.formatNumber(r * r, 10),
      'Perfect Square': isPerfect ? 'Yes' : 'No',
    };
  }
});

R('cuberoots', {
  title: 'Cube Root Calculator',
  description: 'Calculate the cube root of a number.',
  tags: ['cube', 'root', 'third', 'root'],
  fields: [
    { id: 'number', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 27' },
  ],
  formula: '<p><code>∛n</code> — the number which, when cubed, gives n.</p>',
  background: '<p>A cube root undoes cubing by finding the edge of a cube with a given volume and, unlike a square root, is defined for negative numbers too. Cube roots appear in volume scaling, density problems and the solution of cubic equations. The real cube root is unique, while complex analysis reveals two additional complex roots.</p>',
  calculate: function(v) {
    const n = v.number;
    const r = Math.cbrt(n);
    return {
      'Cube Root': core.formatNumber(r, 10),
      'Verification': core.formatNumber(r, 10) + '³ = ' + core.formatNumber(r * r * r, 10),
    };
  }
});

R('fourthroots', {
  title: 'Fourth Roots Calculator',
  description: 'Calculate the fourth root of a number.',
  tags: ['fourth', 'root', 'quartic'],
  fields: [
    { id: 'number', label: 'Number', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 81' },
  ],
  formula: '<p><code>n^(1/4)</code> — the number which, when raised to the 4th power, gives n.</p>',
  background: '<p>A fourth root is the number that produces the original value when multiplied by itself four times, equivalent to taking a square root twice. It appears in fourth-power scaling laws, variance calculations and some geometry problems. Even roots of negative numbers are not real, and positive inputs always have a positive and a negative real fourth root.</p>',
  calculate: function(v) {
    const n = v.number;
    if (n < 0) return { error: 'Cannot take the fourth root of a negative number (in real numbers).' };
    const r = Math.pow(n, 0.25);
    return {
      'Fourth Root': core.formatNumber(r, 10),
      'Verification': core.formatNumber(r, 10) + '⁴ = ' + core.formatNumber(Math.pow(r, 4), 10),
    };
  }
});

R('fifthroots', {
  title: 'Fifth Roots Calculator',
  description: 'Calculate the fifth root of a number.',
  tags: ['fifth', 'root'],
  fields: [
    { id: 'number', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 32' },
  ],
  formula: '<p><code>n^(1/5)</code> — the number which, when raised to the 5th power, gives n.</p>',
  background: '<p>A fifth root reverses raising a number to the fifth power and, like other odd roots, is defined for negative inputs as well as positive ones. Odd roots appear in volume and scaling relationships and in solving higher-degree equations. Each real number has exactly one real fifth root, with the remaining roots complex.</p>',
  calculate: function(v) {
    const n = v.number;
    const r = Math.pow(n, 0.2);
    return {
      'Fifth Root': core.formatNumber(r, 10),
      'Verification': core.formatNumber(r, 10) + '⁵ = ' + core.formatNumber(Math.pow(r, 5), 10),
    };
  }
});

R('radical', {
  title: 'Radicals and Roots Calculator',
  description: 'Calculate the nth root of any number.',
  tags: ['radical', 'root', 'nth', 'general'],
  fields: [
    { id: 'number', label: 'Number (radicand)', type: 'number', step: 0.01, placeholder: 'e.g. 256' },
    { id: 'index', label: 'Root Index', type: 'number', step: 1, min: 2, placeholder: 'e.g. 4' },
  ],
  formula: '<p><code>n^(1/index)</code> — the index-th root of the number.</p>',
  background: '<p>A radical expression asks for the root indicated by its index, generalising square and cube roots to any degree. Arbitrary roots appear in compound growth, geometry and numerical methods, and they can always be rewritten as fractional powers so the exponent laws apply. Even indices require a non-negative radicand for a real result, while odd indices accept any real number.</p>',
  calculate: function(v) {
    const n = v.number, idx = v.index;
    if (!idx || idx < 2) return { error: 'Root index must be at least 2.' };
    if (n < 0 && idx % 2 === 0) return { error: 'Cannot take an even root of a negative number.' };
    const r = Math.pow(Math.abs(n), 1 / idx);
    const sign = (n < 0 && idx % 2 !== 0) ? -1 : 1;
    const result = sign * r;
    var out = {};
    out[idx + 'th Root'] = core.formatNumber(result, 10);
    out['Verification'] = core.formatNumber(result, 10) + '^' + idx + ' = ' + core.formatNumber(Math.pow(result, idx), 10);
    return out;
  }
});

// === SQUARES & CUBES ===

R('square-calculator', {
  title: 'Square Calculator',
  description: 'Find the square of a number.',
  tags: ['square', 'squared', 'power-2'],
  fields: [
    { id: 'number', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 12' },
  ],
  formula: '<p><code>n² = n × n</code></p>',
  background: '<p>Squaring a number means multiplying it by itself, producing the area of a square with that side length. It is one of the most common operations in algebra, statistics and geometry, and it always yields a non-negative result for real inputs. Squaring is not one-to-one, since a number and its negative share the same square, which is why solving by square root requires a plus-or-minus.</p>',
  calculate: function(v) {
    const n = v.number;
    return {
      'Square': core.formatNumber(n * n, 10),
      'Expression': core.formatNumber(n, 4) + '² = ' + core.formatNumber(n * n, 10),
    };
  }
});

R('cube-calculator', {
  title: 'Cube Calculator',
  description: 'Find the cube of a number.',
  tags: ['cube', 'cubed', 'power-3'],
  fields: [
    { id: 'number', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>n³ = n × n × n</code></p>',
  background: '<p>Cubing multiplies a number by itself three times and gives the volume of a cube with that edge length. It appears in volume problems, polynomial algebra and scaling laws, and unlike squaring it preserves the sign of the input. Cubing is one-to-one over the real numbers, so it can be reversed unambiguously with a cube root.</p>',
  calculate: function(v) {
    const n = v.number;
    return {
      'Cube': core.formatNumber(n * n * n, 10),
      'Expression': core.formatNumber(n, 4) + '³ = ' + core.formatNumber(n * n * n, 10),
    };
  }
});

// === ABSOLUTE DIFFERENCE ===

R('absolute-difference-calculator', {
  title: 'Absolute Difference Calculator',
  description: 'Find the absolute difference between two numbers.',
  tags: ['absolute', 'difference', 'distance', 'gap'],
  fields: [
    { id: 'a', label: 'First Number', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
    { id: 'b', label: 'Second Number', type: 'number', step: 0.01, placeholder: 'e.g. 25' },
  ],
  formula: '<p><code>|a − b|</code> — the non-negative distance between two numbers.</p>',
  background: '<p>Absolute difference measures how far apart two numbers are on the number line without caring which is larger. It is the natural way to express tolerances, deviations and distances in data analysis and quality control. Because the order of subtraction does not matter, it behaves like a one-dimensional distance, though it is not the same as percentage difference when magnitudes vary.</p>',
  calculate: function(v) {
    const diff = Math.abs(v.a - v.b);
    return {
      'Absolute Difference': core.formatNumber(diff, 10),
      'Expression': '|' + core.formatNumber(v.a, 4) + ' − ' + core.formatNumber(v.b, 4) + '| = ' + core.formatNumber(diff, 10),
      'Raw Difference': core.formatNumber(v.a - v.b, 10),
    };
  }
});

// === DIFFERENCE OF SQUARES ===

R('difference-of-two-squares-calculator', {
  title: 'Difference of 2 Squares Calculator',
  description: 'Factor an expression of the form a² − b² into (a+b)(a−b).',
  tags: ['difference', 'squares', 'factor', 'identity'],
  fields: [
    { id: 'a', label: 'First term (a)', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
    { id: 'b', label: 'Second term (b)', type: 'number', step: 0.01, placeholder: 'e.g. 3' },
  ],
  formula: '<p><code>a² − b² = (a + b)(a − b)</code></p>',
  background: '<p>The difference of two squares is a factoring pattern that turns a subtraction of perfect squares into a pair of binomials. It appears constantly in school algebra for simplifying expressions and in mental arithmetic shortcuts such as multiplying numbers near a round value. The identity holds because the middle terms of the expansion cancel, exactly as the distributive law predicts.</p>',
  calculate: function(v) {
    const a = v.a, b = v.b;
    const a2 = a * a, b2 = b * b;
    const diff = a2 - b2;
    const sum = a + b, diffAB = a - b;
    return {
      'a²': core.formatNumber(a2, 4),
      'b²': core.formatNumber(b2, 4),
      'a² − b²': core.formatNumber(diff, 4),
      '(a + b)': core.formatNumber(sum, 4),
      '(a − b)': core.formatNumber(diffAB, 4),
      'Verification': core.formatNumber(sum, 4) + ' × ' + core.formatNumber(diffAB, 4) + ' = ' + core.formatNumber(sum * diffAB, 4),
      'Factored Form': '(' + core.formatNumber(a, 4) + ' + ' + core.formatNumber(b, 4) + ')(' + core.formatNumber(a, 4) + ' − ' + core.formatNumber(b, 4) + ')',
    };
  }
});

// === FOIL ===

R('foil-calculator', {
  title: 'FOIL Method Calculator',
  description: 'Multiply two binomials using the FOIL method step by step.',
  tags: ['FOIL', 'binomial', 'multiply', 'expand'],
  fields: [
    { id: 'a1', label: 'First binomial, coefficient of x', type: 'number', step: 0.01, placeholder: 'e.g. 1' },
    { id: 'b1', label: 'First binomial, constant term', type: 'number', step: 0.01, placeholder: 'e.g. 3' },
    { id: 'a2', label: 'Second binomial, coefficient of x', type: 'number', step: 0.01, placeholder: 'e.g. 2' },
    { id: 'b2', label: 'Second binomial, constant term', type: 'number', step: 0.01, placeholder: 'e.g. 5' },
  ],
  formula: '<p>Multiplies <code>(a₁x + b₁)(a₂x + b₂)</code> using FOIL: First, Outer, Inner, Last.</p>',
  background: '<p>FOIL is a mnemonic for multiplying two binomials by distributing every term of the first across every term of the second. It is standard in school algebra because it makes polynomial multiplication systematic, and the same distributive law underlies spreadsheet formulas and computer algebra systems. The method generalises beyond two terms, where the acronym no longer fits but distribution still applies.</p>',
  calculate: function(v) {
    const a1 = v.a1, b1 = v.b1, a2 = v.a2, b2 = v.b2;
    const first = a1 * a2;
    const outer = a1 * b2;
    const inner = b1 * a2;
    const last = b1 * b2;
    const xCoeff = outer + inner;
    let steps = '';
    steps += '<p><strong>First:</strong> ' + core.formatNumber(a1, 2) + 'x × ' + core.formatNumber(a2, 2) + 'x = ' + core.formatNumber(first, 2) + 'x²</p>';
    steps += '<p><strong>Outer:</strong> ' + core.formatNumber(a1, 2) + 'x × ' + core.formatNumber(b2, 2) + ' = ' + core.formatNumber(outer, 2) + 'x</p>';
    steps += '<p><strong>Inner:</strong> ' + core.formatNumber(b1, 2) + ' × ' + core.formatNumber(a2, 2) + 'x = ' + core.formatNumber(inner, 2) + 'x</p>';
    steps += '<p><strong>Last:</strong> ' + core.formatNumber(b1, 2) + ' × ' + core.formatNumber(b2, 2) + ' = ' + core.formatNumber(last, 2) + '</p>';
    steps += '<p><strong>Combine:</strong> ' + core.formatNumber(first, 2) + 'x² + ' + core.formatNumber(xCoeff, 2) + 'x + ' + core.formatNumber(last, 2) + '</p>';
    return {
      html: '<h3>FOIL Steps</h3>' + steps,
      'x² coefficient': core.formatNumber(first, 4),
      'x coefficient': core.formatNumber(xCoeff, 4),
      'constant term': core.formatNumber(last, 4),
    };
  }
});

// === DOT PRODUCT ===

R('dot-product-calculator', {
  title: 'Dot Product Calculator',
  description: 'Calculate the dot product of two vectors.',
  tags: ['dot', 'product', 'vector', 'scalar'],
  fields: [
    { id: 'v1', label: 'Vector 1 components (comma-separated)', type: 'text', placeholder: 'e.g. 1, 2, 3' },
    { id: 'v2', label: 'Vector 2 components (comma-separated)', type: 'text', placeholder: 'e.g. 4, 5, 6' },
  ],
  formula: '<p><code>v₁ · v₂ = Σ(v₁[i] × v₂[i])</code> — the sum of component-wise products.</p>',
  background: '<p>The dot product combines two vectors into a single number measuring how much they point in the same direction. It is used to compute work in physics, similarity in machine learning and lighting in computer graphics, and it relates to the angle between the vectors through the cosine. A zero result means the vectors are perpendicular, which is why the operation is central to projections and orthogonality.</p>',
  calculate: function(v) {
    const a = v.v1.split(/[\s,;]+/).map(Number);
    const b = v.v2.split(/[\s,;]+/).map(Number);
    if (a.length !== b.length) return { error: 'Vectors must have the same number of components.' };
    if (a.some(isNaN) || b.some(isNaN)) return { error: 'All components must be valid numbers.' };
    let dot = 0;
    let steps = '';
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      steps += core.formatNumber(a[i], 4) + ' × ' + core.formatNumber(b[i], 4) + ' = ' + core.formatNumber(a[i] * b[i], 4) + '<br>';
    }
    const magA = Math.sqrt(a.reduce(function(s, x) { return s + x * x; }, 0));
    const magB = Math.sqrt(b.reduce(function(s, x) { return s + x * x; }, 0));
    const cosTheta = (magA && magB) ? dot / (magA * magB) : 0;
    const angle = core.rad2deg(Math.acos(Math.max(-1, Math.min(1, cosTheta))));
    return {
      html: '<h3>Calculation</h3><p>' + steps + '</p><p><strong>Sum:</strong> ' + core.formatNumber(dot, 6) + '</p>',
      'Dot Product': core.formatNumber(dot, 6),
      '|v₁|': core.formatNumber(magA, 6),
      '|v₂|': core.formatNumber(magB, 6),
      'Angle (degrees)': core.formatNumber(angle, 4),
    };
  }
});

// === LOGARITHM EQUATION ===

R('logarithm-equation-calculator', {
  title: 'Logarithm Equation Calculator',
  description: 'Solve logarithmic equations of the form log_base(x) = y.',
  tags: ['logarithm', 'log', 'equation', 'solve'],
  fields: [
    { id: 'base', label: 'Logarithm Base', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10' },
    { id: 'y', label: 'Result (y)', type: 'number', step: 0.01, placeholder: 'e.g. 3' },
  ],
  formula: '<p>Solves <code>log_base(x) = y</code> for x: <code>x = base^y</code></p>',
  background: '<p>A logarithm answers what exponent produces a given value, so solving a logarithmic equation usually means rewriting it in exponential form. Logarithms appear in sound levels, earthquake magnitudes, pH and algorithm complexity, and they turn multiplication into addition. The base must be positive and not one, and the argument must be positive for a real solution.</p>',
  calculate: function(v) {
    const base = v.base, y = v.y;
    if (base <= 0 || base === 1) return { error: 'Base must be positive and not equal to 1.' };
    const x = Math.pow(base, y);
    if (!isFinite(x)) return { error: 'Result is too large.' };
    return {
      'x': core.formatNumber(x, 10),
      'Verification': 'log_' + core.formatNumber(base, 4) + '(' + core.formatNumber(x, 10) + ') = ' + core.formatNumber(Math.log(x) / Math.log(base), 6),
      'Expression': 'log_' + core.formatNumber(base, 4) + '(' + core.formatNumber(x, 10) + ') = ' + core.formatNumber(y, 4),
    };
  }
});

// === RADICALS SIMPLIFY ===

R('radicals-simplify', {
  title: 'Simplify Radical Expressions Calculator',
  description: 'Simplify a radical expression by extracting perfect square factors.',
  tags: ['simplify', 'radical', 'sqrt', 'factor'],
  fields: [
    { id: 'number', label: 'Number under the radical', type: 'number', step: 1, min: 1, placeholder: 'e.g. 72' },
    { id: 'coeff', label: 'Coefficient (outside the radical)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1', half: true },
    { id: 'index', label: 'Root Index', type: 'number', step: 1, min: 2, placeholder: 'e.g. 2', half: true },
  ],
  formula: '<p>Extracts the largest perfect factor from the radical to simplify <code>coeff × ⁿ√number</code>.</p>',
  background: '<p>Simplifying a radical pulls out the largest perfect-power factor so the expression is easier to compare, combine and compute with. It is standard practice in school algebra and matters in engineering formulas where exact surd forms are preferable to rounded decimals. The process works because the root of a product equals the product of the roots, which follows from the exponent laws.</p>',
  calculate: function(v) {
    var num = Math.round(v.number);
    var coeff = v.coeff || 1;
    var idx = v.index || 2;
    if (num < 1) return { error: 'Number must be a positive integer.' };
    // Find the largest perfect idx-th power factor
    var outside = 1, inside = num;
    for (var p = 2; p * p <= num; p++) {
      while (true) {
        var power = 1, ok = true;
        for (var e = 0; e < idx; e++) {
          if (inside % p !== 0) { ok = false; break; }
          power *= p;
        }
        if (!ok) break;
        inside = inside / power;
        outside *= p;
      }
    }
    var newCoeff = coeff * outside;
    var simplified = '';
    if (idx === 2) {
      simplified = (newCoeff > 1 ? newCoeff : '') + '√' + (inside > 1 ? inside : '');
    } else {
      simplified = (newCoeff > 1 ? newCoeff : '') + 'ⁿ√' + inside + ' (index ' + idx + ')';
    }
    if (inside === 1 && outside > 0) {
      simplified = (coeff * outside).toString();
    }
    return {
      'Original': coeff + ' × ' + idx + '√' + num,
      'Simplified': simplified,
      'Outside factor': outside,
      'Inside (remaining)': inside,
      'Decimal value': core.formatNumber(Math.pow(num, 1 / idx) * coeff, 8),
    };
  }
});

// === PERCENTAGE CALCULATORS ===

R('percent-change-calculator', {
  title: 'Percentage Change Calculator',
  description: 'Calculate the percentage change between two values.',
  tags: ['percent', 'change', 'increase', 'decrease'],
  fields: [
    { id: 'oldVal', label: 'Original Value', type: 'number', step: 0.01, placeholder: 'e.g. 80' },
    { id: 'newVal', label: 'New Value', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
  ],
  formula: '<p><code>Change% = (New − Old) / |Old| × 100</code></p>',
  background: '<p>Percentage change expresses how much a quantity grew or shrank relative to where it started, putting changes of different sizes on a common scale. It is used for prices, populations, test scores and business metrics, and taking the absolute value of the baseline keeps the sign meaningful for negative starting values. A change from zero is undefined in percentage terms, since there is no baseline to compare against.</p>',
  calculate: function(v) {
    if (v.oldVal === 0) return { error: 'Original value cannot be zero.' };
    const change = ((v.newVal - v.oldVal) / Math.abs(v.oldVal)) * 100;
    const direction = change >= 0 ? 'Increase' : 'Decrease';
    return {
      'Percentage Change': core.formatPercent(Math.abs(change)),
      'Direction': direction,
      'Absolute Change': core.formatNumber(v.newVal - v.oldVal, 4),
      'Multiplier': core.formatNumber(v.newVal / v.oldVal, 6),
    };
  }
});

R('percentage-increase-calculator', {
  title: 'Percentage Increase Calculator',
  description: 'Calculate the new value after a percentage increase.',
  tags: ['percent', 'increase', 'raise'],
  fields: [
    { id: 'original', label: 'Original Value', type: 'number', step: 0.01, placeholder: 'e.g. 200' },
    { id: 'percent', label: 'Percentage Increase (%)', type: 'number', step: 0.1, min: 0, placeholder: 'e.g. 15' },
  ],
  formula: '<p><code>New = Original × (1 + Percent/100)</code></p>',
  background: '<p>A percentage increase scales a starting value upward by adding a fraction of that value to itself. It appears in pricing, salary raises, interest and population growth, and the multiplier form makes repeated increases easy to chain. Successive percentage changes do not simply add, because each one applies to an already updated base.</p>',
  calculate: function(v) {
    const increase = v.original * v.percent / 100;
    const newval = v.original + increase;
    return {
      'Increase Amount': core.formatNumber(increase, 4),
      'New Value': core.formatNumber(newval, 4),
      'Expression': core.formatNumber(v.original, 4) + ' + ' + v.percent + '% = ' + core.formatNumber(newval, 4),
    };
  }
});

R('percentage-decrease-calculator', {
  title: 'Percentage Decrease Calculator',
  description: 'Calculate the new value after a percentage decrease.',
  tags: ['percent', 'decrease', 'reduce'],
  fields: [
    { id: 'original', label: 'Original Value', type: 'number', step: 0.01, placeholder: 'e.g. 200' },
    { id: 'percent', label: 'Percentage Decrease (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 15' },
  ],
  formula: '<p><code>New = Original × (1 − Percent/100)</code></p>',
  background: '<p>A percentage decrease reduces a value by a fraction of its original size, the everyday language of discounts, depreciation and budget cuts. Writing it as a multiplier makes repeated decreases straightforward, and the result depends on the base each time. A hundred percent decrease removes the entire quantity, and larger decreases would imply a negative amount that may not be meaningful.</p>',
  calculate: function(v) {
    const decrease = v.original * v.percent / 100;
    const newval = v.original - decrease;
    return {
      'Decrease Amount': core.formatNumber(decrease, 4),
      'New Value': core.formatNumber(newval, 4),
      'Expression': core.formatNumber(v.original, 4) + ' − ' + v.percent + '% = ' + core.formatNumber(newval, 4),
    };
  }
});

R('percent-difference-calculator', {
  title: 'Percentage Difference Calculator',
  description: 'Calculate the percentage difference between two values using their average as reference.',
  tags: ['percent', 'difference', 'comparison'],
  fields: [
    { id: 'v1', label: 'First Value', type: 'number', step: 0.01, placeholder: 'e.g. 50' },
    { id: 'v2', label: 'Second Value', type: 'number', step: 0.01, placeholder: 'e.g. 80' },
  ],
  formula: '<p><code>% Difference = |v₁ − v₂| / ((v₁ + v₂)/2) × 100</code></p>',
  background: '<p>Percentage difference compares two values without treating either as the definitive reference, using their average as the baseline. It is used to compare measurements, prices or results that are equally valid, unlike percentage change which needs a clear starting point. Because the denominator is an average, the measure is symmetric: swapping the two values gives the same answer.</p>',
  calculate: function(v) {
    const avg = (v.v1 + v.v2) / 2;
    if (avg === 0) return { error: 'Both values cannot be zero.' };
    const pctDiff = (Math.abs(v.v1 - v.v2) / Math.abs(avg)) * 100;
    return {
      'Percentage Difference': core.formatPercent(pctDiff),
      'Absolute Difference': core.formatNumber(Math.abs(v.v1 - v.v2), 4),
      'Average': core.formatNumber(avg, 4),
    };
  }
});

R('percent-error-calculator', {
  title: 'Percentage Error Calculator',
  description: 'Calculate the percentage error between an experimental and accepted value.',
  tags: ['percent', 'error', 'experimental', 'accuracy'],
  fields: [
    { id: 'experimental', label: 'Experimental Value', type: 'number', step: 0.01, placeholder: 'e.g. 9.8' },
    { id: 'accepted', label: 'Accepted (True) Value', type: 'number', step: 0.01, placeholder: 'e.g. 9.81' },
  ],
  formula: '<p><code>% Error = |Experimental − Accepted| / |Accepted| × 100</code></p>',
  background: '<p>Percentage error measures how far a measured or experimental value sits from an accepted reference, scaled by the size of that reference. It is standard in laboratory reports, manufacturing quality control and model validation. The absolute value reports magnitude only; a signed error is sometimes preferred when it matters whether the estimate was high or low.</p>',
  calculate: function(v) {
    if (v.accepted === 0) return { error: 'Accepted value cannot be zero.' };
    const pctErr = (Math.abs(v.experimental - v.accepted) / Math.abs(v.accepted)) * 100;
    return {
      'Percentage Error': core.formatPercent(pctErr),
      'Absolute Error': core.formatNumber(Math.abs(v.experimental - v.accepted), 6),
      'Relative Error': core.formatNumber(Math.abs(v.experimental - v.accepted) / Math.abs(v.accepted), 6),
    };
  }
});

R('percent-tolerance-calculator', {
  title: 'Percent Tolerance Calculator',
  description: 'Calculate the acceptable range given a nominal value and tolerance percentage.',
  tags: ['percent', 'tolerance', 'range', 'manufacturing'],
  fields: [
    { id: 'nominal', label: 'Nominal Value', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
    { id: 'tolerance', label: 'Tolerance (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>Range = Nominal ± (Nominal × Tolerance%)</code></p>',
  background: '<p>Tolerance defines the acceptable band around a nominal value, usually quoted as a percentage of that value. It is fundamental to manufacturing, electronics and engineering, where components are only guaranteed to fall within a stated range. The band is symmetric in the simple model, though real specifications can be asymmetric or combine several independent tolerances.</p>',
  calculate: function(v) {
    const amount = v.nominal * v.tolerance / 100;
    return {
      'Tolerance Amount': core.formatNumber(amount, 4),
      'Maximum': core.formatNumber(v.nominal + amount, 4),
      'Minimum': core.formatNumber(v.nominal - amount, 4),
      'Range': core.formatNumber(v.nominal - amount, 4) + ' to ' + core.formatNumber(v.nominal + amount, 4),
    };
  }
});

})(calculatorRegistry);
