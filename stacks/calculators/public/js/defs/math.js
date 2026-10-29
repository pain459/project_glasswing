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
  background: '<p>Percentages express a proportion out of one hundred, a convention that lets unlike quantities be compared directly: a 5% discount and a 5% sales tax are immediately comparable in size. School arithmetic teaches three standard questions (a percentage of a value, one value as a percentage of another, and the change between two values) because each is a rearrangement of the same proportional relationship. They show up constantly in discounts, interest rates, statistics and everyday estimating.</p>',
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
  background: '<p>Percentage change compares two measurements of the same quantity, most often a price, population or revenue figure, by expressing the difference as a fraction of the starting value. Using the original value as the denominator keeps the comparison meaningful, since a rise of 10 on a base of 50 matters far more than the same rise on a base of 10,000. A negative result simply means the new value is lower than the original.</p>',
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
  background: '<p>Percent error reports how far an experimental or estimated value sits from an accepted reference, which is why it appears in chemistry and physics labs whenever results are compared with theory. Taking the absolute value means the sign of the difference does not matter, so the result always describes the magnitude of the error. Dividing by the reference value turns the gap into a relative figure, which lets results at very different scales be judged against the same tolerance.</p>',
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
  formula: '<p><code>% Difference = |V1−V2| / ((|V1|+|V2|)/2) × 100</code></p>',
  background: '<p>Percent difference measures the gap between two values when neither is authoritative, such as two lab methods or two survey results for the same quantity. Dividing by the average of the two values makes the measure symmetric, so swapping the inputs does not change the answer, which is why it is preferred over percent change for comparing peers. It is not appropriate for describing change over time, where the earlier value is the natural baseline.</p>',
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
  formula: '<p><code>New Value = Original × (1 + Increase%/100)</code>. <code>Increase = New − Original</code></p>',
  background: '<p>Applying a percentage increase is everyday arithmetic: pay rises, inflation adjustments, markups and interest all take a base amount and add a proportional slice. Multiplying by a single factor performs the addition of the increase and the scaling in one step, which avoids intermediate rounding and composes cleanly across several successive increases. The added amount is usually reported separately because people want both the new total and how much of it is the increase.</p>',
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
  formula: '<p><code>New Value = Original × (1 − Decrease%/100)</code>. <code>Decrease = Original − New</code></p>',
  background: '<p>Percent decreases appear in discounts, depreciation, tax withholding and any situation where a value falls by a fixed proportion. Subtracting the rate from one and multiplying performs the reduction and the scaling together, which is also how compound decay is modelled when the same factor is applied repeatedly. Reporting the amount of the decrease alongside the new value makes the result easy to check against the original figure.</p>',
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
  formula: '<p><code>Tolerance Amount = Nominal × Tolerance%/100</code>. <code>Upper = Nominal + Amount</code>, <code>Lower = Nominal − Amount</code></p>',
  background: '<p>Tolerance is the permitted slack around a nominal value and is the basis of manufacturing specifications, resistor ratings and engineering drawings. Limits are usually quoted as a percentage because acceptable error tends to scale with the size of the part or quantity, so a single relative figure covers a whole family of sizes. The result is a symmetric band unless a process is explicitly specified with asymmetric limits.</p>',
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
  formula: '<p><code>Decimal = Percentage / 100</code></p>',
  background: '<p>Percent literally means per hundred, so a percentage is already a fraction with denominator 100 and dividing by 100 simply makes that explicit. Converting to a decimal is the first step in most hand or spreadsheet calculations, because ordinary arithmetic is easier without percent signs. Discounts, interest rates and grades are routinely converted this way before being multiplied.</p>',
  calculate: function(v) { return { 'Decimal': core.formatNumber(v.pct / 100, 6) }; }
});

R('decimal-to-percent', {
  title: 'Decimal to Percentage Calculator',
  description: 'Convert a decimal to a percentage.',
  tags: ['decimal', 'percentage', 'convert'],
  fields: [{ id: 'dec', label: 'Decimal', type: 'number', step: 0.0001, placeholder: 'e.g. 0.75' }],
  formula: '<p><code>Percentage = Decimal × 100</code></p>',
  background: '<p>Multiplying a decimal by 100 restates a proportion in hundredths, the form people read most easily when judging rates such as interest, tax or accuracy. Moving the decimal point two places is not a different operation, just a shortcut for that multiplication. It is the reverse of the percent-to-decimal step used before doing arithmetic.</p>',
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
  formula: '<p><code>a + b</code>, <code>a − b</code>, <code>a × b</code>, <code>a ÷ b</code>, <code>a^b</code> or <code>a mod b</code> depending on the chosen operation.</p>',
  background: '<p>The four basic operations underpin nearly every other calculation, from splitting a restaurant bill to balancing a ledger. This tool applies one selected operation to two entered numbers at a time, mirroring the two-operand arithmetic taught in primary school, and adds power and remainder options for slightly more specialised work. Division by zero is reported as an error rather than silently returning infinity, because the real numbers have no answer there.</p>',
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
  background: '<p>PEMDAS, or BODMAS outside the United States, is a notational convention rather than a mathematical law: without an agreed hierarchy, an expression like 2 + 3 × 4 would be ambiguous. The hierarchy exists so that polynomials and similar expressions can be written without brackets, since multiplication distributes over addition and an exponent applies to its immediate base. Parentheses override everything, which is why calculators and programming languages all support explicit grouping.</p>',
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
  background: '<p>Modulo returns the remainder left after dividing one integer by another, the same remainder a child finds when sharing 17 sweets among 5 friends. It appears constantly in programming, for cycling through array indices, testing parity and building hash tables, and in scheduling where weekdays repeat with period seven. The floor-based definition used here always gives a remainder with the sign of the divisor, and guarantees it is smaller than the divisor in absolute value.</p>',
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
  formula: '<p><code>Expanded Form = Σ digit × 10^place</code></p>',
  background: '<p>Expanded form writes a number as the sum of each digit multiplied by its place value, making the base-ten structure visible. It is a standard topic in early primary school because it explains why carrying and borrowing work: 3456 is 3000 plus 400 plus 50 plus 6, and every column carries a different power of ten. The same idea generalises to other bases, where each digit is weighted by a power of that base.</p>',
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
  formula: '<p><code>A + B</code>, <code>A − B</code>, <code>A × B</code> or <code>A ÷ B</code> depending on the chosen operation.</p>',
  background: '<p>Money arithmetic is ordinary decimal arithmetic at a fixed precision of two places, used for invoices, splitting bills and checking change. Working in whole currency units rather than cents keeps the numbers readable, but the final result should be rounded to the minor unit, because rounding intermediate steps can accumulate error. Division is the awkward case, since a quotient such as 33.333 has to be rounded before it can be paid.</p>',
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
  background: '<p>The greatest common factor is the largest number that divides both inputs exactly, and it is the key to reducing fractions and factoring algebraic expressions. It is found efficiently by the Euclidean algorithm, which repeatedly replaces the larger number with the remainder of dividing it by the smaller, because any common divisor of two numbers also divides that remainder. The process terminates because the remainders strictly decrease.</p>',
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
  formula: '<p><code>LCM(a, b) = |a × b| / GCF(a, b)</code>, applied iteratively for more numbers.</p>',
  background: '<p>The least common multiple is the smallest number that both inputs divide evenly, and it is what you need to add fractions or synchronise repeating events such as two machines with different cycle times. Building it from the greatest common factor avoids listing multiples one by one. For more than two numbers the same pairwise identity is applied in sequence.</p>',
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
  formula: '<p><code>Common Factors = { i : A mod i = 0 and B mod i = 0 }</code></p>',
  background: '<p>Common factors are the numbers that divide both inputs without a remainder, and they reveal the structure the two values share. Listing them makes the greatest common factor obvious and is a standard classroom exercise before the Euclidean algorithm is introduced. In algebra, the shared factors of two coefficients show what can be factored out of an expression.</p>',
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
  formula: '<p><code>Factors of n = { i : n mod i = 0 }</code>; <code>Sum = Σ factors</code></p>',
  background: '<p>The factors of a number are the integers that divide it exactly, and their count and sum say a lot about its structure: primes have exactly two, and perfect numbers equal the sum of their proper divisors. Testing divisors only up to the square root is sufficient, because factors always come in pairs with one member no larger than the root. Factor lists are used for simplifying fractions, scheduling problems and divisibility checks.</p>',
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
  formula: '<p><code>a = q × b + r</code>, repeat with (b, r) until r = 0; the GCF is the last non-zero remainder.</p>',
  background: '<p>Euclid described this procedure more than two thousand years ago, and it remains the standard method for finding greatest common factors. It works because the set of common divisors of two numbers is unchanged when the larger is replaced by its remainder against the smaller, so the pair shrinks without losing any information. The algorithm stops when the remainder reaches zero, and the last non-zero remainder is the answer. Showing the intermediate quotients is how the method is normally taught.</p>',
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
  formula: '<p><code>a/b ± c/d = (ad ± bc)/bd</code>, <code>a/b × c/d = ac/bd</code>, <code>a/b ÷ c/d = ad/bc</code>, then reduce by GCF.</p>',
  background: '<p>Fraction arithmetic extends the integer operations to parts of a whole, and it is used whenever quantities are measured in halves, thirds or eighths: recipes, carpentry, time and music. Addition needs a common denominator because only pieces of the same size can be counted together, while multiplying fractions corresponds to taking a fraction of a fraction. Results are reduced so the answer is expressed with the fewest possible pieces.</p>',
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
  formula: '<p><code>Decimal = n / d</code></p>',
  background: '<p>A fraction is a division waiting to be carried out, so its decimal form comes from dividing the numerator by the denominator. The expansion terminates only when the reduced denominator has no prime factors other than 2 and 5, which is why thirds and sevenths repeat forever. The decimal form suits calculators and quick comparisons, while the fraction stays exact.</p>',
  calculate: function(v) { return { 'Decimal': core.formatNumber(v.n / v.d, 8) }; }
});

R('decimal-to-fraction', {
  title: 'Decimal to Fraction Calculator',
  description: 'Convert a decimal to a simplified fraction.',
  tags: ['decimal', 'fraction', 'convert'],
  fields: [{ id: 'dec', label: 'Decimal', type: 'number', step: 0.000001, placeholder: 'e.g. 0.75' }],
  formula: '<p><code>Decimal = num / 10^places</code>, then reduce by GCF.</p>',
  background: '<p>Any terminating decimal can be written over a power of ten and then reduced, because each decimal place names a tenth, hundredth, thousandth and so on. Reducing by the greatest common factor gives the canonical simplest form that textbooks expect. The conversion matters when exactness is more useful than readability, such as in ratio problems or when combining measurements.</p>',
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
  formula: '<p><code>Percent = n / d × 100</code></p>',
  background: '<p>Fractions and percentages describe the same kind of proportion, so converting between them is a matter of rescaling to a denominator of one hundred. Doing the division first and then multiplying by 100 avoids awkward mental arithmetic on the denominator. Grades, discounts and statistics are usually quoted as percentages even when the underlying data is fractional.</p>',
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
  formula: '<p><code>Simplified = (n ÷ GCF) / (d ÷ GCF)</code></p>',
  background: '<p>Simplifying a fraction divides the numerator and denominator by their greatest common factor, producing an equivalent fraction whose parts are as large as possible. The value does not change because dividing both terms by the same non-zero number is multiplication by one in disguise. Reduced form is the conventional answer in mathematics, and it also makes further arithmetic less error-prone.</p>',
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
  formula: '<p><code>Improper = (whole × d + n) / d</code>, then reduce by GCF.</p>',
  background: '<p>Mixed numbers are convenient for people, as in two and a half cups, but awkward for arithmetic, so they are converted to improper fractions first. Multiplying the whole part by the denominator counts how many denominator-sized pieces it contains, and adding the numerator accounts for the fractional part. The result is usually reduced afterwards.</p>',
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
  formula: '<p><code>a/b + c/d = (a × LCM/b + c × LCM/d) / LCM</code>, then reduce by GCF.</p>',
  background: '<p>Adding fractions requires the pieces to be the same size, so both are rewritten over a common denominator before the numerators are added. Using the least common denominator keeps the numbers small, though any common multiple would give an equivalent answer. Showing the intermediate step makes clear why the denominators themselves are never simply added.</p>',
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
  formula: '<p>Compare <code>n₁/d₁</code> and <code>n₂/d₂</code> using their decimal values.</p>',
  background: '<p>Comparing fractions is needed whenever quantities are quoted in different divisions of a unit, such as three eighths against two fifths of an inch. Converting to a common denominator or to decimals both work; the decimal route is quick and adequate for practical comparisons but can lose exactness when the expansions repeat. Cross multiplication is the exact alternative when only the ordering matters.</p>',
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
  formula: '<p><code>n/d = (n × k)/(d × k)</code> for k = 1…10</p>',
  background: '<p>Equivalent fractions are different ways of writing the same proportion, produced by multiplying or dividing both terms by the same non-zero number. They matter because a fraction has one simplest form but infinitely many representations, and different contexts favour different denominators. Scaling up is exactly how fractions are put over a common denominator.</p>',
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
  formula: '<p><code>Average = (Σ nᵢ/dᵢ) / count</code></p>',
  background: '<p>Averaging fractions follows the same idea as averaging whole numbers: add the values, then divide by how many there are. Because the addends may have different denominators, the sum is usually taken in decimal or over a common denominator before dividing. This is used for averaging scores, measurements and rates that are naturally expressed as fractions.</p>',
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
  formula: '<p><code>(a/b) / (c/d) = a × d / (b × c)</code>, then reduce by GCF.</p>',
  background: '<p>A complex fraction has a fraction in its numerator, its denominator, or both, and it arises naturally when one rate is divided by another. Inverting the denominator and multiplying turns the stacked division into a single multiplication, which is much easier to simplify. Reducing afterwards keeps the result in canonical form.</p>',
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
  formula: '<p><code>a/b + c/d = (ad + bc)/bd</code>, <code>a/b − c/d = (ad − bc)/bd</code>, <code>a/b × c/d = ac/bd</code>, <code>a/b ÷ c/d = ad/bc</code></p>',
  background: '<p>This reference collects the standard fraction identities taught in school so they can be looked up rather than re-derived. All of them follow from the definition of a fraction as a division: common denominators for addition and subtraction, direct products for multiplication, and inversion for division. Leaving the result reduced is the usual convention.</p>',
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
  background: '<p>Proportions of the form a/b = c/d are solved by cross multiplication, which amounts to multiplying both sides by the product of the denominators to clear them. Problems of this shape arise in scaling recipes, reading map distances, converting currency and any statement phrased as a ratio. When the unknown sits in a denominator, the same algebra applies but the value zero has to be excluded.</p>',
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
  formula: '<p>For each <code>n/d</code>: simplified <code>(n ÷ GCF)/(d ÷ GCF)</code>, decimal <code>n/d</code>, percent <code>n/d × 100</code>.</p>',
  background: '<p>A fraction table lists every slice for a chosen denominator together with its reduced form, decimal and percent, which is handy for teaching and for quick reference in workshops and kitchens. The three columns are different representations of the same value, so they should always agree. Reducing each entry shows which fractions collapse to simpler names.</p>',
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
  formula: '<p>Plots <code>n/d</code> for n = 0…d with decimal value <code>n/d</code>.</p>',
  background: '<p>Plotting fractions on a number line makes their size visible and shows that many differently written fractions land on the same point. The points are evenly spaced because each step adds the same unit fraction to the running value. This picture is a standard bridge in primary school between counting and measuring.</p>',
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
  formula: '<p><code>Estimate = round(n₁/d₁) + round(n₂/d₂)</code></p>',
  background: '<p>Estimating with fractions means rounding each fraction to a nearby whole number before operating, which gives a quick sanity check on an exact answer. Estimation is used constantly in practical settings, such as splitting a bill, checking a recipe or judging a measurement, where a close value is enough. The estimate should be near the exact result but is not expected to equal it.</p>',
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
  background: '<p>Exponentiation is repeated multiplication, introduced to avoid writing long products and to describe growth, area and volume compactly. Negative exponents denote reciprocals and fractional exponents denote roots, which keeps the index laws consistent for all real exponents. Powers of ten are the basis of both scientific notation and the place-value system itself.</p>',
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
  formula: '<p><code>√n</code></p>',
  background: '<p>The square root of a number is the value that returns the original when multiplied by itself, and it appears whenever an area is converted back into a side length. School problems normally ask for the principal, non-negative root, because squaring either sign gives the same positive result. Many roots, such as that of 2, are irrational and cannot be written as exact fractions, so they are reported as rounded decimals.</p>',
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
  formula: '<p><code>∛n</code></p>',
  background: '<p>A cube root reverses cubing and answers volume questions, such as the edge length of a cube with a given capacity. Negative inputs have real cube roots, unlike square roots, because an odd power preserves sign. Exact values are rare outside perfect cubes, so results are usually shown to several decimal places.</p>',
  calculate: function(v) { return { ['∛' + v.n]: core.formatNumber(Math.cbrt(v.n), 8) }; }
});

R('fourthroots', {
  title: 'Fourth Root Calculator',
  description: 'Calculate the fourth root of a number.',
  tags: ['fourth root'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 81' }],
  formula: '<p><code>⁴√n = n^(1/4)</code></p>',
  background: '<p>A fourth root is the number that gives the input when raised to the fourth power, which is the same as taking a square root twice. Fourth powers appear in statistics, where variances are squared, and in scaling laws that involve areas of areas. Even roots of negative numbers have no real value, so such inputs are rejected.</p>',
  calculate: function(v) { return { ['⁴√' + v.n]: core.formatNumber(Math.pow(v.n, 0.25), 8) }; }
});

R('fifthroots', {
  title: 'Fifth Root Calculator',
  description: 'Calculate the fifth root of a number.',
  tags: ['fifth root'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 32' }],
  formula: '<p><code>⁵√n = n^(1/5)</code></p>',
  background: '<p>A fifth root inverts raising to the fifth power, and like every odd root it is defined for negative inputs as well as positive ones. Fifth-power relationships show up in some physical scaling laws and in compounding over five periods. As with other non-square roots the result is generally irrational, so it is reported as a decimal.</p>',
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
  formula: '<p><code>ⁿ√x = x^(1/n)</code></p>',
  background: '<p>A radical expression asks for the nth root of a value, the inverse of raising it to the nth power. The index matters: even roots require non-negative inputs among the real numbers, while odd roots accept any sign. Radicals let exact answers be written where a decimal would only be an approximation.</p>',
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
  formula: '<p><code>ⁿ√x = outside × ⁿ√inside</code> by moving perfect nth-power factors outside the radical.</p>',
  background: '<p>Simplifying a radical pulls the largest perfect-power factor out of the radicand so that no such factor remains inside. The value is unchanged, only the presentation differs, and the simplified form is the conventional answer in algebra. It also makes it easier to combine radicals that share the same simplified radicand.</p>',
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
  formula: '<p><code>n²</code></p>',
  background: '<p>Squaring multiplies a number by itself and underpins area, variance and the Pythagorean theorem. For real inputs the result is never negative, which is why squared quantities are used to measure distances and deviations regardless of direction. Perfect squares are worth recognising because they simplify roots and factoring.</p>',
  calculate: function(v) { return { Result: core.formatNumber(v.n * v.n) }; }
});

R('cube-calculator', {
  title: 'Cube Calculator',
  description: 'Calculate the cube of a number.',
  tags: ['cube'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 5' }],
  formula: '<p><code>n³</code></p>',
  background: '<p>Cubing multiplies a number by itself three times and describes volume, so it scales with the third power of a length. Unlike squaring, cubing keeps the sign of the input. Cube values also appear in the factorisations of sums and differences of cubes.</p>',
  calculate: function(v) { return { Result: core.formatNumber(v.n * v.n * v.n) }; }
});

// === PRIME NUMBERS ===

R('prime-numbers', {
  title: 'Prime Numbers Calculator',
  description: 'List prime numbers up to a given limit.',
  tags: ['prime', 'numbers', 'list'],
  fields: [{ id: 'limit', label: 'Up to', type: 'number', step: 1, min: 2, max: 10000, placeholder: 'e.g. 100' }],
  formula: '<p>Lists every number <code>p ≤ limit</code> whose only divisors are 1 and itself.</p>',
  background: '<p>Primes are the multiplicative building blocks of the integers, and listing them up to a limit is the classic exercise behind the sieve of Eratosthenes. A prime has exactly two positive divisors, one and itself, which is why one is excluded by convention. Prime lists underpin divisibility reasoning, hashing and public-key cryptography.</p>',
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
  formula: '<p><code>n</code> is prime when <code>n mod i ≠ 0</code> for all 2 ≤ i ≤ √n, so it has exactly two divisors: 1 and n.</p>',
  background: '<p>Primality testing asks whether a number has any divisor other than one and itself. It is enough to test divisors up to the square root, because in any factorisation into two factors one of them must be no larger than the root. That shortcut makes hand checking feasible and is the starting point for the faster tests used in practice.</p>',
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
  formula: '<p><code>n = p₁^e₁ × p₂^e₂ × …</code></p>',
  background: '<p>Prime factorisation breaks a number into the primes that multiply together to produce it, and by the fundamental theorem of arithmetic that breakdown is unique apart from the order of the factors. It yields the greatest common factor, the least common multiple and the full divisor list almost immediately. Repeated division by the smallest possible prime is the most direct way to find it by hand.</p>',
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
  formula: '<p><code>n = a × 10^b</code> with 1 ≤ |a| &lt; 10</p>',
  background: '<p>Scientific notation writes a number as a coefficient between one and ten multiplied by a power of ten, which keeps very large and very small quantities readable and makes their order of magnitude explicit. It is standard in science and engineering, where measurements span many powers of ten. The exponent also carries information about precision, since the digits written down indicate the significant figures claimed.</p>',
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
  formula: '<p><code>Standard = coefficient × 10^exponent</code></p>',
  background: '<p>Converting from scientific notation back to an ordinary decimal means shifting the decimal point by the exponent and filling in zeros. That is often necessary when a result must be typed into a system, reported to a customer, or compared against a value written out in full. The sign of the exponent decides whether the number is scaled up or down.</p>',
  calculate: function(v) {
    return { 'Standard Form': core.formatNumber(v.coeff * Math.pow(10, v.exp), 10), 'Input': `${v.coeff} × 10^${v.exp}` };
  }
});

R('standard-form-calculator', {
  title: 'Standard Form Calculator',
  description: 'Convert a number to standard form.',
  tags: ['standard', 'form'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.000001, placeholder: 'e.g. 4.2e-4' }],
  formula: '<p><code>n = a × 10^b</code> written in standard decimal form</p>',
  background: '<p>Standard form writes a number as a coefficient times a power of ten, which keeps very large and very small values compact and makes their magnitude obvious. This tool accepts a value, including one entered in exponent notation, and displays it as a plain decimal in full. That is useful when the result has to be pasted somewhere that does not accept exponents, or read aloud digit by digit.</p>',
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
  formula: '<p><code>a : b</code> reduced by GCF. <code>Decimal = a / b</code></p>',
  background: '<p>A ratio compares two quantities of the same kind, and reducing it by the greatest common factor gives the simplest whole-number statement of that comparison. Ratios differ from fractions in presentation rather than substance: a ratio of 3 to 2 also means three parts for every two. They are used in mixing, scaling drawings and sharing amounts in given proportions.</p>',
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
  formula: '<p><code>Fraction = A / (A + B)</code>, reduced by GCF. <code>Percent = A/(A+B) × 100</code></p>',
  background: '<p>A ratio of A to B describes a whole divided into A + B parts, so the A portion is A divided by the total number of parts. This conversion is needed whenever a ratio is used to share a quantity, such as splitting profits or mixing paint. Reading the ratio as a fraction of the whole rather than of the other term is the most common source of error.</p>',
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
  formula: '<p><code>a/b = c/d</code>; solve <code>d = a × c / b</code>, <code>c = a × d / b</code>, <code>b = a × d / c</code>, <code>a = b × c / d</code></p>',
  background: '<p>A proportion states that two ratios are equal, and the missing term is found by cross multiplying and then dividing. It is the workhorse of scaling problems: recipes, maps, unit conversions and similar triangles. Entering zero marks the value to be solved, which lets one form of the calculator handle all four positions.</p>',
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
  formula: '<p><code>a/b = c/d ⟺ a × d = b × c</code></p>',
  background: '<p>Cross multiplication is the standard test for whether two fractions are equal, and it also solves proportions with one unknown. It works because multiplying both sides of an equality by both denominators clears them without changing the truth of the statement. The result is a linear equation in the unknown, unless that unknown appears in a denominator.</p>',
  calculate: function(v) {
    return { 'a×d': v.a * v.d, 'b×c': v.b * v.c, 'Equal?': v.a * v.d === v.b * v.c ? 'Yes ✓' : 'No ✗' };
  }
});

R('goldenratio', {
  title: 'Golden Ratio Calculator',
  description: 'Calculate values related to the golden ratio (φ ≈ 1.618).',
  tags: ['golden', 'ratio', 'phi'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.01, placeholder: 'e.g. 10' }],
  formula: '<p><code>φ = (1 + √5) / 2 ≈ 1.618</code></p>',
  background: '<p>The golden ratio is the positive solution of the equation in which a whole is to its larger part as that part is to the smaller, roughly 1.618. It appears in the geometry of the regular pentagon and pentagram and in some growth patterns in biology, and it is often used in design for proportions that many people find pleasing. Claims that it governs all of art and architecture are considerably exaggerated.</p>',
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
  formula: '<p><code>Rounded = n</code> rounded to <code>places</code> decimal places (half-up)</p>',
  background: '<p>Rounding replaces a number with a nearby one that has fewer digits, which is necessary when a measurement cannot be known more precisely or when a result must fit a fixed format. The usual school convention is round half up, where a following digit of five or more increases the kept digit. Bankers rounding sends exact halves to the nearest even digit and is preferred in finance and statistics because it avoids a systematic upward bias.</p>',
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
  formula: '<p><code>Result = n</code> rounded to <code>sf</code> significant figures</p>',
  background: '<p>Significant figures express how precisely a value was measured, so rounding to a given count of them reports a result at the same precision as its inputs. Non-zero digits and zeros between them always count, leading zeros never count, and trailing zeros count only when a decimal point makes the intended precision explicit. The convention matters in science, where writing 2.50 rather than 2.5 claims a different measurement precision.</p>',
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
  formula: '<p>Counts significant digits: leading zeros are not significant, all digits from the first non-zero onward are.</p>',
  background: '<p>Counting significant figures is how a measured value communicates its precision. Leading zeros only locate the decimal point, embedded zeros are always significant, and trailing zeros after a decimal point are significant because they were written deliberately. Ambiguous cases such as trailing zeros in a whole number are normally resolved by rewriting the value in scientific notation.</p>',
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
  formula: '<p>Decimal → binary via base 2; binary → decimal via <code>Σ digit × 2^place</code></p>',
  background: '<p>Binary is base two, the number system computers use because electronic circuits distinguish two states easily. Each position is a power of two, so converting to decimal means adding the weights of the set bits, while converting the other way means repeatedly dividing by two and recording the remainders. The place-value logic is identical to decimal, just with two symbols.</p>',
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
  formula: '<p>Decimal → hexadecimal via base 16; hexadecimal → decimal via <code>Σ digit × 16^place</code></p>',
  background: '<p>Hexadecimal is base sixteen, written with the digits 0 to 9 and the letters A to F, and it is popular in computing because one hex digit maps exactly onto four binary bits. That makes it a compact shorthand for memory addresses, colour codes and byte values. Conversion follows the same place-value rules as any other base.</p>',
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
  formula: '<p><code>Decimal = parse(n, fromBase)</code>, then <code>Decimal.toString(toBase)</code></p>',
  background: '<p>Any integer can be written in any base by grouping powers of that base, and conversion between two non-decimal bases is usually done through decimal as a common intermediate. Bases above ten need extra symbols for the digits, which is where the letters from ten upwards come from. This arithmetic underlies computer representations, numeral systems and historical counting schemes such as base sixty.</p>',
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
  formula: '<p>Number → Roman by subtracting <code>1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1</code> in order; Roman → number by <code>Σ ±value</code>, subtracting a value when a smaller symbol precedes a larger one.</p>',
  background: '<p>Roman numerals use a small set of letters with subtractive notation, so IV means one before five and IX means one before ten. The symbols were standard across Europe for centuries and survive on clock faces, monuments and copyright dates. Conversion is a matter of matching the largest usable subtractive pair at each step.</p>',
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
  formula: '<p><code>Value = digit × 10^place</code> for each digit of the number</p>',
  background: '<p>Place value is the principle that a digit means different amounts depending on its position, so the 3 in 300 is worth a hundred times the 3 in 3. It is the foundation of the base-ten algorithms for addition, subtraction and multiplication, and it explains why carrying and borrowing involve exchanging ten of one column for one of the next. The same principle extends to decimals, where each move to the right divides the weight by ten.</p>',
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
  formula: '<p><code>a + b</code> or <code>a − b</code> depending on the chosen operation</p>',
  background: '<p>Adding and subtracting signed numbers is where most students first meet the rules for negatives: adding a negative moves left on the number line, and subtracting a negative is the same as adding a positive. These rules keep arithmetic consistent with the number line and with the requirement that subtraction undoes addition. They apply whenever balances, temperatures or displacements fall below zero.</p>',
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
  background: '<p>The diamond problem supplies a sum and a product and asks for the two numbers, a format used in algebra classes as a warm-up for factoring quadratics. The pair are the roots of a quadratic equation, so the quadratic formula or simple inspection both work. It is the same step used when factoring a trinomial by finding two numbers that add to the middle coefficient and multiply to the constant term.</p>',
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
  formula: '<p><code>n mod 2 = 0 → Even</code>, otherwise Odd</p>',
  background: '<p>Odd and even are decided by the remainder on division by two, the simplest possible parity test. Parity is used in programming for alternating rows and low-level bit tricks, in error checking, and in school arithmetic to predict whether a sum or product will be odd or even. Even numbers are exactly the multiples of two.</p>',
  calculate: function(v) { return { 'Result': v.n % 2 === 0 ? 'Even' : 'Odd' }; }
});

R('continued-fraction', {
  title: 'Continued Fraction Calculator',
  description: 'Express a number as a continued fraction.',
  tags: ['continued', 'fraction'],
  fields: [{ id: 'n', label: 'Number', type: 'number', step: 0.0001, placeholder: 'e.g. 3.245' }],
  formula: '<p><code>x = a₀ + 1/(a₁ + 1/(a₂ + …))</code> with <code>a₀ = floor(x)</code> and <code>x ← 1/(x − a₀)</code></p>',
  background: '<p>A continued fraction writes a number as nested reciprocals of its integer parts, obtained by repeatedly removing the integer part and inverting the remainder. Its convergents give excellent rational approximations, which is why 355/113 is such a good stand-in for pi. The representation also appears in the theory of quadratic irrationals and in optimal scheduling problems.</p>',
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
  formula: '<p><code>x = whole + (N − P) / ((10^r − 1) × 10^nr)</code> where N = non-repeating + repeating digits, P = non-repeating digits, r = repeating length, nr = non-repeating length.</p>',
  background: '<p>A repeating decimal has a block of digits that recurs forever, which happens whenever the reduced denominator has a prime factor other than 2 or 5. The conversion exploits the fact that multiplying by a power of ten shifts the repeating block, so subtracting the original value cancels the infinite tail. The outcome is an exact fraction, unlike the truncated decimal a calculator displays.</p>',
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

// === ADDITIONAL CALCULATORS ===

R('significant-figures-rounding', {
  title: 'Significant Figures Rounding Calculator',
  description: 'Round a number to a specified number of significant figures.',
  tags: ['significant', 'figures', 'rounding', 'sig figs'],
  fields: [
    { id: 'n', label: 'Number', type: 'number', step: 0.0001, placeholder: 'e.g. 12345.67' },
    { id: 'sf', label: 'Significant Figures', type: 'number', step: 1, min: 1, max: 15, placeholder: 'e.g. 3' },
  ],
  formula: '<p><code>Rounded = n</code> rounded to <code>sf</code> significant figures</p>',
  background: '<p>Rounding to significant figures keeps a result at the precision of its least precise input, which is the standard convention in science. The first non-zero digit is the first significant one, and rounding proceeds from there regardless of where the decimal point sits. This differs from rounding to decimal places, which counts positions relative to the point.</p>',
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
  formula: '<p><code>Rounded = n</code> to <code>places</code> decimals; <code>Ceiling = ⌈n × 10^places⌉ / 10^places</code>, <code>Floor = ⌊n × 10^places⌋ / 10^places</code></p>',
  background: '<p>Rounding to a number of decimal places or to a nearby multiple is used whenever a value must be reported at a fixed precision. Ceiling and floor round consistently in one direction instead of to the nearest value, which is what billing, stock counts and page counts actually require. When large quantities are involved the direction of rounding can matter more than the rule used for ties.</p>',
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
  formula: '<p>Scales by <code>10^places</code>, then applies half-up, half-down, half-even (banker rounding), ceiling and floor, and scales back.</p>',
  background: '<p>Rounding methods differ mainly in how they treat an exact half. Round half up is the school default and is easy to explain, but applied to a long financial series it biases totals upward, so half to even, known as bankers rounding, sends halves alternately up and down to keep sums balanced. Ceiling and floor are used when a value must never fall below or exceed the true amount.</p>',
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
  formula: '<p><code>Nearest = round(n / m) × m</code>. <code>Up = ⌈n/m⌉ × m</code>, <code>Down = ⌊n/m⌋ × m</code></p>',
  background: '<p>Rounding to a multiple of a fixed step is common when goods come in packs, prices in nickels, or times in quarter hours. Scaling by the step, rounding to a whole number of steps and scaling back performs the operation exactly. Rounding up or down rather than to nearest is appropriate when the constraint is one-sided, such as buying enough tiles to cover a floor.</p>',
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
  formula: '<p><code>Decimal = whole + n / d</code></p>',
  background: '<p>A mixed number combines a whole count with a fractional part, and its decimal form is the whole plus the decimal of the fraction. The conversion is useful when a measurement given in feet and inches or in cups has to go into a calculator or spreadsheet. Repeating fractions produce rounded decimals, so the exact mixed form is preferable for further algebra.</p>',
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
  formula: '<p><code>Percent = (whole + n / d) × 100</code></p>',
  background: '<p>Converting a mixed number to a percentage restates the quantity out of one hundred, the form used for scores and rates. The fractional part is evaluated as a decimal first, then the whole total is scaled by a hundred. The result may need rounding when the fraction repeats.</p>',
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
  formula: '<p>Converts each mixed number to <code>w + n/d</code>, applies the chosen operation, then converts the result back to mixed and improper form.</p>',
  background: '<p>Mixed numbers are the everyday way to write improper fractions, and arithmetic on them is easier after converting to improper fractions and back again. This mirrors how measurements are read, such as two and three quarters, while the calculation itself stays symbolic. Showing both forms in the answer helps check the result against the original quantities.</p>',
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
  formula: '<p>Sorts fractions by decimal value <code>n/d</code>, ascending or descending.</p>',
  background: '<p>Ordering fractions requires comparing their sizes, which is easiest by converting each to a decimal or to a common denominator. Sorting is used in data handling, in ranking scores and in checking that a series of measurements is monotonic. Ties arise exactly when two fractions are equivalent.</p>',
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
  formula: '<p><code>Simplified = (n ÷ GCF) / (d ÷ GCF)</code></p>',
  background: '<p>Reducing a fraction divides out the factors shared by numerator and denominator, giving the form with the smallest possible terms. The value is unchanged because both terms are scaled by the same factor. Simplified fractions are easier to compare, to add and to recognise as familiar quantities.</p>',
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
  formula: '<p><code>LCD = LCM(d₁, d₂)</code></p>',
  background: '<p>The least common denominator is the smallest number that every denominator divides, so it is the natural common ground for adding or comparing fractions. It is the least common multiple of the denominators, which keeps the intermediate numerators as small as possible. Any common multiple would work, but the least one reduces the chance of arithmetic slips.</p>',
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
  formula: '<p><code>Multiples = n × i</code> for i = 1…count</p>',
  background: '<p>Multiples of a number are the results of multiplying it by the whole numbers, and they are the basis for common denominators, least common multiples and times-table fluency. Listing them makes visible the repeating pattern that modular arithmetic formalises. The first multiple is the number itself, or zero if the count begins there.</p>',
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
  formula: '<p><code>a × b = Σ (a × digitᵢ × 10^i)</code>, accumulated as lattice partial products.</p>',
  background: '<p>Lattice multiplication is a grid method used historically in India, the Arab world and Renaissance Europe, and it is still taught as an alternative to the standard algorithm. Each cell holds the product of one digit from each number, split diagonally into tens and units, and summing along the diagonals performs all the carrying at once. It makes the place-value structure of multiplication visible at the cost of more writing.</p>',
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
  formula: '<p><code>dividend = quotient × divisor + remainder</code>, built digit by digit from left to right.</p>',
  background: '<p>Long division is the written algorithm for dividing multi-digit numbers, and it works by repeatedly taking the largest multiple of the divisor that fits, recording it, and carrying the remainder into the next place. That is why the identity linking dividend, quotient, divisor and remainder holds, and why the remainder is always smaller than the divisor. It is taught in primary school as the bridge from known division facts to division of arbitrary numbers.</p>',
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
  formula: '<p><code>Result = dividend / divisor</code>, shown with repeated subtraction steps.</p>',
  background: '<p>When a division does not come out evenly, the process continues past the decimal point by bringing down zeros, which is why a terminating decimal or a repeating pattern eventually appears. Each brought-down zero adds one decimal place to the quotient. The method is the same long division algorithm, with the decimal point tracked separately.</p>',
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
  formula: '<p><code>a × b = Σ a × digitᵢ × 10^i</code>, summed as partial products.</p>',
  background: '<p>Long multiplication splits one factor into its place-value parts, multiplies the other factor by each part, and adds the partial products. This is a direct use of the distributive law, and the trailing zeros in each row reflect the place value of the digit being used. It is the standard paper method taught before calculators take over.</p>',
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
  formula: '<p><code>Sum = Σ numbers</code>, added column by column from right to left with carries.</p>',
  background: '<p>Long addition aligns numbers by place value and adds column by column from the right, carrying ten units into the next column whenever a column reaches ten. The carry is not a trick but a consequence of base ten, in which ten ones are exactly one ten. Lining up the decimal points before starting is what keeps the columns meaningful.</p>',
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
  formula: '<p><code>Result = a − b</code>, computed column by column with borrowing (regrouping).</p>',
  background: '<p>Long subtraction borrows from the next column when a digit is too small to subtract from, exchanging one unit of the higher place for ten of the lower. Regrouping leaves the total value unchanged, which is why the answer is unaffected by the borrowing. Aligning the digits by place value is essential, especially when the numbers have different lengths.</p>',
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
  background: '<p>An expression evaluator applies the usual precedence rules and left-to-right associativity of arithmetic so that a typed expression means the same thing it would on paper. That makes it useful for quick multi-step checks without breaking a calculation into separate operations. Parentheses are always available to make the intended grouping explicit, and the tool deliberately accepts only numbers and the standard arithmetic operators so that nothing unexpected is executed.</p>',
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
  background: '<p>Solving a linear equation means undoing the operations applied to the unknown, in reverse order, until it stands alone. Subtracting the constant and then dividing by the coefficient is the two-step procedure taught in introductory algebra. If the coefficient is zero then either no value works or every value does, depending on the constant.</p>',
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
  formula: '<p><code>a : b</code> reduced by <code>GCF(round(a × 100), round(b × 100)) / 100</code>. <code>Decimal = a / b</code></p>',
  background: '<p>Simplifying a ratio divides both terms by their greatest common factor so that the comparison is stated in the smallest whole numbers. Decimal terms are first scaled to integers, because a ratio describes relative size rather than units. The simplified form is conventional in map scales, mixing instructions and gear ratios.</p>',
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
  formula: '<p><code>a : b</code> simplified, <code>Total Parts = a + b</code>, <code>A Share = Total × a/(a+b)</code>, <code>B Share = Total × b/(a+b)</code></p>',
  background: '<p>Ratios describe how a total is shared in fixed proportions, and the share belonging to each part is its term divided by the total number of parts. This is how profit splits, recipe scaling and mixtures of concrete or paint are calculated. Equivalent ratios are produced by scaling both terms by the same factor.</p>',
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
  background: '<p>Speed, distance and time are linked by the definition of speed as distance covered per unit time, so any one of them can be found from the other two. Units must be consistent, since mixing minutes with hours is the usual pitfall, which means conversions often come first. The relationship assumes a constant speed, an idealisation of most real journeys.</p>',
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
  background: '<p>A unit rate restates a price or rate as the amount per single unit, which is the fairest way to compare package sizes or fuel economy. It is found by dividing the total amount by the quantity, and the units of the answer follow from that division. Supermarkets print unit prices for exactly this comparison.</p>',
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
  formula: '<p><code>(a/b) / (c/d) = a × d / (b × c)</code>, then reduce by GCF.</p>',
  background: '<p>A complex fraction stacks one fraction over another, which happens when a rate is divided by a rate or when units cancel in a conversion. Multiplying by the reciprocal of the denominator flattens it into a single fraction. Reducing at the end gives the simplest exact answer.</p>',
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
  formula: '<p>Accumulates number words: small values are summed, and <code>hundred</code>, <code>thousand</code>, <code>million</code>, … multiply the running value.</p>',
  background: '<p>Turning number words into digits is a parsing problem with a consistent grammar: small numbers are summed, while scale words such as thousand and million multiply the group they follow. Hyphenated tens and decimal words have to be handled separately. The conversion is used in cheque processing, data entry and reading historical documents.</p>',
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
  formula: '<p><code>n × i</code> for i = 1…upTo</p>',
  background: '<p>Times tables are the memorised products of small integers, and generating them makes the commutative symmetry and the pattern of multiples visible. Fluency with tables underpins long multiplication, division and fraction arithmetic. A table can be produced for a single number or across a range.</p>',
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