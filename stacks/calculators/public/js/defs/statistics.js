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
  background: '<p>Descriptive statistics condense a data set into a few numbers that describe its centre and spread, without claiming anything about a wider population. The mean is sensitive to outliers while the median is not, so reporting both is a quick check on skew. Quartiles and the interquartile range describe the spread of the middle half of the data and are the basis for the 1.5 × IQR rule used to flag outliers.</p>',
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
  background: '<p>These three measures of central tendency answer different questions: the mean uses every value, the median looks only at position, and the mode is the most frequent value. When data are symmetric the three roughly agree, but income and house prices are typically right-skewed, where the median is more representative. A data set can have no mode or several modes, which is why a mode result may list multiple values.</p>',
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
  background: '<p>Standard deviation is the typical distance of observations from the mean, expressed in the same units as the data, which makes it easier to interpret than variance. The sample version divides by n − 1 because the sample mean is itself estimated from the data, which slightly inflates each deviation and removes the downward bias. Deviations are squared before averaging, so a single extreme value can dominate the result; for skewed data the interquartile range is often more robust.</p>',
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
  background: '<p>Variance is the average squared deviation from the mean, so its units are squared — dollars squared rather than dollars. Squaring gives large deviations disproportionate weight, which is why variance is sensitive to outliers and why its square root, the standard deviation, is usually reported instead. The sample form divides by n − 1 so that repeated sampling averages to the true population variance.</p>',
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
  background: '<p>A z-score puts a value on the standard normal scale, telling you how many standard deviations it sits above or below the mean. It assumes the reference distribution is roughly normal and that the mean and standard deviation are known rather than estimated from the same data. About 68% of normal observations fall within one standard deviation and 95% within two, so a score beyond about ±2 is often treated as unusual.</p>',
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
  background: '<p>The t-score is the same standardisation as a z-score, but the population standard deviation is replaced by the sample value s, so the result follows a t distribution rather than a normal one. The t distribution has heavier tails, and how much heavier depends on the degrees of freedom, n − 1, which is why small samples need larger critical values. As the sample grows the t distribution converges to the normal.</p>',
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
  background: '<p>A confidence interval gives a range of plausible values for a population mean, built from the sample mean plus and minus a multiple of its standard error. The 95% level means that if the whole study were repeated many times, about 95% of the intervals produced would contain the true mean; it is not a 95% probability that the parameter lies in this particular interval. Intervals are narrowest with large samples and low variability.</p>',
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
  background: '<p>The margin of error is the half-width of a confidence interval for a proportion, and it shrinks with the square root of sample size, so quartering the sample only halves the error. It is largest near p = 0.5, which is why polls that assume a 50/50 split give the most conservative figure. Published poll margins usually refer to a 95% confidence level and cover sampling error only, not non-response or question wording.</p>',
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
  background: '<p>Required sample size follows from the margin of error you are willing to accept: precision improves with the square of the sample size, so halving the error needs roughly four times the respondents. The unknown proportion is usually set to 0.5 to be conservative. For small populations the finite population correction reduces the number needed, because sampling a large fraction of a small group carries relatively more information.</p>',
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
  background: '<p>A p-value is the probability of seeing a result at least as extreme as the observed one if the null hypothesis were true; it is not the probability that the null hypothesis is correct. It is compared with a significance level chosen in advance, such as 0.05, and small samples or many comparisons make small p-values less trustworthy. The conventional threshold is a convention, not a sharp boundary between real and illusory effects.</p>',
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
  background: '<p>Pearson correlation measures the strength of a straight-line relationship between two variables on a scale from −1 to 1, where 0 means no linear association. It is sensitive to outliers and says nothing about causation, and a strong coefficient can still hide a curved relationship. Squaring the coefficient gives the share of variance in one variable explained by a linear fit to the other.</p>',
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
  background: '<p>Least-squares regression chooses the line that minimises the sum of squared vertical distances from the points, which is why outliers can pull the slope noticeably. The slope is the expected change in y per one-unit change in x, while the intercept is the prediction when x is zero, which is often outside the observed data and not meaningful on its own. A good fit describes association, not causation.</p>',
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
  background: '<p>The chi-square goodness-of-fit test compares observed counts with counts expected under a hypothesised distribution, so it works on frequencies rather than percentages. Large values of χ² mean the observed counts stray further from expectation than chance alone would suggest. Every expected count should be at least about 5, and the degrees of freedom are the number of categories minus one, minus any parameters estimated from the data.</p>',
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
  background: '<p>A t-test asks whether an observed difference in means is larger than the noise expected from sampling variability. The one-sample form compares a sample mean with a hypothesised value, while the two-sample form compares two groups and pools their variances when equal spread is assumed. Results depend on roughly normal data or large samples, and on whether the test is one- or two-tailed.</p>',
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
  background: '<p>One-way ANOVA generalises the t-test to three or more groups by comparing the variability between group means with the variability inside the groups. If the between-group variance is large relative to the within-group variance, the F ratio is large and the hypothesis of equal means looks unlikely. A significant result says that at least one mean differs, not which one, so follow-up comparisons are needed.</p>',
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
  background: '<p>Classical probability counts equally likely outcomes, so the favourable-over-total ratio applies only when every outcome really is equally likely, as with dice and cards. Overlapping events use the addition rule, and independent events multiply; drawing without replacement changes the denominator on each draw. Empirical probability, estimated from observed frequencies, converges toward the classical value as trials increase.</p>',
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
  background: '<p>Permutations count arrangements in which order matters, so ABC and CBA are different. The falling factorial stops after r factors, which is why the count is smaller than n! but larger than the corresponding combination. Typical uses are finishing orders in a race, seating plans and character sequences in passwords.</p>',
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
  background: '<p>Combinations count selections in which order does not matter, so choosing Alice, Bob and Cara is one group however it is listed. Each combination corresponds to r! orderings, which is exactly why the permutation count is divided by r!. They appear in lottery odds, committee selection and the binomial coefficient at the heart of probability formulas.</p>',
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
  background: '<p>The binomial distribution counts successes in a fixed number of independent trials that each share the same success probability. It applies to yes/no outcomes such as coin flips, defectives in a batch or survey responses, provided the trials are independent and the number of trials is fixed in advance. For large n and a moderate p the normal distribution becomes a good approximation.</p>',
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
  background: '<p>The normal distribution is the familiar bell curve, defined by its mean and standard deviation; roughly 68% of values lie within one standard deviation of the mean, 95% within two and 99.7% within three. Probabilities come from the area under the curve, which has no closed form, so they are computed numerically or read from tables after standardising to a z-score. Many real quantities are only approximately normal, and heavily skewed data such as incomes are not.</p>',
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
  formula: '<p>Generates random integers between min and max (inclusive), with or without duplicates.</p>',
  background: '<p>These values come from a pseudorandom generator seeded by the browser, so they are statistically uniform but fully determined by that seed. Each draw is independent of the last, so a number that has not appeared recently is not any more likely to appear next. For anything security-sensitive, use a cryptographic generator rather than a general-purpose one.</p>',
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
  formula: '<p>Counts characters, words, sentences, paragraphs and lines from the supplied text.</p>',
  background: '<p>Character counts differ by convention: JavaScript string length counts UTF-16 code units, so some emoji and scripts register as two characters while the visible glyph is one. Words are usually split on whitespace, which overcounts hyphenated compounds and undercounts languages that do not separate words with spaces. Social platforms each apply their own weighting, so their limits may not match a raw count.</p>',
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
  formula: '<p>Simulates <code>count</code> fair coin flips or rolls of <code>numDice</code> dice with <code>sides</code> faces, reporting frequencies and averages.</p>',
  background: '<p>Each flip or roll is independent, so a run of heads does not make tails more likely; the long-run proportion converges to the true probability by the law of large numbers. For a fair coin the standard deviation of the number of heads grows with the square root of the number of flips, which is why short sessions look streaky. Simulated results are pseudorandom and fine for illustration but not for gambling or security.</p>',
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
  background: '<p>A frequency table groups values into bins and counts how many fall in each, trading detail for an overview of shape. Bin width matters: too few bins hide structure, too many produce a spiky and noisy table, and shifting the boundaries can change the picture. Cumulative counts and relative frequencies make it easier to compare data sets of different sizes.</p>',
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
  background: '<p>Percentile rank tells you the share of observations at or below a given value, which is not the same as the value at a given percentile. Ranks depend on the sample, so a score at the 90th percentile of one group may sit at the 60th percentile of another. Ties and small samples make the figure coarse.</p>',
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
  background: '<p>The five-number summary describes a distribution with five positions rather than a mean and standard deviation, so it is resistant to outliers. The box in a box plot spans the interquartile range and the whiskers usually extend to 1.5 × IQR, with points beyond that flagged as potential outliers. It works well for skewed data where a mean and standard deviation would mislead.</p>',
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
  formula: '<p><code>Sum = Σx</code>, <code>Average = Σx / n</code></p>',
  background: '<p>A sum is the simplest aggregate; on its own it says nothing about how many values there are or how they are spread. The average divides by the count, so one very large value can move it a long way. Reporting count, sum and average together avoids the classic mistake of comparing totals from groups of different sizes.</p>',
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
  background: '<p>Quartiles split ordered data into four parts, so Q1 and Q3 bracket the middle half of the observations. There is no single universal definition: Tukey hinges, linear interpolation and other methods give slightly different results for small samples. The interquartile range between Q1 and Q3 is a robust measure of spread because it ignores the extreme quarters.</p>',
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
  background: '<p>A percentile is the value below which a given percentage of observations fall, so the 90th percentile is the score that 90% of the group does not exceed. Different software uses different interpolation rules such as nearest rank, linear or exclusive, which is why the same data can give slightly different answers. Percentiles are useful for growth charts and test scores, where position in the group matters more than the raw value.</p>',
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
  formula: '<p>Splits each value into a stem (value ÷ stem unit, rounded down) and a leaf (remainder digit), then groups the leaves by stem.</p>',
  background: '<p>A stem-and-leaf plot keeps the original values while showing the shape of the distribution, which distinguishes it from a histogram. The stem is the leading digit or digits and the leaf is the trailing digit, so the plot works best for small to moderate data sets. The stem unit controls the resolution and can spread or compress the display.</p>',
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
  formula: '<p><code>Percentage = (Votes / Total Votes) × 100</code>, <code>Winning Margin = Top % − Runner-up %</code></p>',
  background: '<p>Vote share is each candidate total divided by all votes counted, so the shares always sum to 100%. The leading margin is usually expressed in percentage points, which is not the same as a percentage lead, since a 55% to 45% result is a 10-point margin but a 22% lead. Turnout, spoiled ballots and the treatment of undecided voters all affect how much a poll or count tells you.</p>',
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
  background: '<p>The arithmetic mean adds every value and divides by the count, so it uses all the information but is pulled toward extremes. For skewed data such as incomes or waiting times the median is often a fairer summary, and the geometric mean is appropriate for growth rates. Reporting the count alongside the average shows how much weight the figure carries.</p>',
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
  background: '<p>This is a second, simpler version of the five-number summary, giving the minimum, Q1, median, Q3 and maximum. Because it relies on positions rather than squared deviations, a few extreme values do not distort it the way they distort a mean. It is the natural summary behind a box plot and pairs well with the interquartile range for outlier screening.</p>',
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
  background: '<p>GPA is a credit-weighted average of grade points, so a three-credit course counts three times as much as a one-credit course. Scales differ by institution: a 4.0 scale typically maps A to 4.0 and F to 0, while some schools award A+ above 4.0 or use percentage bands. Pass/fail courses and transferred credits are usually excluded or handled by local rules.</p>',
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
  background: '<p>A weighted grade treats each assessment in proportion to its share of the final mark, so a final exam worth 40% moves the result far more than a quiz worth 5%. Scores are converted to percentages first, then multiplied by their weights. Categories with dropped lowest scores or extra credit follow the rules your course uses, not a simple average.</p>',
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
  formula: '<p>Builds a random string of the requested length from the selected letter and digit sets.</p>',
  background: '<p>This builds a random alphanumeric string from the character sets you choose, which is convenient for IDs, test data and placeholder codes. General-purpose pseudorandom output is predictable enough that it should not be used for passwords, tokens or anything that must resist guessing. Length matters more than complexity for resistance, but only a cryptographic source provides real security.</p>',
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
  formula: '<p>Generates the requested number of random PINs, each made of random digits.</p>',
  background: '<p>A four-digit PIN has only 10,000 possible values, so it can be exhausted by anyone allowed to try repeatedly; longer PINs add exponentially more combinations. Real systems rely on retry limits and lockouts rather than length alone. Generated PINs are pseudorandom and suit demos or temporary codes, not banking or device security.</p>',
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
  formula: '<p>Shuffles one or more full 52-card decks and draws the requested number of cards.</p>',
  background: '<p>A standard deck has 52 distinct cards in four suits of thirteen ranks, and drawing without replacement means each card can appear only once. An ideal shuffle gives every ordering equal probability, but software draws depend on the quality of the random source. The probability of a particular hand follows the hypergeometric distribution rather than the binomial.</p>',
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
  formula: '<p>Randomly selects names from the list without replacement.</p>',
  background: '<p>Picking without replacement guarantees no repeats, which is what you want for raffles and turn orders. Every remaining name has an equal chance at each draw, so earlier positions are not favoured; the order of the list matters only if the list itself is not random. For a truly fair public draw, use an auditable random source rather than a general-purpose generator.</p>',
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
  formula: '<p>Generates random integers from 1 to 10 (inclusive), with or without duplicates.</p>',
  background: '<p>Each draw is an integer from 1 to 10 with equal probability, so any specific number appears about 10% of the time in the long run. Independence means short sequences can look patterned even though they are not, and a repeat is not a sign that the generator is broken. Simulated draws are pseudorandom and unsuitable for security or gambling.</p>',
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
  formula: '<p>Generates random integers from 1 to 100 (inclusive), with or without duplicates.</p>',
  background: '<p>Each draw is an integer from 1 to 100 with equal probability, so the chance of any exact value is 1%. Duplicates are common when many values are drawn: with 23 draws there is already a better than even chance of a repeat, the birthday effect. These are pseudorandom draws, fine for sampling and games but not for cryptography.</p>',
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
  background: '<p>Standard deviation summarises how tightly values cluster around the mean, in the same units as the data. The sample form divides by n − 1 to correct the downward bias caused by measuring deviations from the sample mean rather than the true one. Squaring the deviations makes the measure sensitive to outliers, so look at the raw data or a robust spread measure for skewed distributions.</p>',
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
  background: '<p>This view pulls the main descriptive measures into one place: centre, spread, position and extremes. The mean and standard deviation describe roughly symmetric data well, while the median, quartiles and interquartile range are safer when the data are skewed or contain outliers. Comparing both sets of numbers is the quickest way to judge which summary is appropriate.</p>',
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
  background: '<p>Variance is the mean squared deviation from the centre, so its units are squared and it is harder to interpret than standard deviation. A single outlier can inflate it dramatically because deviations are squared before averaging. The sample form divides by n − 1 so that repeated sampling averages to the true population variance.</p>',
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
  formula: '<p><code>Percentage = (Votes / Total Votes) × 100</code>, <code>Winning Margin = Top % − Runner-up %</code></p>',
  background: '<p>This duplicate of the vote percentage tool converts raw tallies into shares of the total and shows the gap between the top two. Shares are of votes cast, so abstentions and invalid ballots change every percentage without changing the tallies. Margin in points and lead in percent are different statements and are often confused in reporting.</p>',
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
  formula: '<p>Counts words, characters, sentences, paragraphs and lines from the supplied text.</p>',
  background: '<p>Word counts depend on the splitting rule: most tools treat runs of non-space characters as words, which splits hyphenated and apostrophised forms but merges some languages that do not use spaces. Sentences are usually detected by terminal punctuation, so abbreviations and decimals can inflate the count. Editors and exam boards often specify their own counting convention.</p>',
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
  background: '<p>The z-score expresses a value relative to the mean in standard deviation units, making results from different scales comparable. It assumes a normal reference distribution; for skewed data the score is still arithmetic but percentile interpretations no longer hold. Values beyond about ±3 are rare under normality and are worth investigating as possible outliers or data errors.</p>',
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
