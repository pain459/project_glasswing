// Math calculators (~67)
(function(reg) {
const R = reg.register.bind(reg, 'math');

// === PERCENTAGE CALCULATORS ===

R('percentage-calculator', {
  title: 'Percentage Calculator',
  description: 'Calculate percentages: what is X% of Y, X is what % of Y, % change.',
  tags: ['percentage', 'percent', 'of'],
  fields: [
    { id: 'pctType', label: 'Calculation Type', type: 'select', options: [
      { value: 'pctof', label: 'What is X% of Y?', default: true },
      { value: 'iswhatpct', label: 'X is what % of Y?' },
      { value: 'pctchange', label: '% Change from X to Y?' }
    ]},
    { id: 'valX', label: 'X', type: 'number', step: 0.01, placeholder: 'e.g. 25', half: true },
    { id: 'valY', label: 'Y', type: 'number', step: 0.01, placeholder: 'e.g. 200', half: true },
  ],
  formula: '<p><code>X% of Y = X/100 × Y</code>. <code>X is (X/Y×100)% of Y</code>. <code>% Change = (Y−X)/X × 100</code></p>',
  calculate: function(v) {
    const x = v.valX, y = v.valY;
    if (v.pctType === 'pctof') return { Result: core.formatNumber(x / 100 * y) };
    if (v.pctType === 'iswhatpct') return { Result: core.formatPercent(x / y * 100) };
    return { Result: core.formatPercent((y - x) / x * 100) };
  }
});

R('percentage-change', {
  title: 'Percentage Change Calculator',
  description: 'Calculate the percentage increase or decrease between two values.',
  tags: ['percentage', 'change', 'increase', 'decrease'],
  fields: [
    { id: 'oldVal', label: 'Original Value', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
    { id: 'newVal', label: 'New Value', type: 'number', step: 0.01, placeholder: 'e.g. 125' },
  ],
  formula: '<p><code>% Change = (New − Old) / Old × 100</code></p>',
  calculate: function(v) {
    const change = (v.newVal - v.oldVal) / v.oldVal * 100;
    return {
      'Percentage Change': core.formatPercent(change),
      'Direction': change >= 0 ? 'Increase ↑' : 'Decrease ↓',
      'Absolute Change': core.formatNumber(Math.abs(v.newVal - v.oldVal)),
    };
  }
});

R('percent-error', {
  title: 'Percent Error Calculator',
  description: 'Calculate the percent error between experimental and theoretical values.',
  tags: ['percent', 'error', 'experimental'],
  fields: [
    { id: 'experimental', label: 'Experimental Value', type: 'number', step: 0.01, placeholder: 'e.g. 9.81' },
    { id: 'theoretical', label: 'Theoretical Value', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>% Error = |Experimental − Theoretical| / |Theoretical| × 100</code></p>',
  calculate: function(v) {
    const err = Math.abs(v.experimental - v.theoretical) / Math.abs(v.theoretical) * 100;
    return { 'Percent Error': core.formatPercent(err), 'Accuracy': core.formatPercent(100 - err) };
  }
});

R('percent-difference', {
  title: 'Percent Difference Calculator',
  description: 'Calculate the percent difference between two values.',
  tags: ['percent', 'difference'],
  fields: [
    { id: 'v1', label: 'Value 1', type: 'number', step: 0.01, placeholder: 'e.g. 50', half: true },
    { id: 'v2', label: 'Value 2', type: 'number', step: 0.01, placeholder: 'e.g. 60', half: true },
  ],
  formula: '<p><code>% Difference = |V1−V2| / ((V1+V2)/2) × 100</code></p>',
  calculate: function(v) {
    const avg = (Math.abs(v.v1) + Math.abs(v.v2)) / 2;
    return { 'Percent Difference': core.formatPercent(Math.abs(v.v1 - v.v2) / avg * 100) };
  }
});

R('percent-increase', {
  title: 'Percent Increase Calculator',
  description: 'Calculate a value after a percentage increase.',
  tags: ['percent', 'increase'],
  fields: [
    { id: 'original', label: 'Original Value', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
    { id: 'pct', label: 'Increase (%)', type: 'number', step: 0.1, placeholder: 'e.g. 15' },
  ],
  calculate: function(v) {
    const increased = v.original * (1 + v.pct / 100);
    return { 'New Value': core.formatNumber(increased), 'Increase Amount': core.formatNumber(increased - v.original) };
  }
});

R('percent-decrease', {
  title: 'Percent Decrease Calculator',
  description: 'Calculate a value after a percentage decrease.',
  tags: ['percent', 'decrease'],
  fields: [
    { id: 'original', label: 'Original Value', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
    { id: 'pct', label: 'Decrease (%)', type: 'number', step: 0.1, placeholder: 'e.g. 15' },
  ],
  calculate: function(v) {
    const decreased = v.original * (1 - v.pct / 100);
    return { 'New Value': core.formatNumber(decreased), 'Decrease Amount': core.formatNumber(v.original - decreased) };
  }
});

R('percent-tolerance', {
  title: 'Percent Tolerance Calculator',
  description: 'Calculate upper and lower tolerance limits.',
  tags: ['percent', 'tolerance', 'limits'],
  fields: [
    { id: 'nominal', label: 'Nominal Value', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
    { id: 'tolerance', label: 'Tolerance (%)', type: 'number', step: 0.1, placeholder: 'e.g. 5' },
  ],
  calculate: function(v) {
    const amt = v.nominal * v.tolerance / 100;
    return { 'Upper Limit': core.formatNumber(v.nominal + amt), 'Lower Limit': core.formatNumber(v.nominal - amt), 'Tolerance Amount': core.formatNumber(amt) };
  }
});

R('percentage-to-decimal', {
  title: 'Percentage to Decimal Calculator',
  description: 'Convert a percentage to a decimal.',
  tags: ['percentage', 'decimal', 'convert'],
  fields: [{ id: 'pct', label: 'Percentage (%)', type: 'number', step: 0.01, placeholder: 'e.g. 75' }],
  calculate: function(v) { return { 'Decimal': core.formatNumber(v.pct / 100, 6) }; }
});

R('decimal-to-percent', {
  title: 'Decimal to Percentage Calculator',
  description: 'Convert a decimal to a percentage.',
  tags: ['decimal', 'percentage', 'convert'],
  fields: [{ id: 'dec', label: 'Decimal', type: 'number', step: 0.0001, placeholder: 'e.g. 0.75' }],
  calculate: function(v) { return { 'Percentage': core.formatPercent(v.dec * 100) }; }
});

// === BASIC ARITHMETIC ===

R('basic', {
  title: 'Basic Calculator',
  description: 'Simple arithmetic: add, subtract, multiply, divide.',
  tags: ['basic', 'arithmetic', 'add', 'subtract', 'multiply', 'divide'],
  fields: [
    { id: 'a', label: 'First Number', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
    { id: 'op', label: 'Operation', type: 'select', options: [
      { value: '+', label: 'Add (+)', default: true }, { value: '-', label: 'Subtract (−)' },
      { value: '*', label: 'Multiply (×)' }, { value: '/', label: 'Divide (÷)' },
      { value: '**', label: 'Power (^)' }, { value: '%', label: 'Modulo (%)' }
    ]},
    { id: 'b', label: 'Second Number', type: 'number', step: 0.01, placeholder: 'e.g. 3' },
  ],
  calculate: function(v) {
    let result;
    switch (v.op) {
      case '+': result = v.a + v.b; break;
      case '-': result = v.a - v.b; break;
      case '*': result = v.a * v.b; break;
      case '/': result = v.b === 0 ? NaN : v.a / v.b; break;
      case '**': result = Math.pow(v.a, v.b); break;
      case '%': result = v.b === 0 ? NaN : v.a % v.b; break;
    }
    return { Result: core.formatNumber(result) };
  }
});

R('order-of-operations', {
  title: 'Order of Operations (PEMDAS) Calculator',
  description: 'Evaluate an expression following PEMDAS rules.',
  tags: ['PEMDAS', 'order', 'operations', 'expression'],
  fields: [
    { id: 'expr', label: 'Expression', type: 'text', placeholder: 'e.g. 2 + 3 * 4 - (10 / 5)' },
  ],
  formula: '<p>Follows standard order: Parentheses, Exponents, Multiply/Divide, Add/Subtract.</p>',
  calculate: function(v) {
    try {
      const sanitized = v.expr.replace(/[^0-9+\-*/().^\s]/g, '').replace(/\^/g, '**');
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return { Result: core.formatNumber(result) };
    } catch(e) { return { error: 'Invalid expression' }; }
  }
});

R('modulo-calculator', {
  title: 'Modulo Calculator',
  description: 'Calculate the remainder (modulo) of a division.',
  tags: ['modulo', 'remainder', 'mod'],
  fields: [
    { id: 'a', label: 'Dividend (a)', type: 'number', step: 1, placeholder: 'e.g. 17' },
    { id: 'b', label: 'Divisor (b)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>a mod b = a − floor(a/b) × b</code></p>',
  calculate: function(v) {
    const q = Math.floor(v.a / v.b), r = v.a - q * v.b;
    return { 'Quotient': q, 'Remainder': r, 'Equation': `${v.a} = ${q} × ${v.b} + ${r}` };
  }
});

R('expanded-form-calculator', {
  title: 'Expanded Form Calculator',
  description: 'Show a number in expanded form.',
  tags: ['expanded', 'form', 'place value'],
  fields: [{ id: 'num', label: 'Number', type: 'number', step: 1, placeholder: 'e.g. 3456' }],
  calculate: function(v) {
    const s = String(Math.abs(Math.floor(v.num)));
    const parts = [];
    for (let i = 0; i < s.length; i++) {
      const d = parseInt(s[i]), pw = s.length - 1 - i;
      if (d !== 0) parts.push(d * Math.pow(10, pw));
    }
    return { 'Expanded Form': parts.join(' + '), 'Digits': s.split('').join(', ') };
  }
});

R('money-math-calculator', {
  title: 'Money Math Calculator',
  description: 'Add, subtract, multiply, or divide monetary amounts.',
  tags: ['money', 'currency', 'arithmetic'],
  fields: [
    { id: 'a', label: 'Amount A ($)', type: 'number', step: 0.01, placeholder: 'e.g. 100.50' },
    { id: 'op', label: 'Operation', type: 'select', options: [
      { value: '+', label: 'Add (+)', default: true }, { value: '-', label: 'Subtract (−)' },
      { value: '*', label: 'Multiply (×)' }, { value: '/', label: 'Divide (÷)' }
    ]},
    { id: 'b', label: 'Amount B ($)', type: 'number', step: 0.01, placeholder: 'e.g. 25.75' },
  ],
  calculate: function(v) {
    let result;
    switch (v.op) {
      case '+': result = v.a + v.b; break; case '-': result = v.a - v.b; break;
      case '*': result = v.a * v.b; break; case '/': result = v.b ? v.a / v.b : NaN; break;
    }
    return { Result: core.formatCurrency(result) };
  }
});

// === GCF / LCM / FACTORS ===

R('gcf', {
  title: 'Greatest Common Factor (GCF) Calculator',
  description: 'Find the greatest common factor of two or more numbers.',
  tags: ['GCF', 'gcd', 'greatest common factor'],
  fields: [{ id: 'nums', label: 'Numbers (comma-separated)', type: 'textarea', placeholder: 'e.g. 12, 18, 24' }],
  formula: '<p>Uses the Euclidean algorithm iteratively.</p>',
  calculate: function(v) {
    const arr = core.getDataSet('nums');
    if (arr.length < 2) return { error: 'Enter at least 2 numbers' };
    let g = arr[0];
    for (let i = 1; i < arr.length; i++) g = core.gcd(g, arr[i]);
    return { 'GCF': g };
  }
});

R('lcm', {
  title: 'Least Common Multiple (LCM) Calculator',
  description: 'Find the least common multiple of two or more numbers.',
  tags: ['LCM', 'least common multiple'],
  fields: [{ id: 'nums', label: 'Numbers (comma-separated)', type: 'textarea', placeholder: 'e.g. 4, 6, 8' }],
  calculate: function(v) {
    const arr = core.getDataSet('nums');
    if (arr.length < 2) return { error: 'Enter at least 2 numbers' };
    let l = arr[0];
    for (let i = 1; i < arr.length; i++) l = core.lcm(l, arr[i]);
    return { 'LCM': core.formatNumber(l) };
  }
});

R('commonfactors', {
  title: 'Common Factors Calculator',
  description: 'Find all common factors of two numbers.',
  tags: ['common', 'factors'],
  fields: [
    { id: 'a', label: 'Number A', type: 'number', step: 1, placeholder: 'e.g. 12', half: true },
    { id: 'b', label: 'Number B', type: 'number', step: 1, placeholder: 'e.g. 18', half: true },
  ],
  calculate: function(v) {
    const factors = [];
    for (let i = 1; i <= Math.min(v.a, v.b); i++) {
      if (v.a % i === 0 && v.b % i === 0) factors.push(i);
    }
    return { 'Common Factors': factors.join(', '), 'Greatest': factors[factors.length - 1] };
  }
});

R('factors', {
  title: 'Factors Calculator',
  description: 'Find all factors of a number.',
  tags: ['factors', 'divisors'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 1, min: 1, placeholder: 'e.g. 36' }],
  calculate: function(v) {
    const factors = [];
    for (let i = 1; i <= v.n; i++) if (v.n % i === 0) factors.push(i);
    return { 'Factors': factors.join(', '), 'Count': factors.length, 'Sum of Factors': factors.reduce((s, x) => s + x, 0) };
  }
});

R('gcf-euclids-algorithm', {
  title: 'GCF using Euclid\'s Algorithm',
  description: 'Show step-by-step GCF using Euclid\'s algorithm.',
  tags: ['GCF', 'Euclid', 'algorithm'],
  fields: [
    { id: 'a', label: 'Number A', type: 'number', step: 1, placeholder: 'e.g. 48', half: true },
    { id: 'b', label: 'Number B', type: 'number', step: 1, placeholder: 'e.g. 18', half: true },
  ],
  calculate: function(v) {
    let a = v.a, b = v.b, steps = [];
    while (b) { steps.push(`${a} = ${Math.floor(a/b)} × ${b} + ${a%b}`); [a, b] = [b, a % b]; }
    return { html: `<h3>GCF = ${a}</h3><ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>` };
  }
});

// === FRACTION CALCULATORS ===

function fracAdd(a, b, c, d) {
  const num = a * d + b * c, den = b * d, g = core.gcd(Math.abs(num), Math.abs(den));
  return { n: num / g, d: den / g };
}
function fracMul(a, b, c, d) {
  const num = a * c, den = b * d, g = core.gcd(Math.abs(num), Math.abs(den));
  return { n: num / g, d: den / g };
}
function fracStr(n, d) {
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

R('fractions', {
  title: 'Fraction Calculator',
  description: 'Add, subtract, multiply, or divide fractions.',
  tags: ['fraction', 'add', 'subtract', 'multiply', 'divide'],
  fields: [
    { id: 'n1', label: 'Numerator 1', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'd1', label: 'Denominator 1', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
    { id: 'op', label: 'Operation', type: 'select', options: [
      { value: '+', label: 'Add (+)', default: true }, { value: '-', label: 'Subtract (−)' },
      { value: '*', label: 'Multiply (×)' }, { value: '/', label: 'Divide (÷)' }
    ]},
    { id: 'n2', label: 'Numerator 2', type: 'number', step: 1, placeholder: 'e.g. 2', half: true },
    { id: 'd2', label: 'Denominator 2', type: 'number', step: 1, min: 1, placeholder: 'e.g. 3', half: true },
  ],
  calculate: function(v) {
    let r;
    if (v.op === '+') r = fracAdd(v.n1, v.d1, v.n2, v.d2);
    else if (v.op === '-') r = fracAdd(v.n1, v.d1, -v.n2, v.d2);
    else if (v.op === '*') r = fracMul(v.n1, v.d1, v.n2, v.d2);
    else r = fracMul(v.n1, v.d1, v.d2, v.n2);
    return {
      'Result (Fraction)': fracStr(r.n, r.d),
      'Result (Decimal)': core.formatNumber(r.n / r.d, 6),
    };
  }
});

R('fraction-to-decimal', {
  title: 'Fraction to Decimal Calculator',
  description: 'Convert a fraction to a decimal.',
  tags: ['fraction', 'decimal', 'convert'],
  fields: [
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 8', half: true },
  ],
  calculate: function(v) { return { 'Decimal': core.formatNumber(v.n / v.d, 8) }; }
});

R('decimal-to-fraction', {
  title: 'Decimal to Fraction Calculator',
  description: 'Convert a decimal to a simplified fraction.',
  tags: ['decimal', 'fraction', 'convert'],
  fields: [{ id: 'dec', label: 'Decimal', type: 'number', step: 0.000001, placeholder: 'e.g. 0.75' }],
  calculate: function(v) {
    const s = String(v.dec), parts = s.split('.');
    if (parts.length === 1) return { 'Fraction': `${parts[0]}/1` };
    const decPart = parts[1], pw = decPart.length;
    let num = parseInt(parts[0] + decPart), den = Math.pow(10, pw);
    if (parts[0].startsWith('-')) num = -num;
    const g = core.gcd(Math.abs(num), den);
    return { 'Fraction': `${num/g}/${den/g}`, 'Decimal': core.formatNumber((num/g)/(den/g), 8) };
  }
});

R('fraction-to-percent', {
  title: 'Fraction to Percent Calculator',
  description: 'Convert a fraction to a percentage.',
  tags: ['fraction', 'percent', 'convert'],
  fields: [
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) { return { 'Percent': core.formatPercent(v.n / v.d * 100) }; }
});

R('simplify-fractions', {
  title: 'Simplify Fractions Calculator',
  description: 'Reduce a fraction to its simplest form.',
  tags: ['simplify', 'reduce', 'fraction'],
  fields: [
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 12', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 18', half: true },
  ],
  calculate: function(v) {
    const g = core.gcd(Math.abs(v.n), v.d);
    return { 'Simplified': `${v.n/g}/${v.d/g}`, 'Divided by': g, 'Decimal': core.formatNumber((v.n/g)/(v.d/g), 6) };
  }
});

R('mixed-number-to-improper-fraction', {
  title: 'Mixed Number to Improper Fraction',
  description: 'Convert a mixed number to an improper fraction.',
  tags: ['mixed', 'improper', 'fraction'],
  fields: [
    { id: 'whole', label: 'Whole Number', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) {
    const num = v.whole * v.d + v.n, g = core.gcd(Math.abs(num), v.d);
    return { 'Improper Fraction': `${num/g}/${v.d/g}`, 'Decimal': core.formatNumber((num/g)/(v.d/g), 6) };
  }
});

R('adding-fractions-calculator', {
  title: 'Adding Fractions Calculator',
  description: 'Add two fractions and show the steps.',
  tags: ['adding', 'fractions'],
  fields: [
    { id: 'n1', label: 'Numerator 1', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'd1', label: 'Denominator 1', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
    { id: 'n2', label: 'Numerator 2', type: 'number', step: 1, placeholder: 'e.g. 2', half: true },
    { id: 'd2', label: 'Denominator 2', type: 'number', step: 1, min: 1, placeholder: 'e.g. 3', half: true },
  ],
  calculate: function(v) {
    const lcm = core.lcm(v.d1, v.d2);
    const n1 = v.n1 * (lcm / v.d1), n2 = v.n2 * (lcm / v.d2);
    const r = fracAdd(v.n1, v.d1, v.n2, v.d2);
    return {
      html: `<h3>${fracStr(r.n, r.d)}</h3>
        <p>Common denominator: ${lcm}</p>
        <p>${v.n1}/${v.d1} = ${n1}/${lcm}, ${v.n2}/${v.d2} = ${n2}/${lcm}</p>
        <p>${n1}/${lcm} + ${n2}/${lcm} = ${(n1+n2)}/${lcm} = ${fracStr(r.n, r.d)}</p>`
    };
  }
});

R('fractionscomparing', {
  title: 'Comparing Fractions Calculator',
  description: 'Compare two fractions to see which is larger.',
  tags: ['compare', 'fractions'],
  fields: [
    { id: 'n1', label: 'Numerator 1', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'd1', label: 'Denominator 1', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
    { id: 'n2', label: 'Numerator 2', type: 'number', step: 1, placeholder: 'e.g. 2', half: true },
    { id: 'd2', label: 'Denominator 2', type: 'number', step: 1, min: 1, placeholder: 'e.g. 3', half: true },
  ],
  calculate: function(v) {
    const v1 = v.n1 / v.d1, v2 = v.n2 / v.d2;
    return {
      'Comparison': v1 > v2 ? `${v.n1}/${v.d1} > ${v.n2}/${v.d2}` : v1 < v2 ? `${v.n1}/${v.d1} < ${v.n2}/${v.d2}` : `${v.n1}/${v.d1} = ${v.n2}/${v.d2}`,
      'Decimal 1': core.formatNumber(v1, 6), 'Decimal 2': core.formatNumber(v2, 6),
    };
  }
});

R('fractionsequivalent', {
  title: 'Equivalent Fractions Calculator',
  description: 'Find equivalent fractions for a given fraction.',
  tags: ['equivalent', 'fractions'],
  fields: [
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) {
    const eqs = [];
    for (let k = 1; k <= 10; k++) eqs.push(`${v.n * k}/${v.d * k}`);
    return { 'Equivalent Fractions': eqs.join(', ') };
  }
});

R('fractions-average', {
  title: 'Fractions Average Calculator',
  description: 'Calculate the average of multiple fractions.',
  tags: ['average', 'mean', 'fractions'],
  fields: [{ id: 'fracs', label: 'Fractions (num/den, comma-separated)', type: 'textarea', placeholder: 'e.g. 1/2, 3/4, 2/3' }],
  calculate: function(v) {
    const parts = v.fracs.split(',').map(s => s.trim()).filter(Boolean);
    let sum = 0;
    for (const p of parts) {
      const [n, d] = p.split('/').map(Number);
      if (d) sum += n / d;
    }
    return { 'Average': core.formatNumber(sum / parts.length, 6) };
  }
});

R('complex-fraction-calculator', {
  title: 'Complex Fraction Calculator',
  description: 'Evaluate a complex fraction (fraction with fractions in numerator/denominator).',
  tags: ['complex', 'fraction'],
  fields: [
    { id: 'nn', label: 'Top Numerator', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'nd', label: 'Top Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 2', half: true },
    { id: 'dn', label: 'Bottom Numerator', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'dd', label: 'Bottom Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) {
    const top = v.nn / v.nd, bot = v.dn / v.dd;
    const r = fracMul(v.nn, v.nd, v.dd, v.dn);
    return { 'Result': fracStr(r.n, r.d), 'Decimal': core.formatNumber(r.n / r.d, 6) };
  }
});

R('fractionscalculators', {
  title: 'Fraction Calculators Reference',
  description: 'Reference for common fraction operations.',
  tags: ['fraction', 'reference'],
  fields: [],
  calculate: function() {
    return { html: `<table>
      <tr><th>Operation</th><th>Formula</th></tr>
      <tr><td>Add</td><td>a/b + c/d = (ad+bc)/bd</td></tr>
      <tr><td>Subtract</td><td>a/b − c/d = (ad−bc)/bd</td></tr>
      <tr><td>Multiply</td><td>a/b × c/d = ac/bd</td></tr>
      <tr><td>Divide</td><td>a/b ÷ c/d = ad/bc</td></tr>
      <tr><td>Simplify</td><td>Divide both by GCF</td></tr>
    </table>` };
  }
});

R('fractionssolvex', {
  title: 'Solve for X in Fraction Equation',
  description: 'Solve a/b = c/x or a/x = b/c type equations.',
  tags: ['solve', 'fraction', 'equation'],
  fields: [
    { id: 'a', label: 'a', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
    { id: 'b', label: 'b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'c', label: 'c', type: 'number', step: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'd', label: 'd', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p>Solves <code>a/b = c/d</code> for any missing value, or checks equality.</p>',
  calculate: function(v) {
    const left = v.a / v.b, right = v.c / v.d;
    return {
      'Left Side': core.formatNumber(left, 6),
      'Right Side': core.formatNumber(right, 6),
      'Equal?': Math.abs(left - right) < 1e-9 ? 'Yes ✓' : 'No ✗',
    };
  }
});

R('fractionstable', {
  title: 'Fraction Table Generator',
  description: 'Generate a table of fractions for a given denominator.',
  tags: ['fraction', 'table'],
  fields: [{ id: 'den', label: 'Denominator', type: 'number', step: 1, min: 2, max: 100, placeholder: 'e.g. 8' }],
  calculate: function(v) {
    let rows = '';
    for (let n = 1; n < v.den; n++) {
      const g = core.gcd(n, v.den);
      rows += `<tr><td>${n}/${v.den}</td><td>${n/g}/${v.den/g}</td><td>${core.formatNumber(n/v.den, 4)}</td><td>${core.formatPercent(n/v.den*100)}</td></tr>`;
    }
    return { html: `<table><tr><th>Fraction</th><th>Simplified</th><th>Decimal</th><th>Percent</th></tr>${rows}</table>` };
  }
});

R('fractionsnumberline', {
  title: 'Fractions Number Line',
  description: 'Show fractions on a number line.',
  tags: ['fraction', 'number line'],
  fields: [{ id: 'den', label: 'Denominator', type: 'number', step: 1, min: 2, max: 20, placeholder: 'e.g. 4' }],
  calculate: function(v) {
    let line = '<div style="display:flex;align-items:center;gap:0;font-size:.85rem;flex-wrap:wrap">';
    for (let n = 0; n <= v.den; n++) {
      line += `<div style="text-align:center;min-width:2.5rem"><div style="border-bottom:2px solid var(--primary);padding:0 0.25rem">${n}/${v.den}</div><div style="font-size:.75rem;color:var(--text-muted)">${core.formatNumber(n/v.den,2)}</div></div>`;
    }
    line += '</div>';
    return { html };
  }
});

R('fractionsestimating', {
  title: 'Estimating with Fractions',
  description: 'Estimate the result of fraction operations by rounding.',
  tags: ['estimate', 'fractions'],
  fields: [
    { id: 'n1', label: 'Numerator 1', type: 'number', step: 1, placeholder: 'e.g. 7', half: true },
    { id: 'd1', label: 'Denominator 1', type: 'number', step: 1, min: 1, placeholder: 'e.g. 8', half: true },
    { id: 'n2', label: 'Numerator 2', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'd2', label: 'Denominator 2', type: 'number', step: 1, min: 1, placeholder: 'e.g. 5', half: true },
  ],
  calculate: function(v) {
    const v1 = v.n1/v.d1, v2 = v.n2/v.d2;
    const est1 = Math.round(v1) || (v1 > 0.5 ? 1 : 0), est2 = Math.round(v2) || (v2 > 0.5 ? 1 : 0);
    return {
      'Exact Sum': core.formatNumber(v1 + v2, 4),
      'Estimated Sum': est1 + est2,
      'Fraction 1 ≈': core.formatNumber(v1, 4),
      'Fraction 2 ≈': core.formatNumber(v2, 4),
    };
  }
});

// === EXPONENTS / ROOTS ===

R('exponents', {
  title: 'Exponents Calculator',
  description: 'Calculate a number raised to a power.',
  tags: ['exponent', 'power', 'raise'],
  fields: [
    { id: 'base', label: 'Base', type: 'number', step: 0.01, placeholder: 'e.g. 2' },
    { id: 'exp', label: 'Exponent', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>base^exponent</code></p>',
  calculate: function(v) {
    const r = Math.pow(v.base, v.exp);
    return { Result: core.formatNumber(r), 'Scientific': isFinite(r) ? r.toExponential(6) : String(r) };
  }
});

R('squareroots', {
  title: 'Square Root Calculator',
  description: 'Calculate the square root of a number.',
  tags: ['square root', 'sqrt'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 144' }],
  calculate: function(v) {
    const r = Math.sqrt(v.n);
    return { ['√' + v.n]: core.formatNumber(r, 8), 'Perfect Square?': Number.isInteger(r) ? 'Yes' : 'No' };
  }
});

R('cuberoots', {
  title: 'Cube Root Calculator',
  description: 'Calculate the cube root of a number.',
  tags: ['cube root'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 27' }],
  calculate: function(v) { return { ['∛' + v.n]: core.formatNumber(Math.cbrt(v.n), 8) }; }
});

R('fourthroots', {
  title: 'Fourth Root Calculator',
  description: 'Calculate the fourth root of a number.',
  tags: ['fourth root'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 81' }],
  calculate: function(v) { return { ['⁴√' + v.n]: core.formatNumber(Math.pow(v.n, 0.25), 8) }; }
});

R('fifthroots', {
  title: 'Fifth Root Calculator',
  description: 'Calculate the fifth root of a number.',
  tags: ['fifth root'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 32' }],
  calculate: function(v) { return { ['⁵√' + v.n]: core.formatNumber(Math.pow(v.n, 0.2), 8) }; }
});

R('radical', {
  title: 'Radical Calculator',
  description: 'Calculate the nth root of a number.',
  tags: ['radical', 'nth root'],
  fields: [
    { id: 'n', label: 'Index (root)', type: 'number', step: 1, min: 2, placeholder: 'e.g. 3', half: true },
    { id: 'radicand', label: 'Radicand', type: 'number', step: 0.01, placeholder: 'e.g. 27', half: true },
  ],
  calculate: function(v) { return { Result: core.formatNumber(Math.pow(v.radicand, 1/v.n), 8) }; }
});

R('radicals-simplify', {
  title: 'Simplify Radicals Calculator',
  description: 'Simplify a radical expression.',
  tags: ['simplify', 'radical'],
  fields: [
    { id: 'index', label: 'Root Index', type: 'number', step: 1, min: 2, placeholder: 'e.g. 2', half: true },
    { id: 'n', label: 'Number', type: 'number', step: 1, min: 1, placeholder: 'e.g. 72', half: true },
  ],
  calculate: function(v) {
    let inside = v.n, outside = 1;
    for (let p = 2; p * p <= inside; p++) {
      let count = 0;
      while (inside % p === 0) { inside /= p; count++; }
      outside *= Math.pow(p, Math.floor(count / v.index));
    }
    return { 'Simplified': `${outside}√${inside === 1 ? '' : inside}`, 'Decimal': core.formatNumber(Math.pow(v.n, 1/v.index), 8) };
  }
});

R('square-calculator', {
  title: 'Square Calculator',
  description: 'Calculate the square of a number.',
  tags: ['square'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 12' }],
  calculate: function(v) { return { Result: core.formatNumber(v.n * v.n) }; }
});

R('cube-calculator', {
  title: 'Cube Calculator',
  description: 'Calculate the cube of a number.',
  tags: ['cube'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 5' }],
  calculate: function(v) { return { Result: core.formatNumber(v.n * v.n * v.n) }; }
});

// === PRIME NUMBERS ===

R('prime-numbers', {
  title: 'Prime Numbers Calculator',
  description: 'List prime numbers up to a given limit.',
  tags: ['prime', 'numbers', 'list'],
  fields: [{ id: 'limit', label: 'Up to', type: 'number', step: 1, min: 2, max: 10000, placeholder: 'e.g. 100' }],
  calculate: function(v) {
    const primes = [];
    for (let i = 2; i <= v.limit; i++) if (core.isPrime(i)) primes.push(i);
    return { 'Primes': primes.join(', '), 'Count': primes.length };
  }
});

R('prime-number-calculator', {
  title: 'Is This Number Prime?',
  description: 'Check if a number is prime.',
  tags: ['prime', 'check'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 1, min: 2, placeholder: 'e.g. 97' }],
  calculate: function(v) {
    return {
      'Is Prime?': core.isPrime(v.n) ? 'Yes ✓' : 'No ✗',
      'Prime Factors': core.primeFactors(v.n),
    };
  }
});

R('prime-factorization', {
  title: 'Prime Factorization Calculator',
  description: 'Find the prime factorization of a number.',
  tags: ['prime', 'factorization'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 1, min: 2, placeholder: 'e.g. 360' }],
  calculate: function(v) {
    const factors = core.primeFactors(v.n);
    const expr = Object.entries(factors).map(([p, e]) => e > 1 ? `${p}^${e}` : String(p)).join(' × ');
    return { 'Prime Factorization': expr, 'Factors': factors };
  }
});

// === SCIENTIFIC NOTATION ===

R('scientificnotation', {
  title: 'Scientific Notation Calculator',
  description: 'Convert between standard and scientific notation.',
  tags: ['scientific', 'notation', 'E notation'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.000001, placeholder: 'e.g. 0.00042 or 5000000' }],
  calculate: function(v) {
    return {
      'Scientific Notation': v.n.toExponential(6),
      'Standard Form': core.formatNumber(v.n, 10),
    };
  }
});

R('scientific-notation-converter', {
  title: 'Scientific Notation Converter',
  description: 'Convert a number in scientific notation to standard form.',
  tags: ['scientific', 'notation', 'convert'],
  fields: [
    { id: 'coeff', label: 'Coefficient', type: 'number', step: 0.0001, placeholder: 'e.g. 4.2', half: true },
    { id: 'exp', label: 'Exponent (power of 10)', type: 'number', step: 1, placeholder: 'e.g. -4', half: true },
  ],
  calculate: function(v) {
    return { 'Standard Form': core.formatNumber(v.coeff * Math.pow(10, v.exp), 10), 'Input': `${v.coeff} × 10^${v.exp}` };
  }
});

R('standard-form-calculator', {
  title: 'Standard Form Calculator',
  description: 'Convert a number to standard form.',
  tags: ['standard', 'form'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.000001, placeholder: 'e.g. 4.2e-4' }],
  calculate: function(v) { return { 'Standard Form': core.formatNumber(v.n, 10) }; }
});

// === RATIO / PROPORTION ===

R('ratio-calculator', {
  title: 'Ratio Calculator',
  description: 'Simplify and work with ratios.',
  tags: ['ratio', 'simplify'],
  fields: [
    { id: 'a', label: 'Part A', type: 'number', step: 0.01, placeholder: 'e.g. 12', half: true },
    { id: 'b', label: 'Part B', type: 'number', step: 0.01, placeholder: 'e.g. 18', half: true },
  ],
  calculate: function(v) {
    const g = core.gcd(Math.round(v.a * 100), Math.round(v.b * 100)) / 100;
    return {
      'Simplified Ratio': `${(v.a/g).toFixed(2).replace(/\.?0+$/,'')} : ${(v.b/g).toFixed(2).replace(/\.?0+$/,'')}`,
      'Decimal': core.formatNumber(v.a / v.b, 6),
      'Fraction': `${v.a}/${v.b} = ${(v.a/g)}/${(v.b/g)}`,
    };
  }
});

R('ratio-to-fraction-calculator', {
  title: 'Ratio to Fraction Calculator',
  description: 'Convert a ratio to a fraction.',
  tags: ['ratio', 'fraction', 'convert'],
  fields: [
    { id: 'a', label: 'Part A', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'b', label: 'Part B', type: 'number', step: 1, placeholder: 'e.g. 5', half: true },
  ],
  calculate: function(v) {
    const total = v.a + v.b, g = core.gcd(v.a, total);
    return { 'Fraction (A of total)': `${v.a/g}/${total/g}`, 'Decimal': core.formatNumber(v.a/total, 6), 'Percent': core.formatPercent(v.a/total*100) };
  }
});

R('proportion-calculator', {
  title: 'Proportion Calculator',
  description: 'Solve a proportion: a/b = c/d, find the missing value (enter 0).',
  tags: ['proportion', 'solve'],
  fields: [
    { id: 'a', label: 'a', type: 'number', step: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'b', label: 'b', type: 'number', step: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'c', label: 'c', type: 'number', step: 0.01, placeholder: 'e.g. 6', half: true },
    { id: 'd', label: 'd (enter 0 to solve)', type: 'number', step: 0.01, placeholder: 'e.g. 0', half: true },
  ],
  calculate: function(v) {
    if (!v.d) return { 'd =': core.formatNumber(v.a * v.c / v.b) };
    if (!v.c) return { 'c =': core.formatNumber(v.a * v.d / v.b) };
    if (!v.b) return { 'b =': core.formatNumber(v.a * v.d / v.c) };
    if (!v.a) return { 'a =': core.formatNumber(v.b * v.c / v.d) };
    return { 'Proportion holds?': Math.abs(v.a/v.b - v.c/v.d) < 1e-9 ? 'Yes ✓' : 'No ✗' };
  }
});

R('cross-multiplication', {
  title: 'Cross Multiplication Calculator',
  description: 'Verify or solve using cross multiplication.',
  tags: ['cross', 'multiplication'],
  fields: [
    { id: 'a', label: 'a', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
    { id: 'b', label: 'b', type: 'number', step: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'c', label: 'c', type: 'number', step: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'd', label: 'd', type: 'number', step: 0.01, placeholder: 'e.g. 6', half: true },
  ],
  calculate: function(v) {
    return { 'a×d': v.a * v.d, 'b×c': v.b * v.c, 'Equal?': v.a * v.d === v.b * v.c ? 'Yes ✓' : 'No ✗' };
  }
});

R('goldenratio', {
  title: 'Golden Ratio Calculator',
  description: 'Calculate values related to the golden ratio (φ ≈ 1.618).',
  tags: ['golden', 'ratio', 'phi'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 10' }],
  calculate: function(v) {
    const phi = (1 + Math.sqrt(5)) / 2;
    return {
      'φ (phi)': core.formatNumber(phi, 10),
      'n × φ': core.formatNumber(v.n * phi),
      'n / φ': core.formatNumber(v.n / phi),
      'φ^n': core.formatNumber(Math.pow(phi, v.n)),
    };
  }
});

// === ROUNDING / SIGNIFICANT FIGURES ===

R('rounding', {
  title: 'Rounding Calculator',
  description: 'Round a number to a specified decimal place.',
  tags: ['rounding', 'round'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 0.0001, placeholder: 'e.g. 3.14159' },
    { id: 'places', label: 'Decimal Places', type: 'number', step: 1, min: 0, max: 10, placeholder: 'e.g. 3' },
  ],
  calculate: function(v) { return { 'Rounded': core.formatNumber(parseFloat(v.n.toFixed(v.places)), v.places) }; }
});

R('significant-figures', {
  title: 'Significant Figures Calculator',
  description: 'Round a number to a specified number of significant figures.',
  tags: ['significant', 'figures', 'sig figs'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 0.0001, placeholder: 'e.g. 12345.67' },
    { id: 'sf', label: 'Significant Figures', type: 'number', step: 1, min: 1, max: 15, placeholder: 'e.g. 3' },
  ],
  calculate: function(v) {
    const r = parseFloat(v.n.toPrecision(v.sf));
    return { 'Result': core.formatNumber(r, 10), 'Original': v.n };
  }
});

R('significant-figures-counter', {
  title: 'Significant Figures Counter',
  description: 'Count the number of significant figures in a number.',
  tags: ['significant', 'figures', 'count'],
  fields: [{ id: 'n', label: 'Number', type: 'text', placeholder: 'e.g. 0.00420' }],
  calculate: function(v) {
    const s = v.n.trim();
    const hasDecimal = s.includes('.');
    let count = 0;
    let started = false;
    for (const ch of s.replace('.', '')) {
      if (ch === '0' && !started) continue;
      started = true; count++;
    }
    if (!hasDecimal) {
      // trailing zeros in integer are ambiguous
    }
    return { 'Significant Figures': count, 'Number': s };
  }
});

// === NUMBER SYSTEMS ===

R('binary-calculator', {
  title: 'Binary Calculator',
  description: 'Convert between binary and decimal.',
  tags: ['binary', 'base 2'],
  fields: [
    { id: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'dec2bin', label: 'Decimal → Binary', default: true },
      { value: 'bin2dec', label: 'Binary → Decimal' }
    ]},
    { id: 'n', label: 'Number', type: 'text', placeholder: 'e.g. 42 or 101010' },
  ],
  calculate: function(v) {
    if (v.mode === 'dec2bin') return { 'Binary': (parseInt(v.n) || 0).toString(2) };
    return { 'Decimal': parseInt(v.n, 2) };
  }
});

R('hexadecimal-calculator', {
  title: 'Hexadecimal Calculator',
  description: 'Convert between hexadecimal and decimal.',
  tags: ['hexadecimal', 'hex', 'base 16'],
  fields: [
    { id: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'dec2hex', label: 'Decimal → Hex', default: true },
      { value: 'hex2dec', label: 'Hex → Decimal' }
    ]},
    { id: 'n', label: 'Number', type: 'text', placeholder: 'e.g. 255 or FF' },
  ],
  calculate: function(v) {
    if (v.mode === 'dec2hex') return { 'Hexadecimal': (parseInt(v.n) || 0).toString(16).toUpperCase() };
    return { 'Decimal': parseInt(v.n, 16) };
  }
});

R('base-conversion', {
  title: 'Base Conversion Calculator',
  description: 'Convert a number between different bases (2-36).',
  tags: ['base', 'conversion'],
  fields: [
    { id: 'n', label: 'Number', type: 'text', placeholder: 'e.g. FF' },
    { id: 'fromBase', label: 'From Base', type: 'number', step: 1, min: 2, max: 36, placeholder: 'e.g. 16', half: true },
    { id: 'toBase', label: 'To Base', type: 'number', step: 1, min: 2, max: 36, placeholder: 'e.g. 2', half: true },
  ],
  calculate: function(v) {
    const dec = parseInt(v.n, v.fromBase);
    return {
      'Decimal': dec,
      [`Base ${v.toBase}`]: dec.toString(v.toBase).toUpperCase(),
      'Binary': dec.toString(2),
      'Hex': dec.toString(16).toUpperCase(),
    };
  }
});

R('roman-numeral', {
  title: 'Roman Numeral Converter',
  description: 'Convert between Roman numerals and Arabic numbers.',
  tags: ['roman', 'numeral'],
  fields: [
    { id: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'toRoman', label: 'Number → Roman', default: true },
      { value: 'toNumber', label: 'Roman → Number' }
    ]},
    { id: 'n', label: 'Input', type: 'text', placeholder: 'e.g. 1994 or MMXXIV' },
  ],
  calculate: function(v) {
    if (v.mode === 'toRoman') {
      const val = parseInt(v.n);
      const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
      const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
      let r = '';
      for (let i = 0; i < vals.length; i++) while (val >= vals[i]) { r += syms[i]; val -= vals[i]; }
      return { 'Roman Numeral': r };
    } else {
      const map = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
      let total = 0;
      const s = v.n.toUpperCase();
      for (let i = 0; i < s.length; i++) {
        const cur = map[s[i]], next = map[s[i+1]] || 0;
        total += cur < next ? -cur : cur;
      }
      return { 'Number': total };
    }
  }
});

// === OTHER MATH ===

R('place-value-calculator', {
  title: 'Place Value Calculator',
  description: 'Show the place value of each digit in a number.',
  tags: ['place', 'value'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 5234' }],
  calculate: function(v) {
    const s = String(Math.abs(Math.floor(v.n)));
    let html = '<table><tr><th>Digit</th><th>Place</th><th>Value</th></tr>';
    const places = ['Ones','Tens','Hundreds','Thousands','Ten Thousands','Hundred Thousands','Millions'];
    for (let i = s.length - 1; i >= 0; i--) {
      const pw = s.length - 1 - i;
      html += `<tr><td>${s[i]}</td><td>${places[pw] || '10^'+pw}</td><td>${s[i] * Math.pow(10, pw)}</td></tr>`;
    }
    html += '</table>';
    return { html };
  }
});

R('adding-and-subtracting-integers-calculator', {
  title: 'Adding and Subtracting Integers Calculator',
  description: 'Add or subtract integers.',
  tags: ['integers', 'add', 'subtract'],
  fields: [
    { id: 'a', label: 'Integer A', type: 'number', step: 1, placeholder: 'e.g. -5' },
    { id: 'op', label: 'Operation', type: 'select', options: [
      { value: '+', label: 'Add (+)', default: true }, { value: '-', label: 'Subtract (−)' }
    ]},
    { id: 'b', label: 'Integer B', type: 'number', step: 1, placeholder: 'e.g. 3' },
  ],
  calculate: function(v) {
    return { Result: v.op === '+' ? v.a + v.b : v.a - v.b };
  }
});

R('diamond-problem-solver', {
  title: 'Diamond Problem Solver',
  description: 'Find two numbers given their sum and product.',
  tags: ['diamond', 'sum', 'product'],
  fields: [
    { id: 'sum', label: 'Sum', type: 'number', step: 0.01, placeholder: 'e.g. 7' },
    { id: 'prod', label: 'Product', type: 'number', step: 0.01, placeholder: 'e.g. 12' },
  ],
  formula: '<p>Solves x+y=S and x×y=P. Uses quadratic formula: x²−Sx+P=0</p>',
  calculate: function(v) {
    const disc = v.sum * v.sum - 4 * v.prod;
    if (disc < 0) return { error: 'No real solutions' };
    const x1 = (v.sum + Math.sqrt(disc)) / 2, x2 = (v.sum - Math.sqrt(disc)) / 2;
    return { 'Number 1': core.formatNumber(x1), 'Number 2': core.formatNumber(x2), 'Check Sum': x1 + x2, 'Check Product': core.formatNumber(x1 * x2) };
  }
});

R('odd-even', {
  title: 'Odd or Even Calculator',
  description: 'Determine if a number is odd or even.',
  tags: ['odd', 'even'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 1, placeholder: 'e.g. 42' }],
  calculate: function(v) { return { 'Result': v.n % 2 === 0 ? 'Even' : 'Odd' }; }
});

R('absolute-value', {
  title: 'Absolute Value Calculator',
  description: 'Calculate the absolute value of a number.',
  tags: ['absolute', 'value'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. -42' }],
  calculate: function(v) { return { '|n|': Math.abs(v.n) }; }
});

R('continued-fraction', {
  title: 'Continued Fraction Calculator',
  description: 'Express a number as a continued fraction.',
  tags: ['continued', 'fraction'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.0001, placeholder: 'e.g. 3.245' }],
  calculate: function(v) {
    const terms = [];
    let x = v.n;
    for (let i = 0; i < 20 && isFinite(x); i++) {
      const a = Math.floor(x);
      terms.push(a);
      const frac = x - a;
      if (Math.abs(frac) < 1e-10) break;
      x = 1 / frac;
    }
    return { 'Continued Fraction': '[' + terms.join('; ') + ']' };
  }
});

R('repeating-decimal', {
  title: 'Repeating Decimal to Fraction Calculator',
  description: 'Convert a repeating decimal to a fraction.',
  tags: ['repeating', 'decimal', 'fraction'],
  fields: [
    { id: 'whole', label: 'Whole Part', type: 'number', step: 1, placeholder: 'e.g. 0', half: true },
    { id: 'nonRepeating', label: 'Non-repeating Part', type: 'text', placeholder: 'e.g. 1 (for 0.1̅)', half: true },
    { id: 'repeating', label: 'Repeating Part', type: 'text', placeholder: 'e.g. 2 (for 0.12̅)' },
  ],
  calculate: function(v) {
    const nr = v.nonRepeating || '0', rp = v.repeating || '0';
    const nrLen = nr.length, rpLen = rp.length;
    const num = parseInt(nr + rp) - parseInt(nr || '0');
    const den = parseInt(String(9).repeat(rpLen) + String(0).repeat(nrLen));
    const g = core.gcd(Math.abs(num), den);
    const whole = v.whole;
    const totalNum = whole * (den/g) + num/g;
    return { 'Fraction': `${totalNum}/${den/g}`, 'Decimal': core.formatNumber(totalNum/(den/g), 10) };
  }
});

// === ALIASES ===

R('decimal-to-fraction-calculator', {
  title: 'Decimal to Fraction Calculator',
  description: 'Convert a decimal to a simplified fraction.',
  tags: ['decimal', 'fraction', 'convert'],
  fields: [{ id: 'dec', label: 'Decimal', type: 'number', step: 0.000001, placeholder: 'e.g. 0.75' }],
  calculate: function(v) {
    const s = String(v.dec), parts = s.split('.');
    if (parts.length === 1) return { 'Fraction': `${parts[0]}/1` };
    const decPart = parts[1], pw = decPart.length;
    let num = parseInt(parts[0] + decPart), den = Math.pow(10, pw);
    if (parts[0].startsWith('-')) num = -num;
    const g = core.gcd(Math.abs(num), den);
    return { 'Fraction': `${num/g}/${den/g}`, 'Decimal': core.formatNumber((num/g)/(den/g), 8) };
  }
});

R('decimal-to-percent-calculator', {
  title: 'Decimal to Percentage Calculator',
  description: 'Convert a decimal to a percentage.',
  tags: ['decimal', 'percentage', 'convert'],
  fields: [{ id: 'dec', label: 'Decimal', type: 'number', step: 0.0001, placeholder: 'e.g. 0.75' }],
  calculate: function(v) { return { 'Percentage': core.formatPercent(v.dec * 100) }; }
});

R('fraction-to-decimal-calculator', {
  title: 'Fraction to Decimal Calculator',
  description: 'Convert a fraction to a decimal.',
  tags: ['fraction', 'decimal', 'convert'],
  fields: [
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 8', half: true },
  ],
  calculate: function(v) { return { 'Decimal': core.formatNumber(v.n / v.d, 8) }; }
});

R('fraction-to-percent-calculator', {
  title: 'Fraction to Percent Calculator',
  description: 'Convert a fraction to a percentage.',
  tags: ['fraction', 'percent', 'convert'],
  fields: [
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) { return { 'Percent': core.formatPercent(v.n / v.d * 100) }; }
});

R('percent-to-decimal-calculator', {
  title: 'Percent to Decimal Calculator',
  description: 'Convert a percentage to a decimal.',
  tags: ['percent', 'decimal', 'convert'],
  fields: [{ id: 'pct', label: 'Percentage (%)', type: 'number', step: 0.01, placeholder: 'e.g. 75' }],
  calculate: function(v) { return { 'Decimal': core.formatNumber(v.pct / 100, 6) }; }
});

R('percent-to-fraction-calculator', {
  title: 'Percent to Fraction Calculator',
  description: 'Convert a percentage to a simplified fraction.',
  tags: ['percent', 'fraction', 'convert'],
  fields: [{ id: 'pct', label: 'Percentage (%)', type: 'number', step: 0.01, placeholder: 'e.g. 37.5' }],
  calculate: function(v) {
    const s = String(v.pct), parts = s.split('.');
    const decPart = parts[1] || '', pw = decPart.length;
    let num = parseInt(parts[0] + decPart), den = Math.pow(10, pw + 2);
    if (parts[0].startsWith('-')) num = -num;
    const g = core.gcd(Math.abs(num), den);
    return { 'Fraction': `${num/g}/${den/g}`, 'Decimal': core.formatNumber((num/g)/(den/g), 8) };
  }
});

R('percentage', {
  title: 'Percentage Calculator',
  description: 'Calculate percentages: what is X% of Y, X is what % of Y, % change.',
  tags: ['percentage', 'percent', 'of'],
  fields: [
    { id: 'pctType', label: 'Calculation Type', type: 'select', options: [
      { value: 'pctof', label: 'What is X% of Y?', default: true },
      { value: 'iswhatpct', label: 'X is what % of Y?' },
      { value: 'pctchange', label: '% Change from X to Y?' }
    ]},
    { id: 'valX', label: 'X', type: 'number', step: 0.01, placeholder: 'e.g. 25', half: true },
    { id: 'valY', label: 'Y', type: 'number', step: 0.01, placeholder: 'e.g. 200', half: true },
  ],
  formula: '<p><code>X% of Y = X/100 × Y</code>. <code>X is (X/Y×100)% of Y</code>. <code>% Change = (Y−X)/X × 100</code></p>',
  calculate: function(v) {
    const x = v.valX, y = v.valY;
    if (v.pctType === 'pctof') return { Result: core.formatNumber(x / 100 * y) };
    if (v.pctType === 'iswhatpct') return { Result: core.formatPercent(x / y * 100) };
    return { Result: core.formatPercent((y - x) / x * 100) };
  }
});

R('prime-factors', {
  title: 'Prime Factorization Calculator',
  description: 'Find the prime factorization of a number.',
  tags: ['prime', 'factorization', 'factors'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 1, min: 2, placeholder: 'e.g. 360' }],
  calculate: function(v) {
    const factors = core.primeFactors(v.n);
    const expr = Object.entries(factors).map(([p, e]) => e > 1 ? `${p}^${e}` : String(p)).join(' × ');
    return { 'Prime Factorization': expr, 'Factors': factors };
  }
});

// === NEW CALCULATORS ===

R('significant-figures-rounding', {
  title: 'Significant Figures Rounding Calculator',
  description: 'Round a number to a specified number of significant figures.',
  tags: ['significant', 'figures', 'rounding', 'sig figs'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 0.0001, placeholder: 'e.g. 12345.67' },
    { id: 'sf', label: 'Significant Figures', type: 'number', step: 1, min: 1, max: 15, placeholder: 'e.g. 3' },
  ],
  calculate: function(v) {
    const r = parseFloat(v.n.toPrecision(v.sf));
    return { 'Rounded': core.formatNumber(r, 10), 'Original': v.n, 'Significant Figures': v.sf };
  }
});

R('roundingnumbers', {
  title: 'Rounding Numbers Calculator',
  description: 'Round a number to a specified decimal place or nearest value.',
  tags: ['rounding', 'round', 'numbers'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 0.0001, placeholder: 'e.g. 3.14159' },
    { id: 'places', label: 'Decimal Places', type: 'number', step: 1, min: 0, max: 10, placeholder: 'e.g. 3' },
  ],
  calculate: function(v) {
    const rounded = parseFloat(v.n.toFixed(v.places));
    return {
      'Rounded': core.formatNumber(rounded, v.places),
      'Original': v.n,
      'Ceiling': Math.ceil(v.n * Math.pow(10, v.places)) / Math.pow(10, v.places),
      'Floor': Math.floor(v.n * Math.pow(10, v.places)) / Math.pow(10, v.places),
    };
  }
});

R('rounding-methods-calculator', {
  title: 'Rounding Methods Calculator',
  description: 'Round a number using various methods: round half up, round half down, round half even, ceiling, floor.',
  tags: ['rounding', 'methods', 'half up', 'half down', 'half even', 'ceiling', 'floor'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 0.0001, placeholder: 'e.g. 2.5' },
    { id: 'places', label: 'Decimal Places', type: 'number', step: 1, min: 0, max: 10, placeholder: 'e.g. 0' },
  ],
  calculate: function(v) {
    const f = Math.pow(10, v.places);
    const shifted = v.n * f;
    // Round half up: standard Math.round behavior for positive, adjust for negative
    const halfUp = Math.floor(shifted + 0.5) / f;
    // Round half down
    const halfDown = (shifted >= 0) ? Math.ceil(shifted - 0.5) / f : Math.floor(shifted + 0.5) / f;
    // Round half even (banker's rounding)
    const floored = Math.floor(shifted);
    const frac = shifted - floored;
    let halfEven;
    if (Math.abs(frac - 0.5) < 1e-10) {
      halfEven = (floored % 2 === 0) ? floored / f : (floored + 1) / f;
    } else {
      halfEven = Math.round(shifted) / f;
    }
    return {
      'Round Half Up': core.formatNumber(halfUp, v.places),
      'Round Half Down': core.formatNumber(halfDown, v.places),
      'Round Half Even': core.formatNumber(halfEven, v.places),
      'Ceiling': core.formatNumber(Math.ceil(shifted) / f, v.places),
      'Floor': core.formatNumber(Math.floor(shifted) / f, v.places),
    };
  }
});

R('round-to-nearest-multiple', {
  title: 'Round to Nearest Multiple Calculator',
  description: 'Round a number to the nearest multiple of N.',
  tags: ['round', 'nearest', 'multiple'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 23' },
    { id: 'multiple', label: 'Multiple', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5' },
  ],
  calculate: function(v) {
    const rounded = Math.round(v.n / v.multiple) * v.multiple;
    const up = Math.ceil(v.n / v.multiple) * v.multiple;
    const down = Math.floor(v.n / v.multiple) * v.multiple;
    return {
      'Nearest Multiple': core.formatNumber(rounded),
      'Rounded Up': core.formatNumber(up),
      'Rounded Down': core.formatNumber(down),
      'Remainder': core.formatNumber(v.n % v.multiple),
    };
  }
});

R('mixed-number-to-decimal-calculator', {
  title: 'Mixed Number to Decimal Calculator',
  description: 'Convert a mixed number to a decimal.',
  tags: ['mixed', 'number', 'decimal', 'convert'],
  fields: [
    { id: 'whole', label: 'Whole Number', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) {
    const result = v.whole + v.n / v.d;
    return { 'Decimal': core.formatNumber(result, 8), 'Mixed Number': `${v.whole} ${v.n}/${v.d}` };
  }
});

R('mixed-number-to-percent-calculator', {
  title: 'Mixed Number to Percent Calculator',
  description: 'Convert a mixed number to a percentage.',
  tags: ['mixed', 'number', 'percent', 'convert'],
  fields: [
    { id: 'whole', label: 'Whole Number', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) {
    const result = (v.whole + v.n / v.d) * 100;
    return { 'Percent': core.formatPercent(result), 'Mixed Number': `${v.whole} ${v.n}/${v.d}` };
  }
});

R('mixednumbers', {
  title: 'Mixed Number Arithmetic Calculator',
  description: 'Add, subtract, multiply, or divide mixed numbers.',
  tags: ['mixed', 'number', 'arithmetic'],
  fields: [
    { id: 'w1', label: 'Whole 1', type: 'number', step: 1, placeholder: 'e.g. 2', half: true },
    { id: 'n1', label: 'Numerator 1', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'd1', label: 'Denominator 1', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
    { id: 'op', label: 'Operation', type: 'select', options: [
      { value: '+', label: 'Add (+)', default: true }, { value: '-', label: 'Subtract (−)' },
      { value: '*', label: 'Multiply (×)' }, { value: '/', label: 'Divide (÷)' }
    ]},
    { id: 'w2', label: 'Whole 2', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'n2', label: 'Numerator 2', type: 'number', step: 1, placeholder: 'e.g. 2', half: true },
    { id: 'd2', label: 'Denominator 2', type: 'number', step: 1, min: 1, placeholder: 'e.g. 3', half: true },
  ],
  calculate: function(v) {
    const v1 = v.w1 + v.n1 / v.d1, v2 = v.w2 + v.n2 / v.d2;
    let result;
    switch (v.op) {
      case '+': result = v1 + v2; break;
      case '-': result = v1 - v2; break;
      case '*': result = v1 * v2; break;
      case '/': result = v2 !== 0 ? v1 / v2 : NaN; break;
    }
    const whole = Math.trunc(result), fracPart = result - whole;
    const s = String(Math.abs(fracPart).toFixed(8)), dp = s.split('.')[1] || '0';
    const pw = dp.length, num = parseInt(dp), den = Math.pow(10, pw);
    const g = core.gcd(num, den);
    return {
      'Result (Decimal)': core.formatNumber(result, 8),
      'Result (Mixed)': `${whole} ${num/g}/${den/g}`,
      'Result (Improper)': `${(whole * den/g + num/g)}/${den/g}`,
    };
  }
});

R('fractionsorder', {
  title: 'Order Fractions Calculator',
  description: 'Order fractions from least to greatest or greatest to least.',
  tags: ['order', 'fractions', 'sort', 'least', 'greatest'],
  fields: [
    { id: 'fracs', label: 'Fractions (num/den, comma-separated)', type: 'textarea', placeholder: 'e.g. 1/2, 3/4, 2/3, 5/8' },
    { id: 'order', label: 'Order', type: 'select', options: [
      { value: 'asc', label: 'Least to Greatest', default: true },
      { value: 'desc', label: 'Greatest to Least' }
    ]},
  ],
  calculate: function(v) {
    const parts = v.fracs.split(',').map(s => s.trim()).filter(Boolean);
    const parsed = parts.map(p => {
      const [n, d] = p.split('/').map(Number);
      return { str: `${n}/${d}`, val: n / d };
    });
    parsed.sort((a, b) => v.order === 'asc' ? a.val - b.val : b.val - a.val);
    return {
      'Ordered Fractions': parsed.map(f => `${f.str} (${core.formatNumber(f.val, 4)})`).join(', '),
      'Count': parsed.length,
    };
  }
});

R('fractionssimplify', {
  title: 'Simplify Fractions Calculator',
  description: 'Reduce a fraction to its simplest form.',
  tags: ['simplify', 'reduce', 'fraction'],
  fields: [
    { id: 'n', label: 'Numerator', type: 'number', step: 1, placeholder: 'e.g. 12', half: true },
    { id: 'd', label: 'Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 18', half: true },
  ],
  calculate: function(v) {
    const g = core.gcd(Math.abs(v.n), v.d);
    return { 'Simplified': `${v.n/g}/${v.d/g}`, 'Divided by': g, 'Decimal': core.formatNumber((v.n/g)/(v.d/g), 6) };
  }
});

R('lcd', {
  title: 'Least Common Denominator Calculator',
  description: 'Find the least common denominator of two or more fractions.',
  tags: ['LCD', 'least common denominator', 'fractions'],
  fields: [
    { id: 'd1', label: 'Denominator 1', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
    { id: 'd2', label: 'Denominator 2', type: 'number', step: 1, min: 1, placeholder: 'e.g. 6', half: true },
  ],
  calculate: function(v) {
    const lcd = core.lcm(v.d1, v.d2);
    return {
      'LCD': lcd,
      [v.d1 + ' → ' + lcd]: 'Multiply by ' + (lcd / v.d1),
      [v.d2 + ' → ' + lcd]: 'Multiply by ' + (lcd / v.d2),
    };
  }
});

R('multiples', {
  title: 'Multiples Calculator',
  description: 'Find the multiples of a number.',
  tags: ['multiples', 'list'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 1, min: 1, placeholder: 'e.g. 7' },
    { id: 'count', label: 'How Many Multiples', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10' },
  ],
  calculate: function(v) {
    const mults = [];
    for (let i = 1; i <= v.count; i++) mults.push(v.n * i);
    return { 'Multiples': mults.join(', '), 'Count': mults.length };
  }
});

R('latticemultiplication', {
  title: 'Lattice Multiplication Calculator',
  description: 'Multiply two numbers using the lattice method with step-by-step breakdown.',
  tags: ['lattice', 'multiplication', 'grid', 'steps'],
  fields: [
    { id: 'a', label: 'First Number', type: 'number', step: 1, min: 0, placeholder: 'e.g. 23', half: true },
    { id: 'b', label: 'Second Number', type: 'number', step: 1, min: 0, placeholder: 'e.g. 14', half: true },
  ],
  calculate: function(v) {
    const sa = String(v.a), sb = String(v.b);
    const steps = [];
    let total = 0;
    for (let i = sb.length - 1; i >= 0; i--) {
      const digitB = parseInt(sb[i]);
      const pwB = sb.length - 1 - i;
      let partial = 0, carry = 0;
      const detail = [];
      for (let j = sa.length - 1; j >= 0; j--) {
        const digitA = parseInt(sa[j]);
        const pwA = sa.length - 1 - j;
        const prod = digitA * digitB + carry;
        carry = Math.floor(prod / 10);
        partial += (prod % 10) * Math.pow(10, pwA + pwB);
        detail.push(`${digitA} × ${digitB} = ${digitA * digitB}`);
      }
      if (carry) partial += carry * Math.pow(10, sa.length + pwB);
      total += partial;
      steps.push(`${v.a} × ${digitB}${'0'.repeat(pwB)} = ${partial}`);
    }
    return {
      html: `<h3>${v.a} × ${v.b} = ${v.a * v.b}</h3>
        <h4>Steps:</h4>
        <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>
        <p><strong>Total:</strong> ${v.a * v.b}</p>`,
    };
  }
});

R('longdivision', {
  title: 'Long Division Calculator',
  description: 'Perform long division with step-by-step breakdown.',
  tags: ['long division', 'division', 'steps'],
  fields: [
    { id: 'dividend', label: 'Dividend', type: 'number', step: 1, placeholder: 'e.g. 126' },
    { id: 'divisor', label: 'Divisor', type: 'number', step: 1, min: 1, placeholder: 'e.g. 7' },
  ],
  calculate: function(v) {
    const steps = [];
    let remainder = 0;
    const digits = String(v.dividend).split('').map(Number);
    let current = 0;
    let quotient = '';
    for (let i = 0; i < digits.length; i++) {
      current = current * 10 + digits[i];
      const q = Math.floor(current / v.divisor);
      const r = current % v.divisor;
      quotient += String(q);
      steps.push(`${current} ÷ ${v.divisor} = ${q} remainder ${r}`);
      current = r;
    }
    const q = parseInt(quotient) || 0;
    return {
      html: `<h3>${v.dividend} ÷ ${v.divisor} = ${q} R ${current}</h3>
        <h4>Steps:</h4>
        <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>
        <p><strong>Check:</strong> ${q} × ${v.divisor} + ${current} = ${q * v.divisor + current}</p>`,
      'Quotient': q,
      'Remainder': current,
    };
  }
});

R('longdivisiondecimals', {
  title: 'Long Division with Decimals Calculator',
  description: 'Perform long division with decimal numbers and show steps.',
  tags: ['long division', 'decimals', 'steps'],
  fields: [
    { id: 'dividend', label: 'Dividend', type: 'number', step: 0.0001, placeholder: 'e.g. 12.6' },
    { id: 'divisor', label: 'Divisor', type: 'number', step: 0.0001, min: 0.0001, placeholder: 'e.g. 0.7' },
  ],
  calculate: function(v) {
    const result = v.dividend / v.divisor;
    const steps = [];
    let current = v.dividend;
    const maxSteps = 10;
    for (let i = 0; i < maxSteps && Math.abs(current) > 1e-10; i++) {
      const q = Math.floor(current / v.divisor);
      const r = current - q * v.divisor;
      steps.push(`${core.formatNumber(current, 4)} ÷ ${v.divisor} = ${q} remainder ${core.formatNumber(r, 4)}`);
      current = r;
    }
    return {
      html: `<h3>${v.dividend} ÷ ${v.divisor} = ${core.formatNumber(result, 8)}</h3>
        <h4>Steps:</h4>
        <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>`,
      'Result': core.formatNumber(result, 8),
    };
  }
});

R('longmultiplication', {
  title: 'Long Multiplication Calculator',
  description: 'Multiply two numbers using long multiplication with step-by-step breakdown.',
  tags: ['long multiplication', 'multiplication', 'steps'],
  fields: [
    { id: 'a', label: 'First Number', type: 'number', step: 1, min: 0, placeholder: 'e.g. 123', half: true },
    { id: 'b', label: 'Second Number', type: 'number', step: 1, min: 0, placeholder: 'e.g. 45', half: true },
  ],
  calculate: function(v) {
    const sb = String(v.b);
    const steps = [];
    let total = 0;
    for (let i = sb.length - 1; i >= 0; i--) {
      const digit = parseInt(sb[i]);
      const pw = sb.length - 1 - i;
      const partial = v.a * digit * Math.pow(10, pw);
      total += partial;
      steps.push(`${v.a} × ${digit}${'0'.repeat(pw)} = ${partial}`);
    }
    return {
      html: `<h3>${v.a} × ${v.b} = ${v.a * v.b}</h3>
        <h4>Partial Products:</h4>
        <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>
        <p><strong>Sum:</strong> ${total}</p>`,
      'Result': v.a * v.b,
    };
  }
});

R('long-addition-calculator', {
  title: 'Long Addition Calculator',
  description: 'Add numbers using long addition with step-by-step breakdown by place value.',
  tags: ['long addition', 'addition', 'steps'],
  fields: [{ id: 'nums', label: 'Numbers (comma-separated)', type: 'textarea', placeholder: 'e.g. 123, 456, 789' }],
  calculate: function(v) {
    const arr = core.getDataSet('nums');
    if (arr.length < 2) return { error: 'Enter at least 2 numbers' };
    const maxLen = Math.max(...arr.map(n => String(Math.abs(Math.floor(n)))).map(s => s.length));
    const steps = [];
    let carry = 0;
    let result = 0;
    for (let pw = 0; pw < maxLen; pw++) {
      let colSum = carry;
      const details = [];
      for (const n of arr) {
        const digit = Math.floor(Math.abs(n)) % (Math.pow(10, pw + 1)) - Math.floor(Math.abs(n)) % (Math.pow(10, pw));
        const d = Math.floor(digit / Math.pow(10, pw));
        colSum += d;
        details.push(String(d));
      }
      const digitResult = colSum % 10;
      carry = Math.floor(colSum / 10);
      result += digitResult * Math.pow(10, pw);
      steps.push(`Column ${['ones','tens','hundreds','thousands'][pw] || '10^'+pw}: ${details.join(' + ')} + ${carry > 0 && pw > 0 ? 'carry ' : ''}${carry > 0 && pw === 0 ? '' : ''} = ${colSum} → digit ${digitResult}${carry > 0 ? ', carry ' + carry : ''}`);
    }
    if (carry) result += carry * Math.pow(10, maxLen);
    return {
      html: `<h3>Sum = ${arr.reduce((s, x) => s + x, 0)}</h3>
        <h4>Steps (right to left):</h4>
        <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>`,
      'Sum': arr.reduce((s, x) => s + x, 0),
    };
  }
});

R('long-subtraction-with-regrouping-calculator', {
  title: 'Long Subtraction with Regrouping Calculator',
  description: 'Subtract numbers using long subtraction with borrowing steps.',
  tags: ['long subtraction', 'subtraction', 'borrowing', 'regrouping'],
  fields: [
    { id: 'a', label: 'Minuend (top number)', type: 'number', step: 1, placeholder: 'e.g. 503', half: true },
    { id: 'b', label: 'Subtrahend (bottom number)', type: 'number', step: 1, placeholder: 'e.g. 267', half: true },
  ],
  calculate: function(v) {
    const sa = String(Math.floor(v.a)), sb = String(Math.floor(v.b));
    const maxLen = Math.max(sa.length, sb.length);
    const aDigits = sa.padStart(maxLen, '0').split('').map(Number);
    const bDigits = sb.padStart(maxLen, '0').split('').map(Number);
    const steps = [];
    const borrow = new Array(maxLen).fill(0);
    for (let i = maxLen - 1; i >= 0; i--) {
      const top = aDigits[i] - borrow[i];
      if (top < bDigits[i]) {
        borrow[i - 1] = 1;
        steps.push(`Column ${maxLen - 1 - i}: ${top} < ${bDigits[i]}, borrow from left → ${top + 10} − ${bDigits[i]} = ${top + 10 - bDigits[i]}`);
      } else {
        steps.push(`Column ${maxLen - 1 - i}: ${top} − ${bDigits[i]} = ${top - bDigits[i]}`);
      }
    }
    return {
      html: `<h3>${v.a} − ${v.b} = ${v.a - v.b}</h3>
        <h4>Steps (right to left):</h4>
        <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>`,
      'Result': v.a - v.b,
    };
  }
});

R('math', {
  title: 'Math Expression Evaluator',
  description: 'Evaluate a general math expression with standard operators.',
  tags: ['math', 'expression', 'evaluate', 'calculator'],
  fields: [
    { id: 'expr', label: 'Expression', type: 'text', placeholder: 'e.g. 2 + 3 * (4 - 1) ^ 2' },
  ],
  formula: '<p>Supports +, −, ×, ÷, ^, parentheses, and standard math functions.</p>',
  calculate: function(v) {
    try {
      const sanitized = v.expr.replace(/[^0-9+\-*/().^\s]/g, '').replace(/\^/g, '**');
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return {
        'Result': core.formatNumber(result),
        'Expression': v.expr,
      };
    } catch(e) {
      return { error: 'Invalid expression. Use numbers, +, -, *, /, ^, and parentheses.' };
    }
  }
});

R('math-equation-solver', {
  title: 'Math Equation Solver',
  description: 'Solve a simple linear equation of the form ax + b = c.',
  tags: ['equation', 'solver', 'linear', 'algebra'],
  fields: [
    { id: 'a', label: 'a (coefficient of x)', type: 'number', step: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'b', label: 'b (constant)', type: 'number', step: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'c', label: 'c (result)', type: 'number', step: 0.01, placeholder: 'e.g. 14', half: true },
  ],
  formula: '<p>Solves <code>ax + b = c</code> for x: <code>x = (c − b) / a</code></p>',
  calculate: function(v) {
    if (v.a === 0) {
      if (v.b === v.c) return { 'Solution': 'Infinite solutions (identity)' };
      return { 'Solution': 'No solution (contradiction)' };
    }
    const x = (v.c - v.b) / v.a;
    return {
      html: `<h3>x = ${core.formatNumber(x)}</h3>
        <p>Steps:</p>
        <ol>
          <li>${v.a}x + ${v.b} = ${v.c}</li>
          <li>${v.a}x = ${v.c} − ${v.b} = ${v.c - v.b}</li>
          <li>x = ${v.c - v.b} / ${v.a} = ${core.formatNumber(x)}</li>
        </ol>
        <p><strong>Check:</strong> ${v.a} × ${core.formatNumber(x)} + ${v.b} = ${v.a * x + v.b}</p>`,
      'x': core.formatNumber(x),
    };
  }
});

R('ratio-simplifier', {
  title: 'Ratio Simplifier',
  description: 'Simplify a ratio to its lowest terms.',
  tags: ['ratio', 'simplify', 'lowest terms'],
  fields: [
    { id: 'a', label: 'Part A', type: 'number', step: 0.01, placeholder: 'e.g. 12', half: true },
    { id: 'b', label: 'Part B', type: 'number', step: 0.01, placeholder: 'e.g. 18', half: true },
  ],
  calculate: function(v) {
    const scaled = [Math.round(v.a * 100), Math.round(v.b * 100)];
    const g = core.gcd(scaled[0], scaled[1]);
    const sa = scaled[0] / g, sb = scaled[1] / g;
    return {
      'Simplified Ratio': `${sa} : ${sb}`,
      'Divided by': g / 100,
      'Decimal': core.formatNumber(v.a / v.b, 6),
    };
  }
});

R('ratios', {
  title: 'Ratios Calculator',
  description: 'Compare and solve ratio problems including equivalent ratios and proportions.',
  tags: ['ratios', 'proportion', 'compare', 'equivalent'],
  fields: [
    { id: 'a', label: 'Part A', type: 'number', step: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'b', label: 'Part B', type: 'number', step: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'total', label: 'Total Amount (optional, enter 0 to skip)', type: 'number', step: 0.01, placeholder: 'e.g. 35', half: true },
  ],
  calculate: function(v) {
    const g = core.gcd(Math.round(v.a * 100), Math.round(v.b * 100)) / 100;
    const sa = v.a / g, sb = v.b / g;
    const parts = sa + sb;
    const results = {
      'Simplified Ratio': `${sa} : ${sb}`,
      'Total Parts': parts,
      'Decimal (A/B)': core.formatNumber(v.a / v.b, 6),
    };
    if (v.total) {
      results['A\'s Share'] = core.formatNumber(v.total * sa / parts);
      results['B\'s Share'] = core.formatNumber(v.total * sb / parts);
    }
    return results;
  }
});

R('speed-distance-time-calculator', {
  title: 'Speed Distance Time Calculator',
  description: 'Calculate speed, distance, or time given any two values.',
  tags: ['speed', 'distance', 'time', 'velocity'],
  fields: [
    { id: 'solveFor', label: 'Solve For', type: 'select', options: [
      { value: 'speed', label: 'Speed', default: true },
      { value: 'distance', label: 'Distance' },
      { value: 'time', label: 'Time' }
    ]},
    { id: 'speed', label: 'Speed', type: 'number', step: 0.01, placeholder: 'e.g. 60', half: true },
    { id: 'distance', label: 'Distance', type: 'number', step: 0.01, placeholder: 'e.g. 120', half: true },
    { id: 'time', label: 'Time (hours)', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
  ],
  formula: '<p><code>Speed = Distance / Time</code>. <code>Distance = Speed × Time</code>. <code>Time = Distance / Speed</code></p>',
  calculate: function(v) {
    if (v.solveFor === 'speed') return { 'Speed': core.formatNumber(v.distance / v.time) };
    if (v.solveFor === 'distance') return { 'Distance': core.formatNumber(v.speed * v.time) };
    return { 'Time (hours)': core.formatNumber(v.distance / v.speed) };
  }
});

R('unit-rate-calculator', {
  title: 'Unit Rate Calculator',
  description: 'Calculate the unit rate (rate per one unit).',
  tags: ['unit', 'rate', 'per'],
  fields: [
    { id: 'amount', label: 'Amount', type: 'number', step: 0.01, placeholder: 'e.g. 150' },
    { id: 'unit', label: 'Number of Units', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 6' },
  ],
  formula: '<p><code>Unit Rate = Amount / Units</code></p>',
  calculate: function(v) {
    const rate = v.amount / v.unit;
    return {
      'Unit Rate': core.formatNumber(rate, 6),
      'Per 1 Unit': core.formatNumber(rate, 6),
      'Per 100 Units': core.formatNumber(rate * 100),
    };
  }
});

R('simplifying-complex-fractions-calculator', {
  title: 'Simplifying Complex Fractions Calculator',
  description: 'Simplify a complex fraction (a fraction where the numerator or denominator is also a fraction).',
  tags: ['simplify', 'complex', 'fraction'],
  fields: [
    { id: 'nn', label: 'Top Numerator', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'nd', label: 'Top Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 2', half: true },
    { id: 'dn', label: 'Bottom Numerator', type: 'number', step: 1, placeholder: 'e.g. 3', half: true },
    { id: 'dd', label: 'Bottom Denominator', type: 'number', step: 1, min: 1, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) {
    const r = fracMul(v.nn, v.nd, v.dd, v.dn);
    return {
      html: `<h3>Result: ${fracStr(r.n, r.d)}</h3>
        <p>Steps:</p>
        <ol>
          <li>Complex fraction: (${v.nn}/${v.nd}) / (${v.dn}/${v.dd})</li>
          <li>Multiply by reciprocal: ${v.nn}/${v.nd} × ${v.dd}/${v.dn}</li>
          <li>= ${v.nn * v.dd}/${v.nd * v.dn}</li>
          <li>Simplified: ${fracStr(r.n, r.d)}</li>
        </ol>`,
      'Result': fracStr(r.n, r.d),
      'Decimal': core.formatNumber(r.n / r.d, 6),
    };
  }
});

R('number-word-notation-to-standard', {
  title: 'Number Word Notation to Standard',
  description: 'Convert a number written in word form to standard numerical notation.',
  tags: ['number', 'word', 'notation', 'standard', 'convert'],
  fields: [
    { id: 'word', label: 'Number in Words', type: 'text', placeholder: 'e.g. three million four hundred fifty-two thousand one hundred six' },
  ],
  calculate: function(v) {
    const words = v.word.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim();
    const units = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
      ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:16,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
    const tens = {twenty:20,thirty:30,fourty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
    const scales = {hundred:100,thousand:1000,million:1000000,billion:1000000000,trillion:1000000000000};
    const all = {...units, ...tens, ...scales};
    const tokens = words.split(/[\s-]+/);
    let total = 0, current = 0;
    for (const t of tokens) {
      if (t in all) {
        const val = all[t];
        if (val >= 100) {
          current = (current || 1) * val;
          total += current;
          current = 0;
        } else {
          current += val;
        }
      }
    }
    total += current;
    return {
      'Standard Notation': core.formatNumber(total),
      'Comma Form': total.toLocaleString('en-US'),
      'Word Input': v.word,
    };
  }
});

R('multiplicationtables', {
  title: 'Multiplication Table Generator',
  description: 'Generate a multiplication table for a given number or range.',
  tags: ['multiplication', 'table', 'times table'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 1, min: 1, max: 20, placeholder: 'e.g. 7' },
    { id: 'upTo', label: 'Multiply Up To', type: 'number', step: 1, min: 2, max: 20, placeholder: 'e.g. 12', half: true },
  ],
  calculate: function(v) {
    let rows = '';
    for (let i = 1; i <= v.upTo; i++) {
      rows += `<tr><td>${v.n} × ${i}</td><td>${v.n * i}</td></tr>`;
    }
    return {
      html: `<h3>Times Table for ${v.n}</h3>
        <table><tr><th>Expression</th><th>Result</th></tr>${rows}</table>`,
    };
  }
});

})(calculatorRegistry);