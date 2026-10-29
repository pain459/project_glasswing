// Discrete Mathematics calculators
(function(reg) {
const R = reg.register.bind(reg, 'discretemathematics');

// === COMBINATIONS ===

R('combinations', {
  title: 'Combinations Calculator',
  description: 'Calculate the number of combinations C(n,r) = n! / (r!(n-r)!).',
  tags: ['combinations', 'nCr', 'choose', 'discrete math'],
  fields: [
    { id: 'n', label: 'n (total items)', type: 'number', step: 1, min: 0, max: 1000, placeholder: 'e.g. 10', half: true },
    { id: 'r', label: 'r (items to choose)', type: 'number', step: 1, min: 0, max: 1000, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>C(n,r) = n! / (r! × (n−r)!) = nCr</code></p>',
  background: '<p>A combination is a selection where the order of the chosen items does not matter, so the same committee or lottery ticket is counted once however it is listed. That is the difference from a permutation, which treats different orderings as different outcomes. The count appears throughout combinatorics, probability and computer science whenever a problem asks how many distinct groups can be formed from a larger pool.</p>',
  calculate: function(v) {
    if (v.r > v.n) return { error: 'r cannot be greater than n.' };
    const result = core.combinations(v.n, v.r);
    var out = {};
    out['C(' + v.n + ',' + v.r + ')'] = core.formatNumber(result, 0);
    out['Description'] = 'Ways to choose ' + v.r + ' items from ' + v.n + ' without regard to order';
    return out;
  }
});

// === PERMUTATIONS ===

R('permutations', {
  title: 'Permutations Calculator',
  description: 'Calculate the number of permutations P(n,r) = n! / (n-r)!.',
  tags: ['permutations', 'nPr', 'arrangements', 'discrete math'],
  fields: [
    { id: 'n', label: 'n (total items)', type: 'number', step: 1, min: 0, max: 1000, placeholder: 'e.g. 10', half: true },
    { id: 'r', label: 'r (items to arrange)', type: 'number', step: 1, min: 0, max: 1000, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>P(n,r) = n! / (n−r)! = nPr</code></p>',
  background: '<p>A permutation is an arrangement in which order matters, so the sequence ABC is distinct from CBA. It arises in rankings, seating plans, scheduling orders and password or key space estimates, where the position of each chosen item carries meaning. The count is always at least as large as the corresponding combination, because every unordered selection can be arranged in several ways.</p>',
  calculate: function(v) {
    if (v.r > v.n) return { error: 'r cannot be greater than n.' };
    const result = core.permutations(v.n, v.r);
    var out = {};
    out['P(' + v.n + ',' + v.r + ')'] = core.formatNumber(result, 0);
    out['Description'] = 'Ways to arrange ' + v.r + ' items from ' + v.n + ' with order mattering';
    return out;
  }
});

// === FACTORIAL ===

R('factorial', {
  title: 'Factorial Calculator',
  description: 'Calculate n! for a given number.',
  tags: ['factorial', 'n!', 'discrete math'],
  fields: [
    { id: 'n', label: 'n', type: 'number', step: 1, min: 0, max: 170, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>n! = n × (n−1) × (n−2) × ... × 2 × 1</code> and <code>0! = 1</code></p>',
  background: '<p>A factorial counts the number of ways to arrange a set of distinct objects in a line, since the first position has n choices, the next n−1, and so on down to one. The empty product is defined as 1 so that formulas for permutations and binomial coefficients work without special cases. Factorials grow extremely quickly, which is why they show up in complexity analysis and why practical computation switches to logarithms or Stirling\'s approximation beyond moderate sizes.</p>',
  calculate: function(v) {
    const result = core.factorial(v.n);
    var out = {};
    out[v.n + '!'] = core.formatNumber(result, 0);
    out['Digits'] = String(result).replace(/[^1-9]/g, '').length || 1;
    return out;
  }
});

// === PASCAL'S TRIANGLE ===

R('pascal-triangle', {
  title: "Pascal's Triangle Generator",
  description: 'Generate Pascal\'s Triangle up to a given row.',
  tags: ['pascal', 'triangle', 'binomial', 'coefficients'],
  fields: [
    { id: 'rows', label: 'Number of Rows', type: 'number', step: 1, min: 1, max: 20, placeholder: 'e.g. 10' },
  ],
  formula: '<p>Each entry is the sum of the two entries above it. Row n gives coefficients of (a+b)^n.</p>',
  background: '<p>Pascal\'s triangle is a triangular array in which every interior entry is the sum of the two above it, and each row lists the binomial coefficients of an expansion. It is the classic way to see combinations without factorials, since an entry counts the ways to choose that many items from the row\'s index. The same numbers appear in probability, in the coefficients of polynomial expansions and in the analysis of random walks.</p>',
  calculate: function(v) {
    const n = Math.min(v.rows, 20);
    let html = '<table style="margin:0 auto">';
    for (let i = 0; i < n; i++) {
      html += '<tr>';
      for (let j = 0; j <= i; j++) {
        const val = core.combinations(i, j);
        html += '<td style="text-align:center;padding:4px 12px">' + core.formatNumber(val, 0) + '</td>';
      }
      html += '</tr>';
    }
    html += '</table>';
    return { html };
  }
});

// === PARTITION ===

R('partition', {
  title: 'Integer Partition Calculator',
  description: 'Find the number of ways to partition an integer into sums of positive integers.',
  tags: ['partition', 'integer', 'sums', 'discrete math'],
  fields: [
    { id: 'n', label: 'Integer n', type: 'number', step: 1, min: 1, max: 50, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>p(n)</code> is the number of ways to write n as a sum of positive integers, disregarding order.</p>',
  background: '<p>An integer partition writes a whole number as a sum of positive integers where order is ignored, so 3+1 and 1+3 are the same partition of four. Partition numbers come up in number theory, in counting the ways to make change and in statistical mechanics when energy is distributed among identical states. The count grows quickly with n even though the individual partitions are simple to list for small values.</p>',
  calculate: function(v) {
    const n = Math.min(v.n, 50);
    const p = new Array(n + 1).fill(0);
    p[0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = i; j <= n; j++) {
        p[j] += p[j - i];
      }
    }
    // List partitions for small n
    let partitions = '';
    if (n <= 10) {
      const list = [];
      function find(target, min, current) {
        if (target === 0) { list.push(current.join(' + ')); return; }
        for (let i = Math.min(target, min); i >= 1; i--) {
          find(target - i, i, [].concat(current, i));
        }
      }
      find(n, n, []);
      partitions = '<p style="margin-top:.5rem">Partitions of ' + n + ':</p><ul style="max-height:200px;overflow:auto">';
      list.forEach(function(pt) { partitions += '<li>' + pt + '</li>'; });
      partitions += '</ul>';
    }
    var out = {};
    out['p(' + n + ')'] = p[n];
    out.html = partitions;
    return out;
  }
});

// === SUBSET ===

R('subset', {
  title: 'Subset Calculator',
  description: 'Calculate the number of subsets and the power set of a set.',
  tags: ['subset', 'power set', 'set theory', 'discrete math'],
  fields: [
    { id: 'n', label: 'Number of Elements', type: 'number', step: 1, min: 1, max: 20, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>|P(S)| = 2^n</code> where P(S) is the power set of S.</p>',
  background: '<p>A subset is any selection of elements taken from a set, including the empty set and the set itself, and the collection of all of them is called the power set. Each element is independently either in or out, so the total doubles with every element added. The idea underpins set theory, boolean logic and the bitmask technique used to enumerate combinations in programming.</p>',
  calculate: function(v) {
    const n = Math.min(v.n, 20);
    const totalSubsets = Math.pow(2, n);
    const properSubsets = totalSubsets - 1;
    let html = '';
    if (n <= 8) {
      var elements = [];
      for (let i = 1; i <= n; i++) elements.push('x' + i);
      var subsets = [];
      for (let mask = 0; mask < totalSubsets; mask++) {
        var s = [];
        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) s.push(elements[i]);
        }
        subsets.push(s.length === 0 ? '&#8709;' : '{' + s.join(', ') + '}');
      }
      html = '<p style="margin-top:.5rem">Power Set (' + totalSubsets + ' subsets):</p><ul style="max-height:300px;overflow:auto">';
      subsets.forEach(function(s) { html += '<li>' + s + '</li>'; });
      html += '</ul>';
    }
    return {
      'Total Subsets (2^n)': core.formatNumber(totalSubsets, 0),
      'Proper Subsets': core.formatNumber(properSubsets, 0),
      'Non-empty Subsets': core.formatNumber(totalSubsets - 1, 0),
      html: html,
    };
  }
});

// === VENN DIAGRAM (SET OPERATIONS) ===

R('venn-diagram', {
  title: 'Set Operations Calculator',
  description: 'Calculate union, intersection, difference, and complement of sets.',
  tags: ['set', 'union', 'intersection', 'Venn', 'discrete math'],
  fields: [
    { id: 'setA', label: 'Set A (comma-separated)', type: 'textarea', placeholder: 'e.g. 1, 2, 3, 4', hint: 'Elements of set A' },
    { id: 'setB', label: 'Set B (comma-separated)', type: 'textarea', placeholder: 'e.g. 3, 4, 5, 6', hint: 'Elements of set B' },
    { id: 'universe', label: 'Universe U (comma-separated)', type: 'textarea', placeholder: 'e.g. 1, 2, 3, 4, 5, 6, 7, 8', hint: 'Universal set' },
  ],
  formula: '<p>Union: A &#8743; B. Intersection: A &#8745; B. Difference: A &#8723; B. Complement: A\'. Symmetric Difference: A &#9651; B.</p>',
  background: '<p>Set operations describe how collections combine: union gathers everything in either set, intersection keeps only shared members, and difference removes one set from another. Venn diagrams make those relationships visual, and the same rules govern database queries, search filters and probability events. Inclusion–exclusion is the practical consequence, since adding the sizes of two sets double-counts their overlap unless it is subtracted.</p>',
  calculate: function(v) {
    var Aarr = v.setA.split(/[\s,;]+/).filter(function(x) { return x; });
    var Barr = v.setB.split(/[\s,;]+/).filter(function(x) { return x; });
    var Uarr = v.universe.split(/[\s,;]+/).filter(function(x) { return x; });
    var A = {}, B = {}, U = {};
    Aarr.forEach(function(x) { A[x] = true; });
    Barr.forEach(function(x) { B[x] = true; });
    Uarr.forEach(function(x) { U[x] = true; });
    var union = {}, inter = {}, diffAB = {}, diffBA = {}, compA = {}, compB = {}, symDiff = {};
    Object.keys(A).forEach(function(x) { union[x] = true; });
    Object.keys(B).forEach(function(x) { union[x] = true; });
    Object.keys(A).forEach(function(x) { if (B[x]) inter[x] = true; });
    Object.keys(A).forEach(function(x) { if (!B[x]) diffAB[x] = true; });
    Object.keys(B).forEach(function(x) { if (!A[x]) diffBA[x] = true; });
    Object.keys(U).forEach(function(x) { if (!A[x]) compA[x] = true; });
    Object.keys(U).forEach(function(x) { if (!B[x]) compB[x] = true; });
    Object.keys(diffAB).forEach(function(x) { symDiff[x] = true; });
    Object.keys(diffBA).forEach(function(x) { symDiff[x] = true; });
    var k = function(o) { return Object.keys(o).join(', '); };
    return {
      'A &#8743; B': '[ ' + k(union) + ' ]',
      'A &#8745; B': '[ ' + k(inter) + ' ]',
      'A &#8723; B': '[ ' + k(diffAB) + ' ]',
      'B &#8723; A': '[ ' + k(diffBA) + ' ]',
      "A' (complement)": '[ ' + k(compA) + ' ]',
      "B' (complement)": '[ ' + k(compB) + ' ]',
      'A &#9651; B (symmetric diff)': '[ ' + k(symDiff) + ' ]',
      '|A|': Aarr.length,
      '|B|': Barr.length,
      '|A &#8743; B|': Object.keys(union).length,
    };
  }
});

// === TRUTH TABLE ===

R('truth-table', {
  title: 'Truth Table Generator',
  description: 'Generate truth tables for logical expressions.',
  tags: ['truth table', 'logic', 'boolean', 'propositional'],
  fields: [
    { id: 'vars', label: 'Number of Variables', type: 'number', step: 1, min: 1, max: 4, placeholder: 'e.g. 2', half: true },
    { id: 'op', label: 'Operation', type: 'select', options: [
      { value: 'AND', label: 'AND (&#8743;)' },
      { value: 'OR', label: 'OR (&#8744;)' },
      { value: 'NAND', label: 'NAND' },
      { value: 'NOR', label: 'NOR' },
      { value: 'XOR', label: 'XOR (&#8853;)' },
      { value: 'IMPLIES', label: 'IMPLIES (&#8594;)' },
      { value: 'IFF', label: 'IFF (&#8660;)' },
      { value: 'NOT', label: 'NOT (&#172;) — first variable only' },
    ]},
  ],
  formula: '<p>Truth table shows all possible input combinations and the result of the logical operation.</p>',
  background: '<p>A truth table lists every possible assignment of true and false to the variables and the resulting value of a compound expression. With n variables there are exactly 2^n rows, which is why tables become unwieldy beyond a handful of inputs. The method is central to propositional logic, digital circuit design and formal verification, where it provides an exhaustive specification of behaviour.</p>',
  calculate: function(v) {
    const n = Math.min(v.vars, 4);
    const rows = Math.pow(2, n);
    let html = '<table><tr>';
    for (let i = 0; i < n; i++) html += '<th>P' + (i + 1) + '</th>';
    html += '<th>Result</th></tr>';
    for (let row = 0; row < rows; row++) {
      html += '<tr>';
      var vals = [];
      for (let i = 0; i < n; i++) {
        const bit = (row >> (n - 1 - i)) & 1;
        vals.push(bit);
        html += '<td>' + bit + '</td>';
      }
      var result;
      switch (v.op) {
        case 'AND': result = vals.every(function(x) { return x; }); break;
        case 'OR': result = vals.some(function(x) { return x; }); break;
        case 'NAND': result = !vals.every(function(x) { return x; }); break;
        case 'NOR': result = !vals.some(function(x) { return x; }); break;
        case 'XOR': result = vals.reduce(function(a, b) { return a ^ b; }, 0); break;
        case 'IMPLIES': result = !vals[0] || vals.slice(1).every(function(x) { return x; }); break;
        case 'IFF': result = vals[0] === vals.slice(1).every(function(x) { return x; }); break;
        case 'NOT': result = !vals[0]; break;
        default: result = vals.every(function(x) { return x; });
      }
      html += '<td>' + Number(result) + '</td></tr>';
    }
    html += '</table>';
    return { html };
  }
});

// === LOGICAL OPERATIONS ===

R('logical-operations', {
  title: 'Logical Operations Calculator',
  description: 'Evaluate logical operations on two boolean values.',
  tags: ['logic', 'boolean', 'AND', 'OR', 'NOT', 'XOR'],
  fields: [
    { id: 'p', label: 'P', type: 'select', options: [
      { value: '1', label: 'True' }, { value: '0', label: 'False' }
    ]},
    { id: 'q', label: 'Q', type: 'select', options: [
      { value: '1', label: 'True' }, { value: '0', label: 'False' }
    ]},
  ],
  formula: '<p>AND, OR, NOT, NAND, NOR, XOR, IMPLIES, IFF</p>',
  background: '<p>Boolean connectives combine truth values: conjunction is true only when both inputs are true, disjunction when at least one is, and negation flips a single value. Derived operators such as NAND, NOR and XOR are common in digital electronics because they map directly onto logic gates and can express any other connective. The same rules describe conditions in programming languages and filters in database systems.</p>',
  calculate: function(v) {
    const p = !!Number(v.p), q = !!Number(v.q);
    return {
      'P AND Q': p && q ? 'True' : 'False',
      'P OR Q': p || q ? 'True' : 'False',
      'NOT P': !p ? 'True' : 'False',
      'NOT Q': !q ? 'True' : 'False',
      'P NAND Q': !(p && q) ? 'True' : 'False',
      'P NOR Q': !(p || q) ? 'True' : 'False',
      'P XOR Q': (p !== q) ? 'True' : 'False',
      'P &#8594; Q (implies)': (!p || q) ? 'True' : 'False',
      'P &#8660; Q (iff)': (p === q) ? 'True' : 'False',
    };
  }
});

// === RELATION MATRIX ===

R('relation-matrix', {
  title: 'Relation Matrix Calculator',
  description: 'Analyze properties of a binary relation from its matrix representation.',
  tags: ['relation', 'matrix', 'reflexive', 'symmetric', 'transitive'],
  fields: [
    { id: 'size', label: 'Matrix Size (n&#215;n)', type: 'number', step: 1, min: 2, max: 6, placeholder: 'e.g. 3', half: true },
    { id: 'matrix', label: 'Matrix Entries (row by row, 0/1, comma-separated)', type: 'textarea', placeholder: 'e.g. 1,0,1, 0,1,0, 1,0,1', hint: 'n rows of n entries each, separated by commas or spaces' },
  ],
  formula: '<p>Reflexive: all diagonal = 1. Symmetric: M[i][j] = M[j][i]. Transitive: if M[i][j] and M[j][k] then M[i][k].</p>',
  background: '<p>A binary relation on a finite set can be written as a square matrix of zeros and ones, with a one marking each related pair. Properties such as reflexivity, symmetry and transitivity then become patterns in the matrix: a full diagonal, mirror symmetry, or closure under composition. Equivalence relations and partial orders built this way are the foundation of type systems, scheduling dependencies and database normalisation.</p>',
  calculate: function(v) {
    const n = Math.min(v.size, 6);
    const entries = v.matrix.split(/[\s,;]+/).map(Number).filter(function(x) { return x === 0 || x === 1; });
    if (entries.length !== n * n) return { error: 'Need exactly ' + (n * n) + ' entries of 0 or 1.' };
    var M = [];
    for (let i = 0; i < n; i++) M.push(entries.slice(i * n, (i + 1) * n));
    var reflexive = true, symmetric = true, transitive = true, antisymmetric = true;
    for (let i = 0; i < n; i++) {
      if (M[i][i] !== 1) reflexive = false;
      for (let j = 0; j < n; j++) {
        if (M[i][j] !== M[j][i]) symmetric = false;
        if (i !== j && M[i][j] && M[j][i]) antisymmetric = false;
        for (let k = 0; k < n; k++) {
          if (M[i][j] && M[j][k] && !M[i][k]) transitive = false;
        }
      }
    }
    return {
      'Reflexive': reflexive ? 'Yes' : 'No',
      'Symmetric': symmetric ? 'Yes' : 'No',
      'Transitive': transitive ? 'Yes' : 'No',
      'Antisymmetric': antisymmetric ? 'Yes' : 'No',
      'Equivalence Relation': (reflexive && symmetric && transitive) ? 'Yes' : 'No',
      'Partial Order': (reflexive && antisymmetric && transitive) ? 'Yes' : 'No',
    };
  }
});

// === GRAPH THEORY ===

R('graph-theory', {
  title: 'Basic Graph Theory Calculator',
  description: 'Analyze basic properties of a graph from its adjacency matrix.',
  tags: ['graph', 'adjacency', 'degree', 'vertices', 'edges'],
  fields: [
    { id: 'vertices', label: 'Number of Vertices', type: 'number', step: 1, min: 2, max: 8, placeholder: 'e.g. 4', half: true },
    { id: 'directed', label: 'Directed?', type: 'select', options: [
      { value: '0', label: 'Undirected' }, { value: '1', label: 'Directed' }
    ]},
    { id: 'matrix', label: 'Adjacency Matrix (0/1, row by row)', type: 'textarea', placeholder: 'e.g. 0,1,1,0, 1,0,0,1, 1,0,0,1, 0,1,1,0', hint: 'n rows of n entries' },
  ],
  formula: '<p>Counts vertices, edges, degrees, and checks connectivity properties.</p>',
  background: '<p>A graph is a set of vertices joined by edges, usually stored as an adjacency matrix in which a one records a connection between two vertices. Degrees count the edges touching each vertex, and in an undirected graph they must sum to twice the number of edges, which is the handshake lemma. Graphs model networks, road maps, dependency graphs and social connections, so properties such as regular or connected are the first things checked.</p>',
  calculate: function(v) {
    const n = Math.min(v.vertices, 8);
    const directed = !!Number(v.directed);
    const entries = v.matrix.split(/[\s,;]+/).map(Number).filter(function(x) { return x === 0 || x === 1; });
    if (entries.length !== n * n) return { error: 'Need exactly ' + (n * n) + ' entries.' };
    var M = [];
    for (let i = 0; i < n; i++) M.push(entries.slice(i * n, (i + 1) * n));
    var edges = 0;
    var degrees = [];
    var inDeg = [], outDeg = [];
    for (let i = 0; i < n; i++) {
      var d = 0, ind = 0, outd = 0;
      for (let j = 0; j < n; j++) {
        if (M[i][j]) {
          if (directed) { outd++; if (i !== j) edges++; }
          else if (i < j) edges++;
        }
        if (directed && M[j][i]) ind++;
      }
      d = directed ? outd : M[i].reduce(function(s, val) { return s + val; }, 0);
      degrees.push(d);
      inDeg.push(ind);
      outDeg.push(outd);
    }
    var html = '<table><tr><th>Vertex</th><th>Degree</th>';
    if (directed) html += '<th>In-degree</th><th>Out-degree</th>';
    html += '</tr>';
    for (let i = 0; i < n; i++) {
      html += '<tr><td>v' + (i + 1) + '</td><td>' + degrees[i] + '</td>';
      if (directed) html += '<td>' + inDeg[i] + '</td><td>' + outDeg[i] + '</td>';
      html += '</tr>';
    }
    html += '</table>';
    var maxDeg = Math.max.apply(null, degrees);
    var minDeg = Math.min.apply(null, degrees);
    var isRegular = degrees.every(function(d) { return d === degrees[0]; });
    return {
      'Vertices': n,
      'Edges': edges,
      'Max Degree (&#916;)': maxDeg,
      'Min Degree (&#948;)': minDeg,
      'Regular Graph': isRegular ? 'Yes' : 'No',
      html: html,
    };
  }
});

// === COMBINATIONS WITH REPLACEMENT ===

R('combinationsreplacement', {
  title: 'Combinations with Replacement Calculator',
  description: 'Calculate combinations with replacement C(n+r-1, r).',
  tags: ['combinations', 'replacement', 'multiset', 'discrete math'],
  fields: [
    { id: 'n', label: 'n (types of items)', type: 'number', step: 1, min: 1, max: 1000, placeholder: 'e.g. 5', half: true },
    { id: 'r', label: 'r (items to choose)', type: 'number', step: 1, min: 0, max: 1000, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>C(n+r−1, r) = (n+r−1)! / (r! × (n−1)!) = C(n+r−1, n−1)</code></p>',
  background: '<p>Combinations with replacement count selections where the same item may be chosen more than once and order is still irrelevant, such as scooping several flavours of ice cream. The standard trick, often called stars and bars, turns the problem into arranging dividers among the chosen items. It appears in combinatorics, in counting non-negative integer solutions to equations and in allocating identical resources among distinct recipients.</p>',
  calculate: function(v) {
    if (v.n < 1) return { error: 'n must be at least 1.' };
    const result = core.combinations(v.n + v.r - 1, v.r);
    var out = {};
    out['C(' + v.n + '+' + v.r + '−1, ' + v.r + ')'] = core.formatNumber(result, 0);
    out['Description'] = 'Ways to choose ' + v.r + ' items from ' + v.n + ' types with replacement allowed';
    return out;
  }
});

// === EVEN PERMUTATIONS ===

R('evenpermutations', {
  title: 'Even Permutations Calculator',
  description: 'Calculate the number of even permutations of n elements.',
  tags: ['even permutations', 'alternating group', 'discrete math'],
  fields: [
    { id: 'n', label: 'n (elements)', type: 'number', step: 1, min: 1, max: 20, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>Even Permutations = n! / 2</code> for n ≥ 2. The even permutations form the alternating group A_n.</p>',
  background: '<p>Every permutation of n distinct items can be built from swaps, and its parity is whether that number of swaps is even or odd. For any n of two or more, exactly half of the n! permutations are even, and those even ones form the alternating group. Parity matters in linear algebra through the determinant, and in puzzles such as the fifteen-puzzle, where only positions of matching parity are reachable.</p>',
  calculate: function(v) {
    if (v.n === 1) return { 'Even Permutations': 1, 'Description': 'Only the identity permutation' };
    const nf = core.factorial(v.n);
    const even = Math.floor(nf / 2);
    return {
      'n!': core.formatNumber(nf, 0),
      'Even Permutations (n!/2)': core.formatNumber(even, 0),
      'Description': 'Half of all permutations are even (alternating group A_' + v.n + ')',
    };
  }
});

// === FACTORIALS (alias for factorial) ===

R('factorials', {
  title: 'Factorial Calculator n!',
  description: 'Calculate n! for a given number.',
  tags: ['factorial', 'n!', 'discrete math'],
  fields: [
    { id: 'n', label: 'n', type: 'number', step: 1, min: 0, max: 170, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>n! = n × (n−1) × (n−2) × ... × 2 × 1</code> and <code>0! = 1</code></p>',
  background: '<p>This is the same factorial used throughout combinatorics, counting the orderings of n distinct objects and forming the building block of permutations and binomial coefficients. The definition extends to zero as 1, the empty product, so formulas need no separate case. Values exceed the exact range of ordinary floating point around 170!, which is why calculators cap input there.</p>',
  calculate: function(v) {
    const result = core.factorial(v.n);
    var out = {};
    out[v.n + '!'] = core.formatNumber(result, 0);
    out['Digits'] = String(result).replace(/[^1-9]/g, '').length || 1;
    return out;
  }
});

// === FIBONACCI ===

R('fibonacci-calculator', {
  title: 'Fibonacci Sequence Calculator',
  description: 'Generate the Fibonacci sequence up to a given term or value.',
  tags: ['fibonacci', 'sequence', 'series', 'discrete math'],
  fields: [
    { id: 'n', label: 'Number of Terms', type: 'number', step: 1, min: 1, max: 80, placeholder: 'e.g. 15' },
  ],
  formula: '<p><code>F(0) = 0, F(1) = 1, F(n) = F(n−1) + F(n−2)</code></p>',
  background: '<p>The Fibonacci sequence starts with 0 and 1 and adds the two previous terms, producing 0, 1, 1, 2, 3, 5 and so on. It appears in models of population growth, in the branching of plants, and in computer science as the worst case for the Euclidean algorithm and as a source of test data. The ratio of successive terms converges on the golden ratio, which is why the sequence is often introduced alongside it.</p>',
  calculate: function(v) {
    const n = Math.min(v.n, 80);
    var fib = [0, 1];
    for (var i = 2; i < n; i++) {
      fib.push(fib[i - 1] + fib[i - 2]);
    }
    var html = '<table><tr><th>n</th><th>F(n)</th></tr>';
    for (var i = 0; i < n; i++) {
      html += '<tr><td>' + i + '</td><td>' + core.formatNumber(fib[i], 0) + '</td></tr>';
    }
    html += '</table>';
    return {
      ['F(' + (n - 1) + ')']: core.formatNumber(fib[n - 1], 0),
      ['Sum of first ' + n + ' terms']: core.formatNumber(fib.slice(0, n).reduce(function(a, b) { return a + b; }, 0), 0),
      html: html,
    };
  }
});

// === MULTIFACTORIALS ===

R('multifactorials', {
  title: 'Multifactorial Calculator',
  description: 'Calculate double, triple, and higher-order multifactorials.',
  tags: ['multifactorial', 'double factorial', 'triple factorial', 'discrete math'],
  fields: [
    { id: 'n', label: 'n', type: 'number', step: 1, min: 0, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'k', label: 'k (order)', type: 'number', step: 1, min: 1, max: 10, placeholder: 'e.g. 2', half: true },
  ],
  formula: '<p><code>n!_k = n × (n−k) × (n−2k) × ... </code> stopping before reaching ≤ 0. For k=1 it is the ordinary factorial.</p>',
  background: '<p>A multifactorial steps down by a fixed interval instead of by one, so the double factorial takes every second term and the triple factorial every third. These products appear in combinatorics when counting pairings and in calculus when integrating powers of sine and cosine. The ordinary factorial is the special case where the step is one.</p>',
  calculate: function(v) {
    var result = 1;
    for (var i = v.n; i > 0; i -= v.k) {
      result *= i;
    }
    return {
      ['n!_k (' + v.n + '!' + '!'.repeat(v.k - 1) + ')']: core.formatNumber(result, 0),
      'Description': v.k === 1 ? 'Ordinary factorial' : v.k === 2 ? 'Double factorial' : v.k === 3 ? 'Triple factorial' : v.k + '-factorial',
    };
  }
});

// === ODD PERMUTATIONS ===

R('oddpermutations', {
  title: 'Odd Permutations Calculator',
  description: 'Calculate the number of odd permutations of n elements.',
  tags: ['odd permutations', 'alternating group', 'discrete math'],
  fields: [
    { id: 'n', label: 'n (elements)', type: 'number', step: 1, min: 1, max: 20, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>Odd Permutations = n! / 2</code> for n ≥ 2. The odd permutations are those not in the alternating group A_n.</p>',
  background: '<p>An odd permutation needs an odd number of swaps to reach the identity, which makes it the complement of the even permutations within the symmetric group. For n of two or more the two classes are equal in size, and there is no odd permutation of a single element. Swapping any two items flips parity, a fact used in proofs about reachable configurations in sliding puzzles and in the theory of the determinant.</p>',
  calculate: function(v) {
    if (v.n === 1) return { 'Odd Permutations': 0, 'Description': 'No odd permutations for a single element' };
    const nf = core.factorial(v.n);
    const odd = Math.floor(nf / 2);
    return {
      'n!': core.formatNumber(nf, 0),
      'Odd Permutations (n!/2)': core.formatNumber(odd, 0),
      'Description': 'Half of all permutations are odd',
    };
  }
});

// === PASCAL'S TRIANGLE (alias) ===

R('pascals-triangle', {
  title: "Pascal's Triangle Generator",
  description: 'Generate Pascal\'s Triangle up to a given row.',
  tags: ['pascal', 'triangle', 'binomial', 'coefficients'],
  fields: [
    { id: 'rows', label: 'Number of Rows', type: 'number', step: 1, min: 1, max: 20, placeholder: 'e.g. 10' },
  ],
  formula: '<p>Each entry is the sum of the two entries above it. Row n gives coefficients of (a+b)^n.</p>',
  background: '<p>Rows of Pascal\'s triangle give the binomial coefficients, so the array is a compact table of combination counts for small n. Each entry is formed by adding the two above it, a recurrence that mirrors the identity relating consecutive binomial coefficients. The triangle is used in probability, algebra and the study of fractals, where its pattern of odd entries produces the Sierpinski triangle.</p>',
  calculate: function(v) {
    const n = Math.min(v.rows, 20);
    let html = '<table style="margin:0 auto">';
    for (let i = 0; i < n; i++) {
      html += '<tr>';
      for (let j = 0; j <= i; j++) {
        const val = core.combinations(i, j);
        html += '<td style="text-align:center;padding:4px 12px">' + core.formatNumber(val, 0) + '</td>';
      }
      html += '</tr>';
    }
    html += '</table>';
    return { html };
  }
});

// === CIRCULAR PERMUTATIONS ===

R('permutationscircular', {
  title: 'Circular Permutations Calculator',
  description: 'Calculate the number of circular permutations (n−1)!.',
  tags: ['circular permutations', 'arrangements', 'discrete math'],
  fields: [
    { id: 'n', label: 'n (items)', type: 'number', step: 1, min: 1, max: 170, placeholder: 'e.g. 6' },
  ],
  formula: '<p><code>Circular Permutations = (n − 1)!</code></p>',
  background: '<p>A circular permutation arranges items around a ring, where rotating the whole arrangement does not create a new one. Fixing one item in place removes that rotational symmetry and reduces the count to the factorial of one less than the number of items. Seating plans, round-table schedules and necklace or bracelet patterns are the usual examples.</p>',
  calculate: function(v) {
    const result = core.factorial(v.n - 1);
    return {
      '(n−1)!': core.formatNumber(result, 0),
      'Description': 'Ways to arrange ' + v.n + ' distinct items in a circle',
    };
  }
});

// === PERMUTATIONS WITH REPLACEMENT ===

R('permutationsreplacement', {
  title: 'Permutations with Replacement Calculator',
  description: 'Calculate permutations with replacement n^r.',
  tags: ['permutations', 'replacement', 'arrangements', 'discrete math'],
  fields: [
    { id: 'n', label: 'n (types of items)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'r', label: 'r (positions)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>P = n^r</code></p>',
  background: '<p>Permutations with replacement allow the same item to be used more than once in each position, so every slot has the full set of choices independently. Passwords, PIN codes and strings over a fixed alphabet are the standard examples, and the result grows exponentially with the number of positions. It is the ordered counterpart of combinations with replacement.</p>',
  calculate: function(v) {
    const result = Math.pow(v.n, v.r);
    return {
      'n^r': core.formatNumber(result, 0),
      'Description': 'Ways to arrange ' + v.r + ' positions from ' + v.n + ' types with replacement allowed',
    };
  }
});

})(calculatorRegistry);
