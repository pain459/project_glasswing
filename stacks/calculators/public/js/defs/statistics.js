// Statistics calculators
(function(reg) {
const R = reg.register.bind(reg, 'statistics');

// === DESCRIPTIVE STATISTICS ===

R('descriptivestatistics', {
  title: 'Descriptive Statistics Calculator',
  description: 'Calculate mean, median, mode, standard deviation, variance, range, quartiles, and more.',
  tags: ['descriptive', 'mean', 'median', 'mode', 'std dev', 'variance', 'quartiles'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 12, 15, 18, 22, 25, 28, 30, 35', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p>Computes the full set of descriptive statistics for your data including measures of central tendency, dispersion, and position.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const mean = core.mean(data);
    const median = core.median(data);
    const mode = core.mode(data);
    const stdDev = core.stdDev(data);
    const popStdDev = core.popStdDev(data);
    const varSample = core.variance(data);
    const varPop = popStdDev ** 2;
    const min = sorted[0], max = sorted[n - 1];
    const range = max - min;
    const sum = data.reduce((s, v) => s + v, 0);
    // Quartiles
    const q1Idx = (n - 1) * 0.25, q3Idx = (n - 1) * 0.75;
    const q1 = sorted[Math.floor(q1Idx)] + (sorted[Math.ceil(q1Idx)] - sorted[Math.floor(q1Idx)]) * (q1Idx % 1);
    const q3 = sorted[Math.floor(q3Idx)] + (sorted[Math.ceil(q3Idx)] - sorted[Math.floor(q3Idx)]) * (q3Idx % 1);
    const iqr = q3 - q1;
    return {
      'Count (n)': n,
      'Sum': core.formatNumber(sum),
      'Mean': core.formatNumber(mean),
      'Median': core.formatNumber(median),
      'Mode': mode.length ? mode.join(', ') : 'None',
      'Sample Std Dev': core.formatNumber(stdDev),
      'Population Std Dev': core.formatNumber(popStdDev),
      'Sample Variance': core.formatNumber(varSample),
      'Population Variance': core.formatNumber(varPop),
      'Range': core.formatNumber(range),
      'Minimum': core.formatNumber(min),
      'Maximum': core.formatNumber(max),
      'Q1 (25th percentile)': core.formatNumber(q1),
      'Q3 (75th percentile)': core.formatNumber(q3),
      'IQR': core.formatNumber(iqr),
    };
  }
});

R('mean-median-mode', {
  title: 'Mean, Median, Mode Calculator',
  description: 'Calculate the mean, median, and mode of a data set.',
  tags: ['mean', 'median', 'mode', 'central tendency'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 5, 10, 15, 10, 20, 25, 10', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p><code>Mean = Sum / n</code>. Median is the middle value. Mode is the most frequent value.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const mean = core.mean(data);
    const median = core.median(data);
    const mode = core.mode(data);
    return {
      'Mean': core.formatNumber(mean),
      'Median': core.formatNumber(median),
      'Mode': mode.length ? mode.join(', ') : 'No mode (all values unique)',
      'Count': data.length,
    };
  }
});

R('standard-deviation', {
  title: 'Standard Deviation Calculator',
  description: 'Calculate sample and population standard deviation.',
  tags: ['standard deviation', 'std dev', 'spread', 'dispersion'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 4, 8, 15, 16, 23, 42', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p><code>s = sqrt(Sum(x - mean)² / (n-1))</code> for sample. <code>σ = sqrt(Sum(x - mean)² / n)</code> for population.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 2) return { error: 'Enter at least two numbers' };
    const mean = core.mean(data);
    const s = core.stdDev(data);
    const sigma = core.popStdDev(data);
    const deviations = data.map(x => ({
      value: x,
      deviation: x - mean,
      sqDev: (x - mean) ** 2,
    }));
    let rows = deviations.map(d =>
      `<tr><td>${core.formatNumber(d.value)}</td><td>${core.formatNumber(d.deviation)}</td><td>${core.formatNumber(d.sqDev)}</td></tr>`
    ).join('');
    return {
      html: `<p><strong>Sample Std Dev (s):</strong> ${core.formatNumber(s)}</p>
        <p><strong>Population Std Dev (σ):</strong> ${core.formatNumber(sigma)}</p>
        <p><strong>Mean:</strong> ${core.formatNumber(mean)}</p>
        <table><tr><th>Value</th><th>Deviation</th><th>Squared Dev</th></tr>${rows}</table>`
    };
  }
});

R('variance', {
  title: 'Variance Calculator',
  description: 'Calculate sample and population variance of a data set.',
  tags: ['variance', 'spread', 'dispersion'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 10, 12, 14, 16, 18', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p><code>s² = Sum(x - mean)² / (n-1)</code> for sample. <code>σ² = Sum(x - mean)² / n</code> for population.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 2) return { error: 'Enter at least two numbers' };
    const mean = core.mean(data);
    const s2 = core.variance(data);
    const sigma2 = core.popStdDev(data) ** 2;
    const ss = data.reduce((s, x) => s + (x - mean) ** 2, 0);
    return {
      'Sample Variance (s²)': core.formatNumber(s2),
      'Population Variance (σ²)': core.formatNumber(sigma2),
      'Sum of Squares (SS)': core.formatNumber(ss),
      'Mean': core.formatNumber(mean),
      'Count (n)': data.length,
    };
  }
});

// === SCORES & INTERVALS ===

R('z-score', {
  title: 'Z-Score Calculator',
  description: 'Calculate the z-score for a value given the mean and standard deviation.',
  tags: ['z-score', 'standard score', 'normalization'],
  fields: [
    { id: 'value', label: 'Value (x)', type: 'number', step: 0.01, placeholder: 'e.g. 85' },
    { id: 'mean', label: 'Mean (μ)', type: 'number', step: 0.01, placeholder: 'e.g. 75', half: true },
    { id: 'stddev', label: 'Std Dev (σ)', type: 'number', step: 0.01, min: 0.001, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>z = (x − μ) / σ</code></p>',
  calculate: function(v) {
    if (!v.value || v.mean === undefined || !v.stddev) return { error: 'Enter all values' };
    const z = (v.value - v.mean) / v.stddev;
    let interpretation = '';
    if (z > 2) interpretation = 'Well above the mean (top ~2.5%)';
    else if (z > 1) interpretation = 'Above the mean (top ~16%)';
    else if (z > 0) interpretation = 'Slightly above the mean';
    else if (z === 0) interpretation = 'Exactly at the mean';
    else if (z > -1) interpretation = 'Slightly below the mean';
    else if (z > -2) interpretation = 'Below the mean (bottom ~16%)';
    else interpretation = 'Well below the mean (bottom ~2.5%)';
    return {
      'Z-Score': core.formatNumber(z, 4),
      'Value (x)': core.formatNumber(v.value),
      'Interpretation': interpretation,
    };
  }
});

R('t-score', {
  title: 'T-Score Calculator',
  description: 'Calculate the t-score for a sample mean.',
  tags: ['t-score', 't-statistic', 'small sample'],
  fields: [
    { id: 'sampleMean', label: 'Sample Mean (x̄)', type: 'number', step: 0.01, placeholder: 'e.g. 78' },
    { id: 'popMean', label: 'Population Mean (μ)', type: 'number', step: 0.01, placeholder: 'e.g. 75', half: true },
    { id: 'stdDev', label: 'Sample Std Dev (s)', type: 'number', step: 0.01, min: 0.001, placeholder: 'e.g. 10', half: true },
    { id: 'sampleSize', label: 'Sample Size (n)', type: 'number', step: 1, min: 2, placeholder: 'e.g. 30', half: true },
  ],
  formula: '<p><code>t = (x̄ − μ) / (s / √n)</code></p>',
  calculate: function(v) {
    if (!v.sampleMean || v.popMean === undefined || !v.stdDev || !v.sampleSize) return { error: 'Enter all values' };
    const se = v.stdDev / Math.sqrt(v.sampleSize);
    const t = (v.sampleMean - v.popMean) / se;
    const df = v.sampleSize - 1;
    return {
      'T-Score': core.formatNumber(t, 4),
      'Standard Error': core.formatNumber(se, 4),
      'Degrees of Freedom': df,
      'Sample Size': v.sampleSize,
    };
  }
});

R('confidence-interval', {
  title: 'Confidence Interval Calculator',
  description: 'Calculate the confidence interval for a population mean.',
  tags: ['confidence interval', 'CI', 'margin of error'],
  fields: [
    { id: 'sampleMean', label: 'Sample Mean (x̄)', type: 'number', step: 0.01, placeholder: 'e.g. 75' },
    { id: 'stdDev', label: 'Std Dev (σ or s)', type: 'number', step: 0.01, min: 0.001, placeholder: 'e.g. 10', half: true },
    { id: 'sampleSize', label: 'Sample Size (n)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 100', half: true },
    { id: 'confidence', label: 'Confidence Level', type: 'select', options: [
      { value: '90', label: '90%' }, { value: '95', label: '95%', default: true }, { value: '99', label: '99%' }
    ]},
  ],
  formula: '<p><code>CI = x̄ ± z × (σ/√n)</code> where z is the critical value for the confidence level.</p>',
  calculate: function(v) {
    if (!v.sampleMean || !v.stdDev || !v.sampleSize) return { error: 'Enter all values' };
    const zTable = { '90': 1.645, '95': 1.96, '99': 2.576 };
    const z = zTable[v.confidence] || 1.96;
    const se = v.stdDev / Math.sqrt(v.sampleSize);
    const me = z * se;
    return {
      'Confidence Level': v.confidence + '%',
      'Critical Value (z)': core.formatNumber(z, 4),
      'Standard Error': core.formatNumber(se, 4),
      'Margin of Error': core.formatNumber(me, 4),
      'Lower Bound': core.formatNumber(v.sampleMean - me, 4),
      'Upper Bound': core.formatNumber(v.sampleMean + me, 4),
      'Interval': '(' + core.formatNumber(v.sampleMean - me, 4) + ', ' + core.formatNumber(v.sampleMean + me, 4) + ')',
    };
  }
});

R('margin-of-error', {
  title: 'Margin of Error Calculator',
  description: 'Calculate the margin of error for a survey or sample.',
  tags: ['margin of error', 'survey', 'sampling error'],
  fields: [
    { id: 'sampleSize', label: 'Sample Size (n)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1000' },
    { id: 'proportion', label: 'Sample Proportion (p)', type: 'number', step: 0.01, min: 0, max: 1, placeholder: 'e.g. 0.5 (use 0.5 for worst case)', half: true },
    { id: 'confidence', label: 'Confidence Level', type: 'select', half: true, options: [
      { value: '90', label: '90%' }, { value: '95', label: '95%', default: true }, { value: '99', label: '99%' }
    ]},
  ],
  formula: '<p><code>ME = z × sqrt(p(1-p) / n)</code></p>',
  calculate: function(v) {
    if (!v.sampleSize || v.proportion === undefined) return { error: 'Enter all values' };
    const zTable = { '90': 1.645, '95': 1.96, '99': 2.576 };
    const z = zTable[v.confidence] || 1.96;
    const p = v.proportion;
    const me = z * Math.sqrt(p * (1 - p) / v.sampleSize);
    return {
      'Margin of Error': core.formatPercent(me * 100, 2),
      'Confidence Level': v.confidence + '%',
      'Lower Bound': core.formatPercent((p - me) * 100, 2),
      'Upper Bound': core.formatPercent((p + me) * 100, 2),
      'Sample Size': v.sampleSize,
    };
  }
});

R('sample-size', {
  title: 'Sample Size Calculator',
  description: 'Determine the required sample size for a desired margin of error.',
  tags: ['sample size', 'power', 'survey planning'],
  fields: [
    { id: 'confidence', label: 'Confidence Level', type: 'select', options: [
      { value: '90', label: '90%' }, { value: '95', label: '95%', default: true }, { value: '99', label: '99%' }
    ]},
    { id: 'marginError', label: 'Margin of Error (%)', type: 'number', step: 0.1, min: 0.1, max: 50, placeholder: 'e.g. 5', half: true },
    { id: 'proportion', label: 'Estimated Proportion (p)', type: 'number', step: 0.01, min: 0, max: 1, placeholder: 'e.g. 0.5 (worst case)', half: true },
    { id: 'population', label: 'Population Size (N, optional)', type: 'number', step: 1, min: 0, placeholder: 'Leave blank for infinite', half: true },
  ],
  formula: '<p><code>n = z² × p(1-p) / E²</code>. With finite population correction: <code>n = n₀ / (1 + (n₀-1)/N)</code></p>',
  calculate: function(v) {
    if (!v.marginError || v.proportion === undefined) return { error: 'Enter margin of error and proportion' };
    const zTable = { '90': 1.645, '95': 1.96, '99': 2.576 };
    const z = zTable[v.confidence] || 1.96;
    const E = v.marginError / 100;
    const p = v.proportion;
    let n0 = (z * z * p * (1 - p)) / (E * E);
    let n = n0;
    let finiteCorrection = false;
    if (v.population && v.population > 0) {
      n = n0 / (1 + (n0 - 1) / v.population);
      finiteCorrection = true;
    }
    return {
      'Required Sample Size': Math.ceil(n),
      'Unadjusted (n₀)': Math.ceil(n0),
      'Finite Population Correction': finiteCorrection ? 'Applied' : 'Not applied (infinite population)',
      'Confidence Level': v.confidence + '%',
      'Margin of Error': core.formatPercent(E * 100),
    };
  }
});

R('p-value', {
  title: 'P-Value Calculator',
  description: 'Estimate the p-value from a z-score.',
  tags: ['p-value', 'significance', 'hypothesis testing'],
  fields: [
    { id: 'zscore', label: 'Z-Score', type: 'number', step: 0.01, placeholder: 'e.g. 1.96' },
    { id: 'testType', label: 'Test Type', type: 'select', options: [
      { value: 'two', label: 'Two-tailed', default: true },
      { value: 'left', label: 'Left-tailed' },
      { value: 'right', label: 'Right-tailed' }
    ]},
    { id: 'alpha', label: 'Significance Level (α)', type: 'select', options: [
      { value: '0.01', label: '0.01 (1%)' },
      { value: '0.05', label: '0.05 (5%)', default: true },
      { value: '0.10', label: '0.10 (10%)' }
    ]},
  ],
  formula: '<p>Uses the standard normal CDF approximation. A p-value below α means the result is statistically significant.</p>',
  calculate: function(v) {
    if (v.zscore === undefined) return { error: 'Enter a z-score' };
    const z = Math.abs(v.zscore);
    // Approximation of the standard normal CDF using the error function approximation
    const normalCDF = function(x) {
      const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
      const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x) / Math.sqrt(2);
      const t = 1 / (1 + p * x);
      const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      return 0.5 * (1 + sign * y);
    };
    let pValue;
    if (v.testType === 'two') {
      pValue = 2 * (1 - normalCDF(z));
    } else if (v.testType === 'left') {
      pValue = normalCDF(-v.zscore);
    } else {
      pValue = 1 - normalCDF(v.zscore);
    }
    const alpha = parseFloat(v.alpha);
    const significant = pValue < alpha;
    return {
      'P-Value': core.formatNumber(pValue, 6),
      'Test Type': v.testType + '-tailed',
      'Significance Level (α)': alpha,
      'Result': significant ? '✅ Statistically significant (reject null hypothesis)' : '❌ Not statistically significant (fail to reject null)',
    };
  }
});

// === CORRELATION & REGRESSION ===

R('correlation', {
  title: 'Correlation Coefficient Calculator',
  description: 'Calculate Pearson\'s r correlation coefficient between two variables.',
  tags: ['correlation', 'Pearson', 'r', 'relationship'],
  fields: [
    { id: 'xData', label: 'X Values', type: 'textarea', placeholder: 'e.g. 1, 2, 3, 4, 5', hint: 'Enter X values separated by commas' },
    { id: 'yData', label: 'Y Values', type: 'textarea', placeholder: 'e.g. 2, 4, 5, 4, 5', hint: 'Enter Y values separated by commas' },
  ],
  formula: '<p><code>r = (n·Σxy − Σx·Σy) / sqrt([n·Σx² − (Σx)²] · [n·Σy² − (Σy)²])</code></p>',
  calculate: function(v) {
    const x = core.getDataSet('xData');
    const y = core.getDataSet('yData');
    if (x.length < 2 || y.length < 2) return { error: 'Enter at least 2 pairs of values' };
    if (x.length !== y.length) return { error: 'X and Y must have the same number of values' };
    const n = x.length;
    const sumX = x.reduce((s, v) => s + v, 0);
    const sumY = y.reduce((s, v) => s + v, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumX2 = x.reduce((s, v) => s + v * v, 0);
    const sumY2 = y.reduce((s, v) => s + v * v, 0);
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = den === 0 ? 0 : num / den;
    let strength = '', direction = '';
    const absR = Math.abs(r);
    if (absR > 0.8) strength = 'Strong';
    else if (absR > 0.5) strength = 'Moderate';
    else if (absR > 0.3) strength = 'Weak';
    else strength = 'Very weak / None';
    direction = r > 0 ? 'positive' : r < 0 ? 'negative' : 'no';
    const r2 = r * r;
    return {
      'Pearson\'s r': core.formatNumber(r, 6),
      'r² (Coefficient of Determination)': core.formatNumber(r2, 6),
      'Relationship': strength + ' ' + direction,
      'Data Points': n,
      'Mean X': core.formatNumber(sumX / n),
      'Mean Y': core.formatNumber(sumY / n),
    };
  }
});

R('linear-regression', {
  title: 'Linear Regression Calculator',
  description: 'Calculate the line of best fit (y = mx + b) for paired data.',
  tags: ['regression', 'linear', 'best fit', 'slope', 'intercept'],
  fields: [
    { id: 'xData', label: 'X Values', type: 'textarea', placeholder: 'e.g. 1, 2, 3, 4, 5', hint: 'Enter X values separated by commas' },
    { id: 'yData', label: 'Y Values', type: 'textarea', placeholder: 'e.g. 2.1, 3.9, 6.2, 7.8, 10.1', hint: 'Enter Y values separated by commas' },
  ],
  formula: '<p><code>y = mx + b</code> where <code>m = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)</code> and <code>b = (Σy − m·Σx) / n</code></p>',
  calculate: function(v) {
    const x = core.getDataSet('xData');
    const y = core.getDataSet('yData');
    if (x.length < 2 || y.length < 2) return { error: 'Enter at least 2 pairs of values' };
    if (x.length !== y.length) return { error: 'X and Y must have the same number of values' };
    const n = x.length;
    const sumX = x.reduce((s, v) => s + v, 0);
    const sumY = y.reduce((s, v) => s + v, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumX2 = x.reduce((s, v) => s + v * v, 0);
    const den = n * sumX2 - sumX * sumX;
    if (den === 0) return { error: 'Cannot compute: all X values are the same' };
    const m = (n * sumXY - sumX * sumY) / den;
    const b = (sumY - m * sumX) / n;
    // R-squared
    const meanY = sumY / n;
    const ssTot = y.reduce((s, v) => s + (v - meanY) ** 2, 0);
    const ssRes = y.reduce((s, yi, i) => s + (yi - (m * x[i] + b)) ** 2, 0);
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    return {
      'Slope (m)': core.formatNumber(m, 6),
      'Y-Intercept (b)': core.formatNumber(b, 6),
      'Equation': 'y = ' + core.formatNumber(m, 4) + 'x + ' + core.formatNumber(b, 4),
      'R²': core.formatNumber(r2, 6),
      'Data Points': n,
    };
  }
});

// === HYPOTHESIS TESTS ===

R('chi-square', {
  title: 'Chi-Square Goodness of Fit Test',
  description: 'Perform a chi-square goodness of fit test on observed vs expected frequencies.',
  tags: ['chi-square', 'χ²', 'goodness of fit', 'hypothesis test'],
  fields: [
    { id: 'observed', label: 'Observed Frequencies', type: 'textarea', placeholder: 'e.g. 50, 30, 20', hint: 'Enter observed counts separated by commas' },
    { id: 'expected', label: 'Expected Frequencies', type: 'textarea', placeholder: 'e.g. 40, 30, 30', hint: 'Enter expected counts separated by commas' },
  ],
  formula: '<p><code>χ² = Σ (O − E)² / E</code>. Compare to chi-square critical value with df = k − 1.</p>',
  calculate: function(v) {
    const obs = core.getDataSet('observed');
    const exp = core.getDataSet('expected');
    if (obs.length < 2) return { error: 'Enter at least 2 categories' };
    if (obs.length !== exp.length) return { error: 'Observed and expected must have the same count' };
    let chi2 = 0;
    let rows = '';
    for (let i = 0; i < obs.length; i++) {
      const contrib = (obs[i] - exp[i]) ** 2 / exp[i];
      chi2 += contrib;
      rows += `<tr><td>${i + 1}</td><td>${obs[i]}</td><td>${exp[i]}</td><td>${core.formatNumber(contrib, 4)}</td></tr>`;
    }
    const df = obs.length - 1;
    // Critical values for common alpha levels
    const crit95 = { 1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488, 5: 11.070, 6: 12.592, 7: 14.067, 8: 15.507, 9: 16.919, 10: 18.307 };
    const crit99 = { 1: 6.635, 2: 9.210, 3: 11.345, 4: 13.277, 5: 15.086, 6: 16.812, 7: 18.475, 8: 20.090, 9: 21.666, 10: 23.209 };
    const c95 = crit95[df] || '—';
    const c99 = crit99[df] || '—';
    return {
      html: `<p><strong>χ² Statistic:</strong> ${core.formatNumber(chi2, 4)}</p>
        <p><strong>Degrees of Freedom:</strong> ${df}</p>
        <table><tr><th>Category</th><th>Observed</th><th>Expected</th><th>(O-E)²/E</th></tr>${rows}</table>
        <p>Critical value (α=0.05): ${c95}</p>
        <p>Critical value (α=0.01): ${c99}</p>
        <p><strong>Result:</strong> ${typeof c95 === 'number' && chi2 > c95 ? '✅ Reject null hypothesis (significant at 5%)' : '❌ Fail to reject null hypothesis'}</p>`
    };
  }
});

R('t-test', {
  title: 'T-Test Calculator',
  description: 'Perform a one-sample or two-sample t-test.',
  tags: ['t-test', 'hypothesis test', 'one-sample', 'two-sample'],
  fields: [
    { id: 'testType', label: 'Test Type', type: 'select', options: [
      { value: 'one', label: 'One-Sample T-Test', default: true },
      { value: 'two', label: 'Two-Sample T-Test' }
    ]},
    { id: 'data1', label: 'Sample 1 Data', type: 'textarea', placeholder: 'e.g. 10, 12, 14, 16, 18', hint: 'Enter values separated by commas' },
    { id: 'hypothesizedMean', label: 'Hypothesized Mean (μ₀)', type: 'number', step: 0.01, placeholder: 'e.g. 15', half: true },
    { id: 'data2', label: 'Sample 2 Data (for two-sample)', type: 'textarea', placeholder: 'e.g. 11, 13, 15, 17, 19', hint: 'Leave blank for one-sample test' },
  ],
  formula: '<p>One-sample: <code>t = (x̄ − μ₀) / (s/√n)</code>. Two-sample: <code>t = (x̄₁ − x̄₂) / SE</code> with pooled variance.</p>',
  calculate: function(v) {
    const d1 = core.getDataSet('data1');
    if (d1.length < 2) return { error: 'Enter at least 2 values for Sample 1' };
    if (v.testType === 'one') {
      if (v.hypothesizedMean === undefined) return { error: 'Enter a hypothesized mean' };
      const mean = core.mean(d1);
      const s = core.stdDev(d1);
      const se = s / Math.sqrt(d1.length);
      const t = (mean - v.hypothesizedMean) / se;
      const df = d1.length - 1;
      return {
        'T-Statistic': core.formatNumber(t, 4),
        'Degrees of Freedom': df,
        'Sample Mean': core.formatNumber(mean, 4),
        'Sample Std Dev': core.formatNumber(s, 4),
        'Standard Error': core.formatNumber(se, 4),
        '|t| > 2 (rough significance)': Math.abs(t) > 2 ? 'Likely significant' : 'Likely not significant',
      };
    } else {
      const d2 = core.getDataSet('data2');
      if (d2.length < 2) return { error: 'Enter at least 2 values for Sample 2' };
      const m1 = core.mean(d1), m2 = core.mean(d2);
      const s1 = core.stdDev(d1), s2 = core.stdDev(d2);
      const n1 = d1.length, n2 = d2.length;
      // Pooled variance
      const sp2 = ((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2);
      const se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
      const t = (m1 - m2) / se;
      const df = n1 + n2 - 2;
      return {
        'T-Statistic': core.formatNumber(t, 4),
        'Degrees of Freedom': df,
        'Mean 1': core.formatNumber(m1, 4),
        'Mean 2': core.formatNumber(m2, 4),
        'Difference': core.formatNumber(m1 - m2, 4),
        'Pooled Std Dev': core.formatNumber(Math.sqrt(sp2), 4),
        'Standard Error': core.formatNumber(se, 4),
        '|t| > 2 (rough significance)': Math.abs(t) > 2 ? 'Likely significant' : 'Likely not significant',
      };
    }
  }
});

R('anova', {
  title: 'One-Way ANOVA Calculator',
  description: 'Perform a one-way ANOVA to compare means across multiple groups.',
  tags: ['ANOVA', 'analysis of variance', 'F-test', 'groups'],
  fields: [
    { id: 'group1', label: 'Group 1 Data', type: 'textarea', placeholder: 'e.g. 10, 12, 14, 16', hint: 'Enter values separated by commas' },
    { id: 'group2', label: 'Group 2 Data', type: 'textarea', placeholder: 'e.g. 12, 14, 16, 18', hint: 'Enter values separated by commas' },
    { id: 'group3', label: 'Group 3 Data', type: 'textarea', placeholder: 'e.g. 14, 16, 18, 20', hint: 'Enter values separated by commas (optional for 2-group comparison)' },
  ],
  formula: '<p><code>F = MS_between / MS_within</code>. Compares variance between groups to variance within groups.</p>',
  calculate: function(v) {
    const groups = [];
    for (let g = 1; g <= 3; g++) {
      const d = core.getDataSet('group' + g);
      if (d.length > 0) groups.push(d);
    }
    if (groups.length < 2) return { error: 'Enter at least 2 groups with data' };
    const k = groups.length;
    const N = groups.reduce((s, g) => s + g.length, 0);
    const grandMean = groups.reduce((s, g) => s + g.reduce((a, b) => a + b, 0), 0) / N;
    // SS_between
    let ssBetween = 0;
    groups.forEach(g => {
      ssBetween += g.length * (core.mean(g) - grandMean) ** 2;
    });
    // SS_within
    let ssWithin = 0;
    groups.forEach(g => {
      const m = core.mean(g);
      g.forEach(x => { ssWithin += (x - m) ** 2; });
    });
    const dfBetween = k - 1;
    const dfWithin = N - k;
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const f = msWithin === 0 ? Infinity : msBetween / msWithin;
    let rows = '';
    groups.forEach((g, i) => {
      rows += `<tr><td>Group ${i + 1}</td><td>${g.length}</td><td>${core.formatNumber(core.mean(g), 4)}</td><td>${core.formatNumber(core.stdDev(g), 4)}</td></tr>`;
    });
    return {
      html: `<p><strong>F-Statistic:</strong> ${core.formatNumber(f, 4)}</p>
        <p><strong>MS Between:</strong> ${core.formatNumber(msBetween, 4)}</p>
        <p><strong>MS Within:</strong> ${core.formatNumber(msWithin, 4)}</p>
        <p><strong>df Between:</strong> ${dfBetween}, <strong>df Within:</strong> ${dfWithin}</p>
        <table><tr><th>Group</th><th>n</th><th>Mean</th><th>Std Dev</th></tr>${rows}</table>
        <p><strong>Result:</strong> ${f > 4 ? '✅ Likely significant (F is large)' : '❌ Likely not significant (F is small)'}</p>`
    };
  }
});

// === PROBABILITY & DISTRIBUTIONS ===

R('probability', {
  title: 'Probability Calculator',
  description: 'Calculate basic probability for events.',
  tags: ['probability', 'chance', 'events'],
  fields: [
    { id: 'favorable', label: 'Number of Favorable Outcomes', type: 'number', step: 1, min: 0, placeholder: 'e.g. 3' },
    { id: 'total', label: 'Total Number of Possible Outcomes', type: 'number', step: 1, min: 1, placeholder: 'e.g. 6' },
  ],
  formula: '<p><code>P = Favorable / Total</code></p>',
  calculate: function(v) {
    if (!v.favorable || !v.total) return { error: 'Enter valid values' };
    const p = v.favorable / v.total;
    const odds = p === 0 ? '0' : p === 1 ? 'Infinity' : (p / (1 - p)).toFixed(4);
    return {
      'Probability': core.formatNumber(p, 6),
      'Probability (%)': core.formatPercent(p * 100, 4),
      'Odds': odds + ' to 1',
      'Complement (not event)': core.formatNumber(1 - p, 6),
    };
  }
});

R('permutation', {
  title: 'Permutation Calculator',
  description: 'Calculate the number of permutations P(n,r).',
  tags: ['permutation', 'arrangement', 'ordering'],
  fields: [
    { id: 'n', label: 'Total Items (n)', type: 'number', step: 1, min: 0, max: 170, placeholder: 'e.g. 10' },
    { id: 'r', label: 'Items to Choose (r)', type: 'number', step: 1, min: 0, max: 170, placeholder: 'e.g. 3' },
  ],
  formula: '<p><code>P(n,r) = n! / (n − r)!</code></p>',
  calculate: function(v) {
    if (v.n === undefined || v.r === undefined) return { error: 'Enter both values' };
    if (v.r > v.n) return { error: 'r cannot be greater than n' };
    const p = core.permutations(v.n, v.r);
    return {
      'P(n,r)': p > 1e15 ? p.toExponential(4) : core.formatNumber(p, 0),
      'n!': core.formatNumber(core.factorial(v.n), 0),
      '(n−r)!': core.formatNumber(core.factorial(v.n - v.r), 0),
    };
  }
});

R('combination', {
  title: 'Combination Calculator',
  description: 'Calculate the number of combinations C(n,r).',
  tags: ['combination', 'choose', 'subset'],
  fields: [
    { id: 'n', label: 'Total Items (n)', type: 'number', step: 1, min: 0, max: 170, placeholder: 'e.g. 10' },
    { id: 'r', label: 'Items to Choose (r)', type: 'number', step: 1, min: 0, max: 170, placeholder: 'e.g. 3' },
  ],
  formula: '<p><code>C(n,r) = n! / (r! × (n − r)!)</code></p>',
  calculate: function(v) {
    if (v.n === undefined || v.r === undefined) return { error: 'Enter both values' };
    if (v.r > v.n) return { error: 'r cannot be greater than n' };
    const c = core.combinations(v.n, v.r);
    return {
      'C(n,r)': c > 1e15 ? c.toExponential(4) : core.formatNumber(c, 0),
      'n!': core.formatNumber(core.factorial(v.n), 0),
      'r!': core.formatNumber(core.factorial(v.r), 0),
      '(n−r)!': core.formatNumber(core.factorial(v.n - v.r), 0),
    };
  }
});

R('binomial-distribution', {
  title: 'Binomial Distribution Calculator',
  description: 'Calculate binomial probability for a given number of successes.',
  tags: ['binomial', 'distribution', 'Bernoulli', 'success'],
  fields: [
    { id: 'trials', label: 'Number of Trials (n)', type: 'number', step: 1, min: 1, max: 1000, placeholder: 'e.g. 10' },
    { id: 'successes', label: 'Number of Successes (k)', type: 'number', step: 1, min: 0, max: 1000, placeholder: 'e.g. 3' },
    { id: 'probability', label: 'Probability of Success (p)', type: 'number', step: 0.01, min: 0, max: 1, placeholder: 'e.g. 0.5' },
  ],
  formula: '<p><code>P(X=k) = C(n,k) × p^k × (1-p)^(n-k)</code></p>',
  calculate: function(v) {
    if (!v.trials || v.successes === undefined || v.probability === undefined) return { error: 'Enter all values' };
    const n = v.trials, k = v.successes, p = v.probability;
    const prob = core.combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    const mean = n * p;
    const variance = n * p * (1 - p);
    const stdDev = Math.sqrt(variance);
    // Cumulative P(X ≤ k)
    let cumProb = 0;
    for (let i = 0; i <= k; i++) {
      cumProb += core.combinations(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
    }
    return {
      'P(X = k)': core.formatNumber(prob, 8),
      'P(X ≤ k)': core.formatNumber(cumProb, 8),
      'P(X ≥ k)': core.formatNumber(1 - cumProb + prob, 8),
      'Expected Value (mean)': core.formatNumber(mean, 4),
      'Variance': core.formatNumber(variance, 4),
      'Std Dev': core.formatNumber(stdDev, 4),
    };
  }
});

R('normal-distribution', {
  title: 'Normal Distribution Calculator',
  description: 'Calculate probabilities and values for a normal distribution.',
  tags: ['normal', 'Gaussian', 'bell curve', 'distribution'],
  fields: [
    { id: 'mean', label: 'Mean (μ)', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
    { id: 'stddev', label: 'Std Dev (σ)', type: 'number', step: 0.01, min: 0.001, placeholder: 'e.g. 15' },
    { id: 'x', label: 'Value (x)', type: 'number', step: 0.01, placeholder: 'e.g. 115' },
  ],
  formula: '<p>Uses the standard normal CDF. <code>z = (x − μ) / σ</code></p>',
  calculate: function(v) {
    if (v.mean === undefined || !v.stddev || v.x === undefined) return { error: 'Enter all values' };
    const z = (v.x - v.mean) / v.stddev;
    // Normal CDF approximation
    const normalCDF = function(x) {
      const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
      const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x) / Math.sqrt(2);
      const t = 1 / (1 + p * x);
      const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      return 0.5 * (1 + sign * y);
    };
    // PDF
    const pdf = (1 / (v.stddev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
    const cdf = normalCDF(z);
    return {
      'Z-Score': core.formatNumber(z, 4),
      'P(X < x)': core.formatNumber(cdf, 6),
      'P(X > x)': core.formatNumber(1 - cdf, 6),
      'P(X = x) [PDF]': core.formatNumber(pdf, 6),
      'P(X ≤ x)': core.formatNumber(cdf, 6),
    };
  }
});

// === RANDOM GENERATORS ===

R('random-number-generator', {
  title: 'Random Number Generator',
  description: 'Generate random numbers within a range.',
  tags: ['random', 'number', 'generator', 'RNG'],
  fields: [
    { id: 'min', label: 'Minimum', type: 'number', step: 1, placeholder: 'e.g. 1' },
    { id: 'max', label: 'Maximum', type: 'number', step: 1, placeholder: 'e.g. 100' },
    { id: 'count', label: 'How Many Numbers', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'allowDuplicates', label: 'Allow Duplicates', type: 'select', half: true, options: [
      { value: 'yes', label: 'Yes', default: true }, { value: 'no', label: 'No' }
    ]},
  ],
  calculate: function(v) {
    if (v.min === undefined || v.max === undefined) return { error: 'Enter min and max values' };
    if (v.min >= v.max) return { error: 'Min must be less than max' };
    const count = Math.min(v.count || 10, 100);
    const nums = [];
    const range = v.max - v.min + 1;
    if (v.allowDuplicates === 'no' && count > range) return { error: 'Not enough unique numbers in range' };
    const pool = v.allowDuplicates === 'no' ? Array.from({ length: range }, (_, i) => v.min + i) : null;
    for (let i = 0; i < count; i++) {
      if (pool) {
        const idx = Math.floor(Math.random() * pool.length);
        nums.push(pool.splice(idx, 1)[0]);
      } else {
        nums.push(Math.floor(Math.random() * range) + v.min);
      }
    }
    return {
      html: `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">${nums.map(n =>
        `<span style="background:var(--accent);color:#fff;padding:0.3rem 0.7rem;border-radius:0.5rem;font-size:1.2rem;font-weight:bold">${n}</span>`
      ).join('')}</div>
      <p><strong>Count:</strong> ${nums.length} | <strong>Range:</strong> ${v.min} to ${v.max}</p>
      <p><strong>Sum:</strong> ${core.formatNumber(nums.reduce((s, n) => s + n, 0))} | <strong>Average:</strong> ${core.formatNumber(nums.reduce((s, n) => s + n, 0) / nums.length)}</p>`
    };
  }
});

R('character-counter', {
  title: 'Character and Word Counter',
  description: 'Count characters, words, sentences, and paragraphs in your text.',
  tags: ['character', 'word', 'count', 'text', 'analysis'],
  fields: [
    { id: 'text', label: 'Enter or paste your text', type: 'textarea', placeholder: 'Type or paste your text here...', hint: 'The counter updates as you type' },
  ],
  calculate: function(v) {
    const text = v.text || '';
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentences = text.trim() ? (text.match(/[.!?]+/g) || []).length || (words > 0 ? 1 : 0) : 0;
    const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).filter(p => p.trim()).length || 1 : 0;
    const lines = text.trim() ? text.split('\n').length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    const speakingTime = Math.max(1, Math.ceil(words / 130));
    return {
      'Characters': chars.toLocaleString(),
      'Characters (no spaces)': charsNoSpace.toLocaleString(),
      'Words': words.toLocaleString(),
      'Sentences': sentences.toLocaleString(),
      'Paragraphs': paragraphs.toLocaleString(),
      'Lines': lines.toLocaleString(),
      'Reading Time': '~' + readingTime + ' min',
      'Speaking Time': '~' + speakingTime + ' min',
    };
  }
});

R('coin-flipper', {
  title: 'Coin Flipper / Dice Roller',
  description: 'Flip a coin or roll dice with statistics tracking.',
  tags: ['coin', 'flip', 'dice', 'roll', 'random'],
  fields: [
    { id: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'coin', label: 'Coin Flip', default: true }, { value: 'dice', label: 'Dice Roll' }
    ]},
    { id: 'numFlips', label: 'Number of Tosses/Rolls', type: 'number', step: 1, min: 1, max: 10000, placeholder: 'e.g. 100', half: true },
    { id: 'numDice', label: 'Number of Dice', type: 'number', step: 1, min: 1, max: 10, placeholder: 'e.g. 2', half: true },
    { id: 'sides', label: 'Sides per Die', type: 'number', step: 1, min: 2, max: 100, placeholder: 'e.g. 6', half: true },
  ],
  calculate: function(v) {
    const count = Math.min(v.numFlips || 100, 10000);
    if (v.mode === 'coin') {
      let heads = 0, tails = 0;
      const results = [];
      for (let i = 0; i < count; i++) {
        const h = Math.random() < 0.5;
        if (h) heads++; else tails++;
        if (count <= 50) results.push(h ? 'H' : 'T');
      }
      return {
        'Heads': heads + ' (' + core.formatPercent(heads / count * 100) + ')',
        'Tails': tails + ' (' + core.formatPercent(tails / count * 100) + ')',
        'Total Flips': count,
        'Results': count <= 50 ? results.join(' ') : '(too many to display)',
      };
    } else {
      const numDice = Math.min(v.numDice || 2, 10);
      const sides = Math.min(v.sides || 6, 100);
      let totalSum = 0;
      const rolls = [];
      for (let i = 0; i < count; i++) {
        let rollSum = 0;
        const roll = [];
        for (let d = 0; d < numDice; d++) {
          const r = Math.floor(Math.random() * sides) + 1;
          roll.push(r);
          rollSum += r;
        }
        totalSum += rollSum;
        if (count <= 50) rolls.push(roll.join('+') + '=' + rollSum);
      }
      return {
        'Total Rolls': count,
        'Average Roll': core.formatNumber(totalSum / count, 2),
        'Total Sum': core.formatNumber(totalSum, 0),
        'Min Possible': numDice,
        'Max Possible': numDice * sides,
        'Results': count <= 50 ? rolls.join(', ') : '(too many to display)',
      };
    }
  }
});

// === DATA ANALYSIS ===

R('frequency-distribution', {
  title: 'Frequency Distribution Table',
  description: 'Create a frequency distribution table from a data set.',
  tags: ['frequency', 'distribution', 'table', 'histogram'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 12, 15, 18, 22, 25, 28, 30, 35, 12, 18', hint: 'Enter numbers separated by commas' },
    { id: 'numBins', label: 'Number of Bins', type: 'number', step: 1, min: 2, max: 50, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p>Groups data into bins and counts the frequency of values in each bin.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0], max = sorted[sorted.length - 1];
    const bins = v.numBins || 5;
    const binWidth = (max - min) / bins || 1;
    const freq = new Array(bins).fill(0);
    const relFreq = new Array(bins).fill(0);
    const cumFreq = new Array(bins).fill(0);
    data.forEach(x => {
      let idx = Math.floor((x - min) / binWidth);
      if (idx >= bins) idx = bins - 1;
      freq[idx]++;
    });
    let cum = 0;
    let rows = '';
    for (let i = 0; i < bins; i++) {
      cum += freq[i];
      relFreq[i] = freq[i] / data.length;
      cumFreq[i] = cum;
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      const bars = '█'.repeat(Math.round(freq[i] / data.length * 40));
      rows += `<tr><td>${core.formatNumber(lo, 2)} – ${core.formatNumber(hi, 2)}</td><td>${freq[i]}</td><td>${core.formatPercent(relFreq[i] * 100)}</td><td>${cum}</td><td style="font-family:monospace;white-space:pre">${bars}</td></tr>`;
    }
    return {
      html: `<p><strong>Count:</strong> ${data.length} | <strong>Bins:</strong> ${bins} | <strong>Bin Width:</strong> ${core.formatNumber(binWidth, 2)}</p>
        <table><tr><th>Range</th><th>Frequency</th><th>Relative</th><th>Cumulative</th><th>Bar</th></tr>${rows}</table>`
    };
  }
});

R('percentile-rank', {
  title: 'Percentile Rank Calculator',
  description: 'Find the percentile rank of a value within a data set.',
  tags: ['percentile', 'rank', 'percentile rank', 'position'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 65, 70, 75, 80, 85, 90, 95, 100', hint: 'Enter numbers separated by commas' },
    { id: 'value', label: 'Value to Find Percentile For', type: 'number', step: 0.01, placeholder: 'e.g. 85' },
  ],
  formula: '<p><code>Percentile Rank = (Number of values below x / Total values) × 100</code></p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    if (v.value === undefined) return { error: 'Enter a value' };
    const below = data.filter(x => x < v.value).length;
    const equal = data.filter(x => x === v.value).length;
    const above = data.filter(x => x > v.value).length;
    const percentileRank = (below / data.length) * 100;
    const percentileRankInclusive = ((below + equal * 0.5) / data.length) * 100;
    // Also find the value at a given percentile
    const sorted = [...data].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    return {
      'Percentile Rank': core.formatNumber(percentileRank, 2) + 'th percentile',
      'Percentile Rank (inclusive)': core.formatNumber(percentileRankInclusive, 2) + 'th percentile',
      'Values Below': below,
      'Values Equal': equal,
      'Values Above': above,
      'Total Values': data.length,
      'Interpretation': 'Your value is higher than ' + core.formatNumber(percentileRank, 1) + '% of the data set',
    };
  }
});

// === ADDITIONAL STATISTICS TOOLS ===

R('five-number-summary', {
  title: 'Five-Number Summary Calculator',
  description: 'Calculate the five-number summary: min, Q1, median, Q3, max.',
  tags: ['five-number summary', 'box plot', 'quartiles', 'IQR'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 3, 7, 8, 12, 15, 18, 22, 25, 30', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p>The five-number summary consists of: Minimum, Q1, Median, Q3, Maximum. Used for box plots and outlier detection.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const min = sorted[0], max = sorted[n - 1];
    const median = core.median(data);
    const q1Idx = (n - 1) * 0.25, q3Idx = (n - 1) * 0.75;
    const q1 = sorted[Math.floor(q1Idx)] + (sorted[Math.ceil(q1Idx)] - sorted[Math.floor(q1Idx)]) * (q1Idx % 1);
    const q3 = sorted[Math.floor(q3Idx)] + (sorted[Math.ceil(q3Idx)] - sorted[Math.floor(q3Idx)]) * (q3Idx % 1);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    const outliers = sorted.filter(x => x < lowerFence || x > upperFence);
    return {
      'Minimum': core.formatNumber(min),
      'Q1 (25th percentile)': core.formatNumber(q1),
      'Median (Q2)': core.formatNumber(median),
      'Q3 (75th percentile)': core.formatNumber(q3),
      'Maximum': core.formatNumber(max),
      'IQR': core.formatNumber(iqr),
      'Lower Fence': core.formatNumber(lowerFence),
      'Upper Fence': core.formatNumber(upperFence),
      'Outliers': outliers.length > 0 ? outliers.join(', ') : 'None',
    };
  }
});

R('sum-calculator', {
  title: 'Sum Calculator',
  description: 'Calculate the sum and basic statistics of a set of numbers.',
  tags: ['sum', 'total', 'addition', 'add up'],
  fields: [
    { id: 'data', label: 'Numbers', type: 'textarea', placeholder: 'e.g. 10, 20, 30, 40, 50', hint: 'Enter numbers separated by commas' },
  ],
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sum = data.reduce((s, v) => s + v, 0);
    const positives = data.filter(n => n > 0);
    const negatives = data.filter(n => n < 0);
    return {
      'Sum': core.formatNumber(sum),
      'Count': data.length,
      'Average': core.formatNumber(sum / data.length),
      'Positive Sum': core.formatNumber(positives.reduce((s, v) => s + v, 0)),
      'Negative Sum': core.formatNumber(negatives.reduce((s, v) => s + v, 0)),
      'Largest': core.formatNumber(Math.max(...data)),
      'Smallest': core.formatNumber(Math.min(...data)),
    };
  }
});

R('quartile-calculator', {
  title: 'Quartile Calculator',
  description: 'Calculate quartiles and the interquartile range for a data set.',
  tags: ['quartile', 'IQR', 'Q1', 'Q2', 'Q3'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 5, 10, 15, 20, 25, 30, 35, 40, 45, 50', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p>Q1 is the median of the lower half, Q2 is the median, Q3 is the median of the upper half. IQR = Q3 − Q1.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const q1Idx = (n - 1) * 0.25, q2Idx = (n - 1) * 0.5, q3Idx = (n - 1) * 0.75;
    const interpolate = (idx) => sorted[Math.floor(idx)] + (sorted[Math.ceil(idx)] - sorted[Math.floor(idx)]) * (idx % 1);
    const q1 = interpolate(q1Idx);
    const q2 = interpolate(q2Idx);
    const q3 = interpolate(q3Idx);
    const iqr = q3 - q1;
    return {
      'Q1 (25th percentile)': core.formatNumber(q1),
      'Q2 (Median, 50th percentile)': core.formatNumber(q2),
      'Q3 (75th percentile)': core.formatNumber(q3),
      'IQR (Q3 − Q1)': core.formatNumber(iqr),
      'Count': n,
    };
  }
});

R('percentile-calculator', {
  title: 'Percentile Calculator',
  description: 'Find the value at a given percentile in a data set.',
  tags: ['percentile', 'P-value', 'ranking'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 10, 20, 30, 40, 50, 60, 70, 80, 90, 100', hint: 'Enter numbers separated by commas' },
    { id: 'percentile', label: 'Percentile to Find', type: 'number', step: 1, min: 1, max: 99, placeholder: 'e.g. 75', half: true },
  ],
  formula: '<p>Finds the value below which a given percentage of observations fall.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    if (v.percentile === undefined) return { error: 'Enter a percentile' };
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    // Calculate value at the requested percentile
    const idx = (v.percentile / 100) * (n - 1);
    const lower = Math.floor(idx), upper = Math.ceil(idx);
    const frac = idx - lower;
    const value = sorted[lower] + frac * (sorted[upper] - sorted[lower]);
    // Also compute common percentiles
    const p25 = (() => { const i = 0.25 * (n - 1); return sorted[Math.floor(i)] + (sorted[Math.ceil(i)] - sorted[Math.floor(i)]) * (i % 1); })();
    const p50 = core.median(data);
    const p75 = (() => { const i = 0.75 * (n - 1); return sorted[Math.floor(i)] + (sorted[Math.ceil(i)] - sorted[Math.floor(i)]) * (i % 1); })();
    const p90 = (() => { const i = 0.90 * (n - 1); return sorted[Math.floor(i)] + (sorted[Math.ceil(i)] - sorted[Math.floor(i)]) * (i % 1); })();
    return {
      ['P' + v.percentile]: core.formatNumber(value),
      'P25': core.formatNumber(p25),
      'P50 (Median)': core.formatNumber(p50),
      'P75': core.formatNumber(p75),
      'P90': core.formatNumber(p90),
      'Count': n,
    };
  }
});

R('stemleaf', {
  title: 'Stem-and-Leaf Plot Generator',
  description: 'Create a stem-and-leaf plot from a data set.',
  tags: ['stem', 'leaf', 'plot', 'visualization'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 12, 15, 23, 28, 31, 35, 42, 47, 51', hint: 'Enter numbers separated by commas' },
  ],
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sorted = [...data].sort((a, b) => a - b);
    // Determine stem unit based on data range
    const maxAbs = Math.max(...sorted.map(Math.abs));
    const stemUnit = maxAbs >= 1000 ? 100 : maxAbs >= 100 ? 10 : 1;
    const stems = {};
    sorted.forEach(x => {
      const stem = Math.floor(x / stemUnit);
      const leaf = Math.round((x % stemUnit) / (stemUnit / 10));
      if (!stems[stem]) stems[stem] = [];
      stems[stem].push(leaf >= 0 ? leaf : Math.abs(leaf));
    });
    let html = '<table style="font-family:monospace"><tr><th>Stem</th><th>Leaf</th></tr>';
    Object.keys(stems).sort((a, b) => a - b).forEach(s => {
      html += `<tr><td>${s}</td><td>${stems[s].join(' ')}</td></tr>`;
    });
    html += '</table>';
    html += '<p style="margin-top:0.5rem;font-size:0.85rem">Stem unit: ' + stemUnit + ' | Leaf unit: ' + (stemUnit / 10) + '</p>';
    return { html };
  }
});

R('vote-percentage', {
  title: 'Vote Percentage Calculator',
  description: 'Calculate vote percentages and margins from election results.',
  tags: ['vote', 'percentage', 'election', 'margin'],
  fields: [
    { id: 'votes', label: 'Votes per Candidate/Option', type: 'textarea', placeholder: 'e.g. 1200, 800, 500', hint: 'Enter vote counts separated by commas' },
  ],
  calculate: function(v) {
    const votes = core.getDataSet('votes');
    if (votes.length < 1) return { error: 'Enter at least one vote count' };
    const total = votes.reduce((s, v) => s + v, 0);
    const sorted = votes.map((v, i) => ({ idx: i + 1, votes: v, pct: (v / total) * 100 }))
      .sort((a, b) => b.votes - a.votes);
    let rows = '';
    sorted.forEach((c, i) => {
      const bar = '█'.repeat(Math.round(c.pct / 2));
      rows += `<tr><td>${i === 0 ? '🥇 ' : ''}Candidate ${c.idx}</td><td>${c.votes.toLocaleString()}</td><td>${core.formatPercent(c.pct)}</td><td style="font-family:monospace">${bar}</td></tr>`;
    });
    const margin = sorted.length >= 2 ? sorted[0].pct - sorted[1].pct : 0;
    return {
      html: `<p><strong>Total Votes:</strong> ${total.toLocaleString()}</p>
        <table><tr><th>Candidate</th><th>Votes</th><th>Percentage</th><th>Bar</th></tr>${rows}</table>
        <p style="margin-top:0.5rem"><strong>Winning Margin:</strong> ${core.formatPercent(margin)}</p>`
    };
  }
});

// === ALIASES ===

R('average', {
  title: 'Average Calculator',
  description: 'Calculate the mean (average) of a set of numbers.',
  tags: ['average', 'mean', 'arithmetic', 'simple'],
  fields: [
    { id: 'data', label: 'Numbers', type: 'textarea', placeholder: 'e.g. 10, 20, 30, 40, 50', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p><code>Average = Sum / Count</code></p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sum = data.reduce((s, x) => s + x, 0);
    return {
      'Average (Mean)': core.formatNumber(sum / data.length),
      'Sum': core.formatNumber(sum),
      'Count': data.length,
    };
  }
});

R('five-number-summary-calculator', {
  title: 'Five-Number Summary Calculator',
  description: 'Calculate the five-number summary: min, Q1, median, Q3, max.',
  tags: ['five-number summary', 'box plot', 'quartiles', 'IQR'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 3, 7, 8, 12, 15, 18, 22, 25, 30', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p>The five-number summary: Minimum, Q1, Median, Q3, Maximum.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const min = sorted[0], max = sorted[n - 1];
    const median = core.median(data);
    const q1Idx = (n - 1) * 0.25, q3Idx = (n - 1) * 0.75;
    const q1 = sorted[Math.floor(q1Idx)] + (sorted[Math.ceil(q1Idx)] - sorted[Math.floor(q1Idx)]) * (q1Idx % 1);
    const q3 = sorted[Math.floor(q3Idx)] + (sorted[Math.ceil(q3Idx)] - sorted[Math.floor(q3Idx)]) * (q3Idx % 1);
    const iqr = q3 - q1;
    return {
      'Minimum': core.formatNumber(min),
      'Q1': core.formatNumber(q1),
      'Median': core.formatNumber(median),
      'Q3': core.formatNumber(q3),
      'Maximum': core.formatNumber(max),
      'IQR': core.formatNumber(iqr),
    };
  }
});

R('gpa-calculator', {
  title: 'GPA Calculator',
  description: 'Calculate your GPA from course grades and credit hours.',
  tags: ['GPA', 'grade point average', 'college', 'credits'],
  fields: [
    { id: 'courses', label: 'Courses (one per line: Grade Credits)', type: 'textarea', placeholder: 'e.g.\nA 3\nB+ 4\nA- 3\nC 2', hint: 'Use letter grades: A, A-, B+, B, B-, C+, C, C-, D+, D, F' },
  ],
  formula: '<p>Calculates weighted GPA using standard 4.0 scale grade points.</p>',
  calculate: function(v) {
    if (!v.courses || !v.courses.trim()) return { error: 'Enter at least one course' };
    const gradePoints = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0 };
    const lines = v.courses.trim().split(/\n/).map(l => l.trim()).filter(l => l);
    let totalPoints = 0, totalCredits = 0;
    const details = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const grade = parts[0].toUpperCase();
      const credits = parseFloat(parts[1]);
      if (!(grade in gradePoints) || isNaN(credits)) continue;
      const pts = gradePoints[grade] * credits;
      totalPoints += pts;
      totalCredits += credits;
      details.push({ grade, credits, points: core.formatNumber(gradePoints[grade]) });
    }
    if (!details.length) return { error: 'No valid courses found' };
    const gpa = totalPoints / totalCredits;
    let rows = details.map(d => `<tr><td>${d.grade}</td><td>${d.credits}</td><td>${d.points}</td></tr>`).join('');
    return {
      html: `<table><tr><th>Grade</th><th>Credits</th><th>Grade Points</th></tr>${rows}</table>
        <p style="margin-top:1rem"><strong>GPA:</strong> ${core.formatNumber(gpa, 3)}</p>
        <p><strong>Total Credits:</strong> ${totalCredits}</p>`
    };
  }
});

R('grade-calculator', {
  title: 'Grade Calculator',
  description: 'Calculate your weighted final grade from assignments and exams.',
  tags: ['grade', 'weighted', 'final', 'assignment', 'exam'],
  fields: [
    { id: 'items', label: 'Graded Items (one per line: Score Weight%)', type: 'textarea', placeholder: 'e.g.\n90 20\n85 30\n95 25\n88 25', hint: 'Enter score and weight percentage for each item' },
  ],
  formula: '<p>Calculates the weighted average of your graded items.</p>',
  calculate: function(v) {
    if (!v.items || !v.items.trim()) return { error: 'Enter at least one graded item' };
    const lines = v.items.trim().split(/\n/).map(l => l.trim()).filter(l => l);
    let weightedSum = 0, totalWeight = 0;
    const details = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const score = parseFloat(parts[0]);
      const weight = parseFloat(parts[1]);
      if (isNaN(score) || isNaN(weight)) continue;
      weightedSum += score * weight;
      totalWeight += weight;
      details.push({ score, weight, contribution: core.formatNumber(score * weight, 2) });
    }
    if (!details.length) return { error: 'No valid items found' };
    const finalGrade = weightedSum / totalWeight;
    let rows = details.map(d => `<tr><td>${d.score}</td><td>${d.weight}%</td><td>${d.contribution}</td></tr>`).join('');
    return {
      html: `<table><tr><th>Score</th><th>Weight</th><th>Weighted</th></tr>${rows}</table>
        <p style="margin-top:1rem"><strong>Final Grade:</strong> ${core.formatNumber(finalGrade, 2)}%</p>
        <p><strong>Total Weight:</strong> ${core.formatNumber(totalWeight, 1)}%</p>`
    };
  }
});

R('number-generator', {
  title: 'Number String Generator',
  description: 'Generate a random string of letters and numbers.',
  tags: ['random', 'string', 'letters', 'numbers', 'generator'],
  fields: [
    { id: 'length', label: 'String Length', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'includeLetters', label: 'Include Letters', type: 'select', half: true, options: [
      { value: 'yes', label: 'Yes', default: true }, { value: 'no', label: 'No' }
    ]},
    { id: 'includeNumbers', label: 'Include Numbers', type: 'select', half: true, options: [
      { value: 'yes', label: 'Yes', default: true }, { value: 'no', label: 'No' }
    ]},
    { id: 'uppercase', label: 'Uppercase Only', type: 'select', half: true, options: [
      { value: 'yes', label: 'Yes' }, { value: 'no', label: 'Mixed Case', default: true }
    ]},
  ],
  calculate: function(v) {
    const len = Math.min(v.length || 10, 100);
    let charset = '';
    if (v.includeLetters === 'yes' || v.includeLetters === undefined) {
      charset += 'abcdefghijklmnopqrstuvwxyz';
      if (v.uppercase !== 'yes') charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    if (v.includeNumbers === 'yes' || v.includeNumbers === undefined) {
      charset += '0123456789';
    }
    if (!charset) charset = '0123456789';
    let result = '';
    for (let i = 0; i < len; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
    return {
      'Generated String': result,
      'Length': len,
      'Characters Used': charset.length,
    };
  }
});

R('pin-generator', {
  title: 'PIN Generator',
  description: 'Generate a random PIN code.',
  tags: ['PIN', 'random', 'code', 'numeric'],
  fields: [
    { id: 'length', label: 'PIN Length', type: 'number', step: 1, min: 1, max: 20, placeholder: 'e.g. 4', half: true },
    { id: 'count', label: 'How Many PINs', type: 'number', step: 1, min: 1, max: 20, placeholder: 'e.g. 5', half: true },
  ],
  calculate: function(v) {
    const len = Math.min(v.length || 4, 20);
    const count = Math.min(v.count || 5, 20);
    const pins = [];
    for (let i = 0; i < count; i++) {
      let pin = '';
      for (let j = 0; j < len; j++) {
        pin += Math.floor(Math.random() * 10);
      }
      pins.push(pin);
    }
    return {
      html: `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">${pins.map(p =>
        `<span style="background:var(--accent);color:#fff;padding:0.4rem 1rem;border-radius:0.5rem;font-size:1.3rem;font-weight:bold;font-family:monospace;letter-spacing:0.2em">${p}</span>`
      ).join('')}</div>
      <p><strong>PIN Length:</strong> ${len} | <strong>Count:</strong> ${count}</p>`
    };
  }
});

R('random-card-generator', {
  title: 'Random Card Generator',
  description: 'Draw random playing cards from a deck.',
  tags: ['random', 'card', 'playing', 'deck', 'draw'],
  fields: [
    { id: 'count', label: 'Number of Cards', type: 'number', step: 1, min: 1, max: 52, placeholder: 'e.g. 5', half: true },
    { id: 'decks', label: 'Number of Decks', type: 'number', step: 1, min: 1, max: 10, placeholder: 'e.g. 1', half: true },
  ],
  calculate: function(v) {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const numCards = Math.min(v.count || 5, 52 * (v.decks || 1));
    const deck = [];
    for (let d = 0; d < (v.decks || 1); d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          deck.push({ rank, suit, color: (suit === '♥' || suit === '♦') ? 'red' : 'black' });
        }
      }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const drawn = deck.slice(0, numCards);
    return {
      html: `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">${drawn.map(c =>
        `<span style="background:${c.color === 'red' ? '#fee' : '#eef'};color:${c.color};padding:0.4rem 0.8rem;border-radius:0.5rem;font-size:1.2rem;font-weight:bold;border:1px solid #ccc">${c.rank}${c.suit}</span>`
      ).join('')}</div>
      <p><strong>Cards Drawn:</strong> ${drawn.length} from ${v.decks || 1} deck(s)</p>`
    };
  }
});

R('random-name-picker', {
  title: 'Random Name Picker',
  description: 'Pick a random name from a list of names.',
  tags: ['random', 'name', 'picker', 'selector', 'wheel'],
  fields: [
    { id: 'names', label: 'Names (one per line)', type: 'textarea', placeholder: 'e.g.\nAlice\nBob\nCharlie\nDiana', hint: 'Enter each name on a separate line' },
    { id: 'count', label: 'How Many to Pick', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 1', half: true },
  ],
  calculate: function(v) {
    if (!v.names || !v.names.trim()) return { error: 'Enter at least one name' };
    const nameList = v.names.trim().split(/\n/).map(n => n.trim()).filter(n => n);
    if (!nameList.length) return { error: 'Enter at least one name' };
    const pickCount = Math.min(v.count || 1, nameList.length);
    const shuffled = [...nameList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const picked = shuffled.slice(0, pickCount);
    return {
      html: `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">${picked.map((n, i) =>
        `<span style="background:var(--accent);color:#fff;padding:0.4rem 1rem;border-radius:0.5rem;font-size:1.1rem;font-weight:bold">${i === 0 ? '🏆 ' : ''}${n}</span>`
      ).join('')}</div>
      <p><strong>Picked:</strong> ${picked.length} from ${nameList.length} names</p>`
    };
  }
});

R('random-number-generator-1-10', {
  title: 'Random Number Generator (1-10)',
  description: 'Generate a random number between 1 and 10.',
  tags: ['random', 'number', '1-10', 'generator'],
  fields: [
    { id: 'count', label: 'How Many Numbers', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'allowDuplicates', label: 'Allow Duplicates', type: 'select', half: true, options: [
      { value: 'yes', label: 'Yes', default: true }, { value: 'no', label: 'No' }
    ]},
  ],
  calculate: function(v) {
    const count = Math.min(v.count || 10, 100);
    const nums = [];
    const pool = v.allowDuplicates === 'no' ? [1,2,3,4,5,6,7,8,9,10] : null;
    for (let i = 0; i < count; i++) {
      if (pool) {
        const idx = Math.floor(Math.random() * pool.length);
        nums.push(pool.splice(idx, 1)[0]);
        if (!pool.length) break;
      } else {
        nums.push(Math.floor(Math.random() * 10) + 1);
      }
    }
    return {
      html: `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">${nums.map(n =>
        `<span style="background:var(--accent);color:#fff;padding:0.3rem 0.7rem;border-radius:0.5rem;font-size:1.2rem;font-weight:bold">${n}</span>`
      ).join('')}</div>
      <p><strong>Count:</strong> ${nums.length} | <strong>Range:</strong> 1 to 10</p>`
    };
  }
});

R('random-number-generator-1-100', {
  title: 'Random Number Generator (1-100)',
  description: 'Generate a random number between 1 and 100.',
  tags: ['random', 'number', '1-100', 'generator'],
  fields: [
    { id: 'count', label: 'How Many Numbers', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'allowDuplicates', label: 'Allow Duplicates', type: 'select', half: true, options: [
      { value: 'yes', label: 'Yes', default: true }, { value: 'no', label: 'No' }
    ]},
  ],
  calculate: function(v) {
    const count = Math.min(v.count || 10, 100);
    const nums = [];
    const pool = v.allowDuplicates === 'no' ? Array.from({ length: 100 }, (_, i) => i + 1) : null;
    for (let i = 0; i < count; i++) {
      if (pool) {
        const idx = Math.floor(Math.random() * pool.length);
        nums.push(pool.splice(idx, 1)[0]);
        if (!pool.length) break;
      } else {
        nums.push(Math.floor(Math.random() * 100) + 1);
      }
    }
    return {
      html: `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">${nums.map(n =>
        `<span style="background:var(--accent);color:#fff;padding:0.3rem 0.7rem;border-radius:0.5rem;font-size:1.2rem;font-weight:bold">${n}</span>`
      ).join('')}</div>
      <p><strong>Count:</strong> ${nums.length} | <strong>Range:</strong> 1 to 100</p>`
    };
  }
});

R('standard-deviation-calculator', {
  title: 'Standard Deviation Calculator',
  description: 'Calculate sample and population standard deviation.',
  tags: ['standard deviation', 'std dev', 'spread', 'dispersion'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 4, 8, 15, 16, 23, 42', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p><code>s = sqrt(Sum(x - mean)² / (n-1))</code> for sample. <code>σ = sqrt(Sum(x - mean)² / n)</code> for population.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 2) return { error: 'Enter at least two numbers' };
    const mean = core.mean(data);
    const s = core.stdDev(data);
    const sigma = core.popStdDev(data);
    return {
      'Sample Std Dev (s)': core.formatNumber(s),
      'Population Std Dev (σ)': core.formatNumber(sigma),
      'Mean': core.formatNumber(mean),
      'Count (n)': data.length,
    };
  }
});

R('statistics', {
  title: 'Statistics Calculator',
  description: 'Calculate comprehensive statistics for a data set.',
  tags: ['statistics', 'comprehensive', 'data', 'analysis'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 12, 15, 18, 22, 25, 28, 30, 35', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p>Computes a full set of descriptive statistics for your data.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 1) return { error: 'Enter at least one number' };
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const mean = core.mean(data);
    const median = core.median(data);
    const stdDev = core.stdDev(data);
    const variance = core.variance(data);
    const min = sorted[0], max = sorted[n - 1];
    const range = max - min;
    const sum = data.reduce((s, x) => s + x, 0);
    return {
      'Count (n)': n,
      'Sum': core.formatNumber(sum),
      'Mean': core.formatNumber(mean),
      'Median': core.formatNumber(median),
      'Std Dev': core.formatNumber(stdDev),
      'Variance': core.formatNumber(variance),
      'Min': core.formatNumber(min),
      'Max': core.formatNumber(max),
      'Range': core.formatNumber(range),
    };
  }
});

R('variance-calculator', {
  title: 'Variance Calculator',
  description: 'Calculate sample and population variance of a data set.',
  tags: ['variance', 'spread', 'dispersion'],
  fields: [
    { id: 'data', label: 'Data Set', type: 'textarea', placeholder: 'e.g. 10, 12, 14, 16, 18', hint: 'Enter numbers separated by commas' },
  ],
  formula: '<p><code>s² = Sum(x - mean)² / (n-1)</code> for sample. <code>σ² = Sum(x - mean)² / n)</code> for population.</p>',
  calculate: function(v) {
    const data = core.getDataSet('data');
    if (data.length < 2) return { error: 'Enter at least two numbers' };
    const mean = core.mean(data);
    const s2 = core.variance(data);
    const sigma2 = core.popStdDev(data) ** 2;
    return {
      'Sample Variance (s²)': core.formatNumber(s2),
      'Population Variance (σ²)': core.formatNumber(sigma2),
      'Mean': core.formatNumber(mean),
      'Count (n)': data.length,
    };
  }
});

R('vote-percentage-calculator', {
  title: 'Vote Percentage Calculator',
  description: 'Calculate vote percentages and margins from election results.',
  tags: ['vote', 'percentage', 'election', 'margin'],
  fields: [
    { id: 'votes', label: 'Votes per Candidate/Option', type: 'textarea', placeholder: 'e.g. 1200, 800, 500', hint: 'Enter vote counts separated by commas' },
  ],
  calculate: function(v) {
    const votes = core.getDataSet('votes');
    if (votes.length < 1) return { error: 'Enter at least one vote count' };
    const total = votes.reduce((s, v) => s + v, 0);
    const sorted = votes.map((v, i) => ({ idx: i + 1, votes: v, pct: (v / total) * 100 }))
      .sort((a, b) => b.votes - a.votes);
    let rows = '';
    sorted.forEach((c, i) => {
      const bar = '█'.repeat(Math.round(c.pct / 2));
      rows += `<tr><td>${i === 0 ? '🥇 ' : ''}Candidate ${c.idx}</td><td>${c.votes.toLocaleString()}</td><td>${core.formatPercent(c.pct)}</td><td style="font-family:monospace">${bar}</td></tr>`;
    });
    const margin = sorted.length >= 2 ? sorted[0].pct - sorted[1].pct : 0;
    return {
      html: `<p><strong>Total Votes:</strong> ${total.toLocaleString()}</p>
        <table><tr><th>Candidate</th><th>Votes</th><th>Percentage</th><th>Bar</th></tr>${rows}</table>
        <p style="margin-top:0.5rem"><strong>Winning Margin:</strong> ${core.formatPercent(margin)}</p>`
    };
  }
});

R('word-counter', {
  title: 'Word Counter',
  description: 'Count words, characters, sentences, and paragraphs in your text.',
  tags: ['word', 'count', 'characters', 'text', 'analysis'],
  fields: [
    { id: 'text', label: 'Enter or paste your text', type: 'textarea', placeholder: 'Type or paste your text here...', hint: 'The counter updates as you type' },
  ],
  calculate: function(v) {
    const text = v.text || '';
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentences = text.trim() ? (text.match(/[.!?]+/g) || []).length || (words > 0 ? 1 : 0) : 0;
    const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).filter(p => p.trim()).length || 1 : 0;
    const lines = text.trim() ? text.split('\n').length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return {
      'Words': words.toLocaleString(),
      'Characters': chars.toLocaleString(),
      'Characters (no spaces)': charsNoSpace.toLocaleString(),
      'Sentences': sentences.toLocaleString(),
      'Paragraphs': paragraphs.toLocaleString(),
      'Lines': lines.toLocaleString(),
      'Reading Time': '~' + readingTime + ' min',
    };
  }
});

R('z-score-calculator', {
  title: 'Z-Score Calculator',
  description: 'Calculate the z-score for a value given the mean and standard deviation.',
  tags: ['z-score', 'standard score', 'normalization'],
  fields: [
    { id: 'value', label: 'Value (x)', type: 'number', step: 0.01, placeholder: 'e.g. 85' },
    { id: 'mean', label: 'Mean (μ)', type: 'number', step: 0.01, placeholder: 'e.g. 75', half: true },
    { id: 'stddev', label: 'Std Dev (σ)', type: 'number', step: 0.01, min: 0.001, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>z = (x − μ) / σ</code></p>',
  calculate: function(v) {
    if (!v.value || v.mean === undefined || !v.stddev) return { error: 'Enter all values' };
    const z = (v.value - v.mean) / v.stddev;
    let interpretation = '';
    if (z > 2) interpretation = 'Well above the mean (top ~2.5%)';
    else if (z > 1) interpretation = 'Above the mean (top ~16%)';
    else if (z > 0) interpretation = 'Slightly above the mean';
    else if (z === 0) interpretation = 'Exactly at the mean';
    else if (z > -1) interpretation = 'Slightly below the mean';
    else if (z > -2) interpretation = 'Below the mean (bottom ~16%)';
    else interpretation = 'Well below the mean (bottom ~2.5%)';
    return {
      'Z-Score': core.formatNumber(z, 4),
      'Value (x)': core.formatNumber(v.value),
      'Interpretation': interpretation,
    };
  }
});

})(calculatorRegistry);
