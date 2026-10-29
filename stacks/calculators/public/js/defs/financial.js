// Financial calculators
(function(reg) {
const R = reg.register.bind(reg, 'financial');

// === LOAN CALCULATORS ===

R('loan', {
  title: 'Loan Calculator',
  description: 'Calculate monthly payments, total cost, and interest for any loan.',
  tags: ['loan', 'mortgage', 'payment', 'amortization'],
  fields: [
    { id: 'loanAmount', label: 'Loan Amount', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 250000' },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 6.5', half: true },
    { id: 'termMonths', label: 'Term (months)', type: 'number', step: 1, min: 1, max: 600, placeholder: 'e.g. 360', half: true },
  ],
  formula: '<p><code>M = P × r × (1+r)ⁿ / ((1+r)ⁿ − 1)</code> where P is principal, r is monthly rate, n is number of payments.</p>',
  calculate: function(v) {
    const P = v.loanAmount, r = (v.interestRate || 0) / 100 / 12, n = v.termMonths;
    if (!P || !n) return { error: 'Enter valid amounts' };
    const M = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total = M * n, interest = total - P;
    return {
      'Monthly Payment': core.formatCurrency(M),
      'Total Paid': core.formatCurrency(total),
      'Total Interest': core.formatCurrency(interest),
      'Principal': core.formatCurrency(P),
    };
  }
});

R('loan-advanced', {
  title: 'Advanced Loan Calculator',
  description: 'Loan calculator with down payment and extra payments.',
  tags: ['loan', 'advanced', 'down payment', 'extra payment'],
  fields: [
    { id: 'loanAmount', label: 'Loan Amount', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 300000' },
    { id: 'downPayment', label: 'Down Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 60000', half: true },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 6.5', half: true },
    { id: 'termYears', label: 'Term (years)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 30', half: true },
    { id: 'extraPayment', label: 'Extra Monthly Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p>Same as standard loan but accounts for down payment and extra monthly payments to reduce the term.</p>',
  calculate: function(v) {
    const principal = v.loanAmount - (v.downPayment || 0);
    const r = (v.interestRate || 0) / 100 / 12;
    const n = Math.round(v.termYears * 12);
    const extra = v.extraPayment || 0;
    if (principal <= 0 || !n) return { error: 'Enter valid amounts' };
    let M = r === 0 ? principal / n : principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    // Simulate amortization with extra payment
    let bal = principal, totalInterest = 0, actualMonths = 0;
    const maxMonths = n * 2;
    while (bal > 0.01 && actualMonths < maxMonths) {
      const interest = bal * r;
      const payment = Math.min(M + extra, bal + interest);
      bal += interest - payment;
      totalInterest += interest;
      actualMonths++;
    }
    const totalPaid = principal + totalInterest;
    const saved = (n - actualMonths) * (M + extra);
    return {
      'Monthly Payment': core.formatCurrency(M + extra),
      'Base Payment': core.formatCurrency(M),
      'Actual Term': actualMonths + ' months (' + core.formatNumber(actualMonths / 12) + ' years)',
      'Total Paid': core.formatCurrency(totalPaid),
      'Total Interest': core.formatCurrency(totalInterest),
      'Time Saved': (n - actualMonths) + ' months',
    };
  }
});

R('car-loan', {
  title: 'Car Loan Calculator',
  description: 'Calculate car loan payments including trade-in and taxes.',
  tags: ['car', 'auto', 'vehicle', 'loan'],
  fields: [
    { id: 'carPrice', label: 'Car Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 35000' },
    { id: 'downPayment', label: 'Down Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'tradeIn', label: 'Trade-in Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 3000', half: true },
    { id: 'salesTax', label: 'Sales Tax Rate (%)', type: 'number', step: 0.1, min: 0, max: 50, placeholder: 'e.g. 7', half: true },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5.5', half: true },
    { id: 'termMonths', label: 'Term (months)', type: 'number', step: 1, min: 1, max: 120, placeholder: 'e.g. 60', half: true },
  ],
  formula: '<p>Price + tax − down payment − trade-in = principal. Then standard amortization.</p>',
  calculate: function(v) {
    const tax = v.carPrice * (v.salesTax || 0) / 100;
    const principal = v.carPrice + tax - (v.downPayment || 0) - (v.tradeIn || 0);
    const r = (v.interestRate || 0) / 100 / 12;
    const n = v.termMonths;
    if (principal <= 0 || !n) return { error: 'Enter valid amounts' };
    const M = r === 0 ? principal / n : principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return {
      'Monthly Payment': core.formatCurrency(M),
      'Principal': core.formatCurrency(principal),
      'Sales Tax': core.formatCurrency(tax),
      'Total Paid': core.formatCurrency(M * n),
      'Total Interest': core.formatCurrency(M * n - principal),
    };
  }
});

R('amortization-schedule', {
  title: 'Amortization Schedule Calculator',
  description: 'Generate a full amortization schedule for your loan.',
  tags: ['amortization', 'schedule', 'loan', 'mortgage'],
  fields: [
    { id: 'loanAmount', label: 'Loan Amount', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 200000' },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 6', half: true },
    { id: 'termYears', label: 'Term (years)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 30', half: true },
  ],
  calculate: function(v) {
    const P = v.loanAmount, r = (v.interestRate || 0) / 100 / 12, n = Math.round(v.termYears * 12);
    if (!P || !n) return { error: 'Enter valid amounts' };
    const M = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    let bal = P, totalInt = 0;
    let rows = '';
    // Show first 12, last 12, and summary
    const show = [0,1,2,3,4,5,6,7,8,9,10,11];
    const lastStart = Math.max(0, n - 12);
    for (let i = lastStart; i < n; i++) show.push(i);
    for (let i = 0; i < n; i++) {
      const interest = bal * r;
      const principal = M - interest;
      bal -= principal;
      totalInt += interest;
      if (show.includes(i)) {
        rows += `<tr><td>${i + 1}</td><td>${core.formatCurrency(Math.max(0, bal))}</td><td>${core.formatCurrency(interest)}</td><td>${core.formatCurrency(principal)}</td></tr>`;
      } else if (i === 12) {
        rows += '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">... middle payments omitted ...</td></tr>';
      }
    }
    return {
      html: `<h3>Monthly Payment: ${core.formatCurrency(M)}</h3>
        <table><tr><th>#</th><th>Balance</th><th>Interest</th><th>Principal</th></tr>${rows}</table>
        <p style="margin-top:.5rem">Total Interest: ${core.formatCurrency(totalInt)}</p>`
    };
  }
});

// === INTEREST CALCULATORS ===

R('compound-interest', {
  title: 'Compound Interest Calculator',
  description: 'Calculate the future value of an investment with compound interest.',
  tags: ['compound', 'interest', 'investment', 'FV'],
  fields: [
    { id: 'principal', label: 'Principal / Initial Investment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'contributions', label: 'Regular Contribution Amount', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500', half: true },
    { id: 'contribFreq', label: 'Contribution Frequency', type: 'select', half: true, options: [
      { value: '0', label: 'None' }, { value: '12', label: 'Monthly' }, { value: '26', label: 'Bi-weekly' }, { value: '52', label: 'Weekly' }, { value: '1', label: 'Yearly' }
    ]},
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'compoundFreq', label: 'Compounding Frequency', type: 'select', half: true, options: [
      { value: '1', label: 'Annually' }, { value: '4', label: 'Quarterly' }, { value: '12', label: 'Monthly' }, { value: '365', label: 'Daily' }, { value: '999', label: 'Continuous' }
    ]},
    { id: 'years', label: 'Number of Years', type: 'number', step: 0.5, min: 0.1, max: 100, placeholder: 'e.g. 20' },
  ],
  formula: '<p><code>A = P(1 + r/n)^(nt) + PMT × ((1 + r/n)^(nt) − 1) / (r/n)</code></p>',
  calculate: function(v) {
    const P = v.principal, PMT = v.contributions || 0, freq = v.contribFreq || 0;
    const r = (v.interestRate || 0) / 100, n = v.compoundFreq, t = v.years;
    if (!t) return { error: 'Enter valid values' };
    let balance = P;
    const periods = n === 999 ? t * 365 : n * t;
    const ratePerPeriod = n === 999 ? Math.exp(r) - 1 : r / n;
    const contribsPerPeriod = freq > 0 ? freq / n : 0;
    for (let i = 0; i < periods; i++) {
      balance *= (1 + ratePerPeriod);
      if (contribsPerPeriod > 0 && (i % (1 / contribsPerPeriod) < 1 || contribsPerPeriod >= 1)) {
        balance += PMT * contribsPerPeriod;
      }
    }
    const totalContributions = P + PMT * freq * t;
    const totalInterest = balance - totalContributions;
    return {
      'Final Balance': core.formatCurrency(balance),
      'Total Contributions': core.formatCurrency(totalContributions),
      'Total Interest Earned': core.formatCurrency(totalInterest),
      'Initial Principal': core.formatCurrency(P),
    };
  }
});

R('simple-interest', {
  title: 'Simple Interest Calculator',
  description: 'Calculate simple interest on a principal amount.',
  tags: ['simple', 'interest'],
  fields: [
    { id: 'principal', label: 'Principal', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000' },
    { id: 'rate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'time', label: 'Time (years)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>I = P × r × t</code> and <code>A = P + I</code></p>',
  calculate: function(v) {
    const P = v.principal, r = (v.rate || 0) / 100, t = v.time;
    const I = P * r * t, A = P + I;
    return {
      'Interest Earned': core.formatCurrency(I),
      'Total Amount': core.formatCurrency(A),
      'Principal': core.formatCurrency(P),
    };
  }
});

R('future-value', {
  title: 'Future Value Calculator',
  description: 'Calculate the future value of an investment.',
  tags: ['FV', 'future value', 'investment'],
  fields: [
    { id: 'pv', label: 'Present Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'pmt', label: 'Regular Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 200', half: true },
    { id: 'rate', label: 'Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'periods', label: 'Number of Periods (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>FV = PV(1+r)^n + PMT × ((1+r)^n − 1) / r</code></p>',
  calculate: function(v) {
    const PV = v.pv, PMT = v.pmt || 0, r = (v.rate || 0) / 100, n = v.periods;
    if (!n) return { error: 'Enter valid values' };
    const fvPV = r === 0 ? PV : PV * Math.pow(1 + r, n);
    const fvPMT = r === 0 ? PMT * n : PMT * (Math.pow(1 + r, n) - 1) / r;
    return {
      'Future Value': core.formatCurrency(fvPV + fvPMT),
      'Growth from PV': core.formatCurrency(fvPV - PV),
      'Growth from Payments': core.formatCurrency(fvPMT - PMT * n),
      'Total Payments': core.formatCurrency(PMT * n),
    };
  }
});

R('present-value', {
  title: 'Present Value Calculator',
  description: 'Calculate the present value of a future sum.',
  tags: ['PV', 'present value', 'discount'],
  fields: [
    { id: 'fv', label: 'Future Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'rate', label: 'Annual Discount Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'periods', label: 'Number of Periods (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>PV = FV / (1 + r)^n</code></p>',
  calculate: function(v) {
    const FV = v.fv, r = (v.rate || 0) / 100, n = v.periods;
    const PV = r === 0 ? FV : FV / Math.pow(1 + r, n);
    return {
      'Present Value': core.formatCurrency(PV),
      'Future Value': core.formatCurrency(FV),
      'Discount': core.formatCurrency(FV - PV),
    };
  }
});

// === ROI & PROFIT ===

R('roi', {
  title: 'ROI Calculator',
  description: 'Calculate return on investment percentage.',
  tags: ['ROI', 'return', 'investment'],
  fields: [
    { id: 'invested', label: 'Amount Invested', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10000' },
    { id: 'returned', label: 'Amount Returned', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 15000' },
  ],
  formula: '<p><code>ROI = (Returned − Invested) / Invested × 100%</code></p>',
  calculate: function(v) {
    const gain = v.returned - v.invested;
    const roi = (gain / v.invested) * 100;
    return {
      'ROI': core.formatPercent(roi),
      'Gain / Loss': core.formatCurrency(gain),
      'Profit Multiple': core.formatNumber(gain / v.invested + 1) + 'x',
    };
  }
});

R('discount', {
  title: 'Discount Calculator',
  description: 'Calculate the sale price after a percentage discount.',
  tags: ['discount', 'sale', 'percent off'],
  fields: [
    { id: 'originalPrice', label: 'Original Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
    { id: 'discountPct', label: 'Discount (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 25' },
  ],
  formula: '<p><code>Sale Price = Original × (1 − Discount%)</code></p>',
  calculate: function(v) {
    const saved = v.originalPrice * v.discountPct / 100;
    return {
      'Sale Price': core.formatCurrency(v.originalPrice - saved),
      'You Save': core.formatCurrency(saved),
      'Original Price': core.formatCurrency(v.originalPrice),
    };
  }
});

R('profit-margin', {
  title: 'Profit Margin Calculator',
  description: 'Calculate profit margin from cost and selling price.',
  tags: ['profit', 'margin', 'markup'],
  fields: [
    { id: 'cost', label: 'Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 70' },
    { id: 'price', label: 'Selling Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
  ],
  formula: '<p><code>Margin = (Price − Cost) / Price × 100%</code></p>',
  calculate: function(v) {
    const profit = v.price - v.cost;
    const margin = v.price ? (profit / v.price) * 100 : 0;
    const markup = v.cost ? (profit / v.cost) * 100 : 0;
    return {
      'Profit': core.formatCurrency(profit),
      'Profit Margin': core.formatPercent(margin),
      'Markup': core.formatPercent(markup),
    };
  }
});

// === DEPRECIATION ===

R('depreciation', {
  title: 'Straight-Line Depreciation Calculator',
  description: 'Calculate straight-line depreciation over an asset\'s life.',
  tags: ['depreciation', 'straight-line', 'asset'],
  fields: [
    { id: 'cost', label: 'Asset Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'salvage', label: 'Salvage Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'life', label: 'Useful Life (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>Annual Depreciation = (Cost − Salvage) / Life</code></p>',
  calculate: function(v) {
    const annual = (v.cost - v.salvage) / v.life;
    const monthly = annual / 12;
    const rate = (annual / v.cost) * 100;
    return {
      'Annual Depreciation': core.formatCurrency(annual),
      'Monthly Depreciation': core.formatCurrency(monthly),
      'Depreciation Rate': core.formatPercent(rate),
      'Book Value After 1 Year': core.formatCurrency(v.cost - annual),
    };
  }
});

R('depreciation-double-declining', {
  title: 'Double Declining Balance Depreciation',
  description: 'Calculate depreciation using the double declining balance method.',
  tags: ['depreciation', 'double declining', 'DDB'],
  fields: [
    { id: 'cost', label: 'Asset Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'salvage', label: 'Salvage Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'life', label: 'Useful Life (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>Rate = 2 / Life. Each year: Depreciation = Book Value × Rate (not below salvage).</code></p>',
  calculate: function(v) {
    const rate = 2 / v.life;
    let bv = v.cost, total = 0;
    let rows = '';
    for (let y = 1; y <= v.life; y++) {
      const dep = Math.min(bv * rate, bv - v.salvage);
      bv -= dep;
      total += dep;
      rows += `<tr><td>${y}</td><td>${core.formatCurrency(dep)}</td><td>${core.formatCurrency(bv)}</td></tr>`;
    }
    return {
      html: `<h3>Depreciation Rate: ${core.formatPercent(rate * 100)}</h3>
        <table><tr><th>Year</th><th>Depreciation</th><th>Book Value</th></tr>${rows}</table>
        <p style="margin-top:.5rem">Total Depreciated: ${core.formatCurrency(total)}</p>`
    };
  }
});

// === SALARY & PAY ===

R('hourly-to-salary', {
  title: 'Hourly Wage to Salary Calculator',
  description: 'Convert hourly wage to annual salary and vice versa.',
  tags: ['hourly', 'salary', 'wage', 'pay'],
  fields: [
    { id: 'hourly', label: 'Hourly Wage', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 25', half: true },
    { id: 'hours', label: 'Hours per Week', type: 'number', step: 1, min: 1, max: 168, placeholder: 'e.g. 40', half: true },
    { id: 'weeks', label: 'Working Weeks per Year', type: 'number', step: 1, min: 1, max: 52, placeholder: 'e.g. 52', half: true },
  ],
  calculate: function(v) {
    const annual = v.hourly * v.hours * v.weeks;
    return {
      'Annual Salary': core.formatCurrency(annual),
      'Monthly': core.formatCurrency(annual / 12),
      'Bi-weekly': core.formatCurrency(annual / 26),
      'Weekly': core.formatCurrency(annual / v.weeks),
      'Daily (8hr)': core.formatCurrency(v.hourly * 8),
    };
  }
});

R('gross-pay', {
  title: 'Gross Pay Calculator',
  description: 'Estimate take-home pay after taxes.',
  tags: ['paycheck', 'taxes', 'net pay', 'deductions'],
  fields: [
    { id: 'gross', label: 'Gross Pay', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000' },
    { id: 'fedTax', label: 'Federal Tax (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 12', half: true },
    { id: 'stateTax', label: 'State Tax (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'fica', label: 'FICA / Social Security (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 7.65', half: true },
    { id: 'other', label: 'Other Deductions (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 0', half: true },
  ],
  calculate: function(v) {
    const fed = v.gross * (v.fedTax || 0) / 100;
    const state = v.gross * (v.stateTax || 0) / 100;
    const fica = v.gross * (v.fica || 0) / 100;
    const other = v.gross * (v.other || 0) / 100;
    const total = fed + state + fica + other;
    const net = v.gross - total;
    return {
      'Net Pay': core.formatCurrency(net),
      'Federal Tax': core.formatCurrency(fed),
      'State Tax': core.formatCurrency(state),
      'FICA': core.formatCurrency(fica),
      'Other': core.formatCurrency(other),
      'Total Deductions': core.formatCurrency(total),
      'Effective Tax Rate': core.formatPercent((total / v.gross) * 100),
    };
  }
});

// === SAVINGS & INVESTMENT ===

R('savings', {
  title: 'Savings Calculator',
  description: 'Calculate how much you\'ll have with regular savings.',
  tags: ['savings', 'piggy bank', 'goal'],
  fields: [
    { id: 'initial', label: 'Initial Savings', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 1000' },
    { id: 'monthly', label: 'Monthly Contribution', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 200', half: true },
    { id: 'rate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 4', half: true },
    { id: 'years', label: 'Years', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 10' },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100 / 12, n = v.years * 12;
    let bal = v.initial;
    for (let i = 0; i < n; i++) { bal = bal * (1 + r) + v.monthly; }
    const totalContributions = v.initial + v.monthly * n;
    return {
      'Final Balance': core.formatCurrency(bal),
      'Total Contributed': core.formatCurrency(totalContributions),
      'Interest Earned': core.formatCurrency(bal - totalContributions),
    };
  }
});

R('cagr', {
  title: 'CAGR Calculator',
  description: 'Calculate Compound Annual Growth Rate.',
  tags: ['CAGR', 'growth rate', 'compound'],
  fields: [
    { id: 'begin', label: 'Beginning Value', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10000' },
    { id: 'end', label: 'Ending Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 20000' },
    { id: 'years', label: 'Number of Years', type: 'number', step: 0.5, min: 0.1, max: 100, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>CAGR = (End / Begin)^(1/years) − 1</code></p>',
  calculate: function(v) {
    const cagr = (Math.pow(v.end / v.begin, 1 / v.years) - 1) * 100;
    return {
      'CAGR': core.formatPercent(cagr),
      'Total Return': core.formatPercent(((v.end - v.begin) / v.begin) * 100),
      'Average Annual Return': core.formatPercent(((v.end - v.begin) / v.begin / v.years) * 100),
    };
  }
});

R('cd', {
  title: 'CD Calculator',
  description: 'Calculate returns on a Certificate of Deposit.',
  tags: ['CD', 'certificate of deposit', 'bank'],
  fields: [
    { id: 'deposit', label: 'Deposit Amount', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'rate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'term', label: 'Term (months)', type: 'number', step: 1, min: 1, max: 120, placeholder: 'e.g. 12', half: true },
    { id: 'compound', label: 'Compounding', type: 'select', options: [
      { value: '12', label: 'Monthly', default: true }, { value: '4', label: 'Quarterly' }, { value: '1', label: 'Annually' }, { value: '365', label: 'Daily' }
    ]},
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100 / v.compound, n = v.compound * v.term / 12;
    const fv = v.deposit * Math.pow(1 + r, n);
    return {
      'Maturity Value': core.formatCurrency(fv),
      'Interest Earned': core.formatCurrency(fv - v.deposit),
      'APY': core.formatPercent((Math.pow(1 + (v.rate / 100) / v.compound, v.compound) - 1) * 100),
    };
  }
});

// === CURRENCY ===

R('currency-appreciation', {
  title: 'Currency Appreciation/Depreciation Calculator',
  description: 'Calculate currency appreciation or depreciation percentage.',
  tags: ['currency', 'appreciation', 'depreciation', 'exchange'],
  fields: [
    { id: 'oldRate', label: 'Old Exchange Rate', type: 'number', step: 0.0001, min: 0.0001, placeholder: 'e.g. 1.10' },
    { id: 'newRate', label: 'New Exchange Rate', type: 'number', step: 0.0001, min: 0.0001, placeholder: 'e.g. 1.20' },
  ],
  formula: '<p><code>Change% = (New − Old) / Old × 100</code></p>',
  calculate: function(v) {
    const change = ((v.newRate - v.oldRate) / v.oldRate) * 100;
    const type = change >= 0 ? 'Appreciation' : 'Depreciation';
    return {
      'Change': core.formatPercent(change),
      'Type': type,
      'Old Rate': core.formatNumber(v.oldRate, 4),
      'New Rate': core.formatNumber(v.newRate, 4),
    };
  }
});

// === APR ===

R('apr', {
  title: 'APR Calculator',
  description: 'Estimate the Annual Percentage Rate of a loan.',
  tags: ['APR', 'annual percentage rate', 'loan cost'],
  fields: [
    { id: 'amount', label: 'Loan Amount', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10000' },
    { id: 'fee', label: 'Finance Charges / Fees', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500', half: true },
    { id: 'term', label: 'Term (months)', type: 'number', step: 1, min: 1, max: 600, placeholder: 'e.g. 36', half: true },
  ],
  calculate: function(v) {
    const monthlyPayment = (v.amount + v.fee) / v.term;
    // Approximate APR using iteration
    let lo = 0, hi = 100;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2 / 100 / 12;
      const calc = mid === 0 ? v.amount / v.term : v.amount * mid * Math.pow(1 + mid, v.term) / (Math.pow(1 + mid, v.term) - 1);
      if (calc < monthlyPayment) lo = (lo + hi) / 2;
      else hi = (lo + hi) / 2;
    }
    return {
      'Estimated APR': core.formatPercent((lo + hi) / 2),
      'Monthly Payment': core.formatCurrency(monthlyPayment),
      'Total Cost': core.formatCurrency(v.amount + v.fee),
      'Finance Charges': core.formatCurrency(v.fee),
    };
  }
});

// === DEBT RATIOS ===

R('debt-ratios', {
  title: 'Debt Ratios Calculator',
  description: 'Calculate debt-to-income and other financial ratios.',
  tags: ['debt', 'DTI', 'ratios', 'financial health'],
  fields: [
    { id: 'income', label: 'Gross Monthly Income', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5000' },
    { id: 'housing', label: 'Monthly Housing Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 1200', half: true },
    { id: 'otherDebt', label: 'Other Monthly Debt Payments', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 400', half: true },
  ],
  calculate: function(v) {
    const frontEnd = (v.housing / v.income) * 100;
    const backEnd = ((v.housing + v.otherDebt) / v.income) * 100;
    return {
      'Front-End Ratio (Housing)': core.formatPercent(frontEnd),
      'Back-End Ratio (Total Debt)': core.formatPercent(backEnd),
      'Remaining Income': core.formatCurrency(v.income - v.housing - v.otherDebt),
      'Status': backEnd <= 36 ? '✅ Generally acceptable' : backEnd <= 43 ? '⚠️ May be stretched' : '❌ High risk',
    };
  }
});

// === CHECKBOOK ===

R('checkbook', {
  title: 'Checkbook Calculator',
  description: 'Track deposits and withdrawals to find your balance.',
  tags: ['checkbook', 'balance', 'deposits', 'withdrawals'],
  fields: [
    { id: 'deposits', label: 'Deposits (comma-separated)', type: 'textarea', placeholder: 'e.g. 2000, 500, 1500', hint: 'Enter all deposits separated by commas' },
    { id: 'withdrawals', label: 'Withdrawals (comma-separated)', type: 'textarea', placeholder: 'e.g. 800, 300, 150, 200', hint: 'Enter all withdrawals separated by commas' },
  ],
  calculate: function(v) {
    const dep = v.deposits.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n) && n > 0);
    const wth = v.withdrawals.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n) && n > 0);
    const totalDep = dep.reduce((s, v) => s + v, 0);
    const totalWth = wth.reduce((s, v) => s + v, 0);
    return {
      'Total Deposits': core.formatCurrency(totalDep),
      'Total Withdrawals': core.formatCurrency(totalWth),
      'Balance': core.formatCurrency(totalDep - totalWth),
      'Number of Deposits': dep.length,
      'Number of Withdrawals': wth.length,
    };
  }
});

// === BID-ASK ===

R('bid-ask', {
  title: 'Bid-Ask Calculator',
  description: 'Calculate spread, midpoint, and spread percentage.',
  tags: ['bid', 'ask', 'spread', 'trading'],
  fields: [
    { id: 'bid', label: 'Bid Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 99.50', half: true },
    { id: 'ask', label: 'Ask Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100.50', half: true },
  ],
  calculate: function(v) {
    const spread = v.ask - v.bid;
    const mid = (v.bid + v.ask) / 2;
    const spreadPct = mid ? (spread / mid) * 100 : 0;
    return {
      'Spread': core.formatNumber(spread, 4),
      'Midpoint': core.formatNumber(mid, 4),
      'Spread %': core.formatPercent(spreadPct, 4),
    };
  }
});

// === ADDING MACHINE ===

R('adding-machine', {
  title: 'Adding Machine Calculator',
  description: 'Simple addition and subtraction of multiple values.',
  tags: ['adding', 'sum', 'total', 'calculator'],
  fields: [
    { id: 'values', label: 'Values (comma-separated)', type: 'textarea', placeholder: 'e.g. 100, -20, 50, 30, -10', hint: 'Use negative numbers for subtractions' },
  ],
  calculate: function(v) {
    const vals = v.values.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n));
    const positives = vals.filter(n => n > 0);
    const negatives = vals.filter(n => n < 0);
    return {
      'Total': core.formatCurrency(vals.reduce((s, v) => s + v, 0)),
      'Sum of Positives': core.formatCurrency(positives.reduce((s, v) => s + v, 0)),
      'Sum of Negatives': core.formatCurrency(negatives.reduce((s, v) => s + v, 0)),
      'Count': vals.length,
    };
  }
});

// === ANNUITY ===

R('annuity-table', {
  title: 'Annuity on Loan Table Creator',
  description: 'Create an annuity factor table for various rates and periods.',
  tags: ['annuity', 'table', 'factor', 'loan'],
  fields: [
    { id: 'startRate', label: 'Starting Rate (%)', type: 'number', step: 0.25, min: 0.25, max: 50, placeholder: 'e.g. 3', half: true },
    { id: 'endRate', label: 'Ending Rate (%)', type: 'number', step: 0.25, min: 0.25, max: 50, placeholder: 'e.g. 10', half: true },
    { id: 'startPeriod', label: 'Starting Periods', type: 'number', step: 1, min: 1, max: 360, placeholder: 'e.g. 12', half: true },
    { id: 'endPeriod', label: 'Ending Periods', type: 'number', step: 1, min: 1, max: 360, placeholder: 'e.g. 60', half: true },
  ],
  calculate: function(v) {
    let html = '<table><tr><th>Periods \\ Rate</th>';
    const rates = [];
    for (let r = v.startRate; r <= v.endRate; r += 0.5) rates.push(r);
    rates.forEach(r => { html += `<th>${r}%</th>`; });
    html += '</tr>';
    for (let p = v.startPeriod; p <= v.endPeriod; p += Math.max(1, Math.floor((v.endPeriod - v.startPeriod) / 10))) {
      html += `<tr><td>${p}</td>`;
      rates.forEach(r => {
        const i = r / 100 / 12;
        const factor = i === 0 ? 1 / p : i / (1 - Math.pow(1 + i, -p));
        html += `<td>${core.formatNumber(factor, 6)}</td>`;
      });
      html += '</tr>';
    }
    html += '</table>';
    return { html };
  }
});

// === DEFERRED ANNUITY ===

R('deferred-annuity', {
  title: 'Deferred Fixed Annuity Calculator',
  description: 'Calculate the value of a deferred annuity.',
  tags: ['annuity', 'deferred', 'retirement'],
  fields: [
    { id: 'initial', label: 'Initial Investment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'accumRate', label: 'Accumulation Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'accumYears', label: 'Accumulation Years', type: 'number', step: 1, min: 1, max: 50, placeholder: 'e.g. 20', half: true },
    { id: 'payoutRate', label: 'Payout Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 4', half: true },
    { id: 'payoutYears', label: 'Payout Years', type: 'number', step: 1, min: 1, max: 40, placeholder: 'e.g. 15', half: true },
  ],
  calculate: function(v) {
    const accumFV = v.initial * Math.pow(1 + v.accumRate / 100, v.accumYears);
    const r = v.payoutRate / 100 / 12, n = v.payoutYears * 12;
    const monthly = r === 0 ? accumFV / n : accumFV * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return {
      'Accumulated Value': core.formatCurrency(accumFV),
      'Monthly Payout': core.formatCurrency(monthly),
      'Annual Payout': core.formatCurrency(monthly * 12),
      'Total Payout': core.formatCurrency(monthly * n),
    };
  }
});

// === CATALOG ALIASES ===
// Map catalog slugs (the "-calculator" suffixed names) onto the real calculators
// defined in this file. Aliases are applied at the very end of the file, once every
// target calculator has actually been registered.

const CATALOG_ALIASES = {
  // Loan
  'loan-calculator': 'loan',
  'mortgage-calculator': 'loan',
  'mortgage-payment-calculator': 'loan',
  'mortgage-repayment-calculator': 'loan',
  'emi-loan-calculator': 'loan',
  'loan-repayment-calculator': 'loan',
  'loan-calculator-advanced': 'loan-advanced',
  'car-loan-calculator': 'car-loan',
  'car-loan-payment-calculator': 'car-loan',
  'amortization-schedule-calculator': 'amortization-schedule',

  // Interest
  'compound-interest-calculator': 'compound-interest',
  'simple-interest-calculator': 'simple-interest',
  'future-value-calculator': 'future-value',
  'present-value-calculator': 'present-value',

  // ROI / Profit
  'return-on-investment-roi-calculator': 'roi',
  'discount-calculator': 'discount',
  'profit-margin-calculator': 'profit-margin',

  // Depreciation
  'depreciation-calculator': 'depreciation',
  'depreciation-straight-line': 'depreciation',
  'depreciation-declining-double': 'depreciation-double-declining',

  // Salary
  'hourly-to-salary-calculator': 'hourly-to-salary',
  'gross-pay-calculator': 'gross-pay',

  // Savings / Investment
  'savings-calculator': 'savings',
  'cagr-calculator': 'cagr',
  'cd-calculator': 'cd',

  // Currency / APR / Ratios / Other
  'currency-appreciation-depreciation-calculator': 'currency-appreciation',
  'apr-calculator': 'apr',
  'apr-calculator-basic': 'apr',
  'debt-ratios-calculator': 'debt-ratios',
  'checkbook-calculator': 'checkbook',
  'checkbook-balance-calculator': 'checkbook',
  'bid-ask-calculator': 'bid-ask',
  'adding-machine-calculator': 'adding-machine',
  'deferred-fixed-annuity-calculator': 'deferred-annuity',
};

const applyCatalogAliases = () => {
  const unresolved = [];
  for (const [aliasSlug, targetSlug] of Object.entries(CATALOG_ALIASES)) {
    const target = reg.get('financial', targetSlug);
    if (target) {
      R(aliasSlug, target);
    } else {
      unresolved.push(`${aliasSlug} -> ${targetSlug}`);
    }
  }
  if (unresolved.length) {
    console.warn('[financial] unresolved catalog aliases:', unresolved);
  }
};

// === NEW CALCULATORS ===

// --- Loan ---

R('loan-calculator-simple', {
  title: 'Simple Loan Calculator',
  description: 'Calculate monthly payment for a simple loan.',
  tags: ['loan', 'simple', 'payment'],
  fields: [
    { id: 'P', label: 'Principal', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 250000' },
    { id: 'r', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 6.5', half: true },
    { id: 'n', label: 'Number of Payments (months)', type: 'number', step: 1, min: 1, max: 600, placeholder: 'e.g. 360', half: true },
  ],
  formula: '<p><code>M = P × r × (1+r)ⁿ / ((1+r)ⁿ − 1)</code></p>',
  calculate: function(v) {
    const P = v.P, r = (v.r || 0) / 100 / 12, n = v.n;
    if (!P || !n) return { error: 'Enter valid amounts' };
    const M = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return {
      'Monthly Payment': core.formatCurrency(M),
      'Total Paid': core.formatCurrency(M * n),
      'Total Interest': core.formatCurrency(M * n - P),
    };
  }
});

R('how-much-car-can-i-afford', {
  title: 'How Much Car Can I Afford?',
  description: 'Find the maximum car price given your monthly budget.',
  tags: ['car', 'afford', 'budget'],
  fields: [
    { id: 'monthlyBudget', label: 'Monthly Budget', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 400' },
    { id: 'downPayment', label: 'Down Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 3000', half: true },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5.5', half: true },
    { id: 'termMonths', label: 'Term (months)', type: 'number', step: 1, min: 1, max: 120, placeholder: 'e.g. 60', half: true },
    { id: 'salesTax', label: 'Sales Tax Rate (%)', type: 'number', step: 0.1, min: 0, max: 50, placeholder: 'e.g. 7', half: true },
  ],
  calculate: function(v) {
    const M = v.monthlyBudget, r = (v.interestRate || 0) / 100 / 12, n = v.termMonths;
    const taxRate = (v.salesTax || 0) / 100;
    if (!M || !n) return { error: 'Enter valid amounts' };
    // M = (price*(1+tax) - down) * r*(1+r)^n / ((1+r)^n - 1)
    // price*(1+tax) = M * ((1+r)^n - 1) / (r*(1+r)^n) + down
    const factor = r === 0 ? 1 / n : r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const principal = M / factor;
    const price = (principal + (v.downPayment || 0)) / (1 + taxRate);
    return {
      'Max Car Price': core.formatCurrency(price),
      'Down Payment': core.formatCurrency(v.downPayment || 0),
      'Financed Amount': core.formatCurrency(principal),
      'Total Cost': core.formatCurrency(M * n),
    };
  }
});

R('how-much-house-can-i-afford', {
  title: 'How Much House Can I Afford?',
  description: 'Estimate the maximum house price based on your income and debt.',
  tags: ['house', 'mortgage', 'afford', 'income'],
  fields: [
    { id: 'annualIncome', label: 'Annual Gross Income', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 80000' },
    { id: 'downPayment', label: 'Down Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 40000', half: true },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 6.5', half: true },
    { id: 'termYears', label: 'Term (years)', type: 'number', step: 1, min: 1, max: 50, placeholder: 'e.g. 30', half: true },
    { id: 'maxDTI', label: 'Max Debt-to-Income Ratio (%)', type: 'number', step: 0.5, min: 1, max: 100, placeholder: 'e.g. 36', half: true },
    { id: 'otherDebt', label: 'Other Monthly Debt', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 300', half: true },
  ],
  calculate: function(v) {
    const monthlyIncome = v.annualIncome / 12;
    const maxMonthly = monthlyIncome * (v.maxDTI || 36) / 100;
    const housingBudget = maxMonthly - (v.otherDebt || 0);
    const r = (v.interestRate || 0) / 100 / 12, n = v.termYears * 12;
    const factor = r === 0 ? 1 / n : r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const loanAmount = housingBudget / factor;
    const housePrice = loanAmount + (v.downPayment || 0);
    return {
      'Max House Price': core.formatCurrency(housePrice),
      'Max Loan Amount': core.formatCurrency(loanAmount),
      'Estimated Monthly Payment': core.formatCurrency(housingBudget),
      'Monthly Income': core.formatCurrency(monthlyIncome),
      'DTI Ratio': core.formatPercent((housingBudget / monthlyIncome) * 100),
    };
  }
});

R('how-much-loan-can-i-afford', {
  title: 'How Much Loan Can I Afford?',
  description: 'Find the maximum loan amount given your monthly payment budget.',
  tags: ['loan', 'afford', 'budget'],
  fields: [
    { id: 'monthlyPayment', label: 'Monthly Payment Budget', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 500' },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 6', half: true },
    { id: 'termMonths', label: 'Term (months)', type: 'number', step: 1, min: 1, max: 600, placeholder: 'e.g. 360', half: true },
  ],
  calculate: function(v) {
    const M = v.monthlyPayment, r = (v.interestRate || 0) / 100 / 12, n = v.termMonths;
    if (!M || !n) return { error: 'Enter valid amounts' };
    const P = r === 0 ? M * n : M * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
    return {
      'Max Loan Amount': core.formatCurrency(P),
      'Total Paid': core.formatCurrency(M * n),
      'Total Interest': core.formatCurrency(M * n - P),
    };
  }
});

R('loan-payment-table', {
  title: 'Loan Payment Table Generator',
  description: 'Generate a table of monthly payments for various loan amounts, rates, and terms.',
  tags: ['loan', 'payment', 'table'],
  fields: [
    { id: 'minAmount', label: 'Min Loan Amount', type: 'number', step: 1000, min: 100, placeholder: 'e.g. 50000', half: true },
    { id: 'maxAmount', label: 'Max Loan Amount', type: 'number', step: 1000, min: 100, placeholder: 'e.g. 300000', half: true },
    { id: 'amountStep', label: 'Amount Step', type: 'number', step: 1000, min: 100, placeholder: 'e.g. 50000', half: true },
    { id: 'rate', label: 'Interest Rate (%)', type: 'number', step: 0.25, min: 0, max: 50, placeholder: 'e.g. 6', half: true },
    { id: 'term', label: 'Term (years)', type: 'number', step: 1, min: 1, max: 50, placeholder: 'e.g. 30', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100 / 12, n = v.term * 12;
    let html = '<table><tr><th>Loan Amount</th><th>Monthly Payment</th><th>Total Paid</th><th>Total Interest</th></tr>';
    for (let amt = v.minAmount; amt <= v.maxAmount; amt += v.amountStep) {
      const M = r === 0 ? amt / n : amt * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      html += `<tr><td>${core.formatCurrency(amt)}</td><td>${core.formatCurrency(M)}</td><td>${core.formatCurrency(M * n)}</td><td>${core.formatCurrency(M * n - amt)}</td></tr>`;
    }
    html += '</table>';
    return { html };
  }
});

R('amortization-equal-principal-payments-calculator', {
  title: 'Amortization: Equal Principal Payments',
  description: 'Generate an amortization schedule with equal principal payments each period.',
  tags: ['amortization', 'equal principal', 'schedule'],
  fields: [
    { id: 'loanAmount', label: 'Loan Amount', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 200000' },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 6', half: true },
    { id: 'termYears', label: 'Term (years)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 30', half: true },
  ],
  calculate: function(v) {
    const P = v.loanAmount, r = (v.interestRate || 0) / 100 / 12, n = Math.round(v.termYears * 12);
    if (!P || !n) return { error: 'Enter valid amounts' };
    const principalPerMonth = P / n;
    let bal = P, totalInt = 0;
    let rows = '';
    const show = [0,1,2,3,4,5,6,7,8,9,10,11];
    const lastStart = Math.max(0, n - 12);
    for (let i = lastStart; i < n; i++) show.push(i);
    for (let i = 0; i < n; i++) {
      const interest = bal * r;
      bal -= principalPerMonth;
      totalInt += interest;
      if (show.includes(i)) {
        rows += `<tr><td>${i + 1}</td><td>${core.formatCurrency(principalPerMonth + interest)}</td><td>${core.formatCurrency(interest)}</td><td>${core.formatCurrency(Math.max(0, bal))}</td></tr>`;
      } else if (i === 12) {
        rows += '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">... middle payments omitted ...</td></tr>';
      }
    }
    return {
      html: `<h3>Principal per Month: ${core.formatCurrency(principalPerMonth)}</h3>
        <table><tr><th>#</th><th>Payment</th><th>Interest</th><th>Balance</th></tr>${rows}</table>
        <p style="margin-top:.5rem">Total Interest: ${core.formatCurrency(totalInt)}</p>`
    };
  }
});

R('interest-only-mortgage-calculator', {
  title: 'Interest-Only Mortgage Calculator',
  description: 'Calculate interest-only payments and the balloon payment at the end.',
  tags: ['mortgage', 'interest-only', 'balloon'],
  fields: [
    { id: 'loanAmount', label: 'Loan Amount', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 300000' },
    { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 6', half: true },
    { id: 'termYears', label: 'Interest-Only Period (years)', type: 'number', step: 1, min: 1, max: 30, placeholder: 'e.g. 5', half: true },
  ],
  calculate: function(v) {
    const P = v.loanAmount, r = (v.interestRate || 0) / 100 / 12, n = v.termYears * 12;
    const monthlyInterest = P * r;
    return {
      'Monthly Interest Payment': core.formatCurrency(monthlyInterest),
      'Total Interest Paid': core.formatCurrency(monthlyInterest * n),
      'Balloon Payment (Principal)': core.formatCurrency(P),
      'Total Cost': core.formatCurrency(P + monthlyInterest * n),
    };
  }
});

// --- Depreciation ---

R('depreciation-declining-balance', {
  title: 'Declining Balance Depreciation Calculator',
  description: 'Calculate depreciation using a variable declining balance rate.',
  tags: ['depreciation', 'declining balance'],
  fields: [
    { id: 'cost', label: 'Asset Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'salvage', label: 'Salvage Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'life', label: 'Useful Life (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'rate', label: 'Declining Rate Multiplier', type: 'number', step: 0.1, min: 0.1, max: 5, placeholder: 'e.g. 1.5', half: true },
  ],
  formula: '<p><code>Rate = Multiplier / Life. Each year: Depreciation = Book Value × Rate (not below salvage).</code></p>',
  calculate: function(v) {
    const rate = (v.rate || 2) / v.life;
    let bv = v.cost, total = 0;
    let rows = '';
    for (let y = 1; y <= v.life; y++) {
      const dep = Math.min(bv * rate, bv - v.salvage);
      bv -= dep;
      total += dep;
      rows += `<tr><td>${y}</td><td>${core.formatCurrency(dep)}</td><td>${core.formatCurrency(bv)}</td></tr>`;
    }
    return {
      html: `<h3>Depreciation Rate: ${core.formatPercent(rate * 100)}</h3>
        <table><tr><th>Year</th><th>Depreciation</th><th>Book Value</th></tr>${rows}</table>
        <p style="margin-top:.5rem">Total Depreciated: ${core.formatCurrency(total)}</p>`
    };
  }
});

R('depreciation-activity', {
  title: 'Activity Depreciation Calculator',
  description: 'Calculate depreciation based on actual usage (activity method).',
  tags: ['depreciation', 'activity', 'units'],
  fields: [
    { id: 'cost', label: 'Asset Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'salvage', label: 'Salvage Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'totalUnits', label: 'Total Estimated Units', type: 'number', step: 1, min: 1, placeholder: 'e.g. 100000', half: true },
    { id: 'unitsUsed', label: 'Units Used This Period', type: 'number', step: 1, min: 0, placeholder: 'e.g. 12000', half: true },
  ],
  formula: '<p><code>Rate per Unit = (Cost − Salvage) / Total Units. Depreciation = Rate × Units Used.</code></p>',
  calculate: function(v) {
    const ratePerUnit = (v.cost - v.salvage) / v.totalUnits;
    const dep = ratePerUnit * v.unitsUsed;
    const bv = v.cost - dep;
    return {
      'Rate per Unit': core.formatCurrency(ratePerUnit),
      'Depreciation This Period': core.formatCurrency(dep),
      'Book Value': core.formatCurrency(bv),
      'Remaining Units': core.formatNumber(v.totalUnits - v.unitsUsed),
    };
  }
});

R('depreciation-units-production', {
  title: 'Units of Production Depreciation Calculator',
  description: 'Calculate depreciation based on production output.',
  tags: ['depreciation', 'units', 'production'],
  fields: [
    { id: 'cost', label: 'Asset Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'salvage', label: 'Salvage Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'totalUnits', label: 'Total Estimated Production', type: 'number', step: 1, min: 1, placeholder: 'e.g. 100000', half: true },
    { id: 'unitsProduced', label: 'Units Produced This Period', type: 'number', step: 1, min: 0, placeholder: 'e.g. 12000', half: true },
  ],
  calculate: function(v) {
    const ratePerUnit = (v.cost - v.salvage) / v.totalUnits;
    const dep = ratePerUnit * v.unitsProduced;
    return {
      'Rate per Unit': core.formatCurrency(ratePerUnit),
      'Depreciation': core.formatCurrency(dep),
      'Book Value': core.formatCurrency(v.cost - dep),
    };
  }
});

R('depreciation-sum-of-years', {
  title: 'Sum of Years Digits Depreciation Calculator',
  description: 'Calculate depreciation using the sum-of-the-years-digits method.',
  tags: ['depreciation', 'SYD', 'sum of years'],
  fields: [
    { id: 'cost', label: 'Asset Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'salvage', label: 'Salvage Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'life', label: 'Useful Life (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>SYD = n(n+1)/2. Year k depreciation = (n−k+1)/SYD × (Cost − Salvage).</code></p>',
  calculate: function(v) {
    const syd = v.life * (v.life + 1) / 2;
    const depreciable = v.cost - v.salvage;
    let bv = v.cost, total = 0;
    let rows = '';
    for (let y = 1; y <= v.life; y++) {
      const dep = (v.life - y + 1) / syd * depreciable;
      bv -= dep;
      total += dep;
      rows += `<tr><td>${y}</td><td>${core.formatCurrency(dep)}</td><td>${core.formatCurrency(bv)}</td></tr>`;
    }
    return {
      html: `<h3>Sum of Years Digits: ${syd}</h3>
        <table><tr><th>Year</th><th>Depreciation</th><th>Book Value</th></tr>${rows}</table>
        <p style="margin-top:.5rem">Total Depreciated: ${core.formatCurrency(total)}</p>`
    };
  }
});

R('depreciation-property-realestate', {
  title: 'Property Depreciation Calculator (Real Estate)',
  description: 'Calculate residential real estate depreciation (27.5 years) or commercial (39 years).',
  tags: ['depreciation', 'real estate', 'property', 'MACRS'],
  fields: [
    { id: 'cost', label: 'Property Cost (excluding land)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 300000' },
    { id: 'propertyType', label: 'Property Type', type: 'select', options: [
      { value: '27.5', label: 'Residential (27.5 years)', default: true },
      { value: '39', label: 'Commercial (39 years)' }
    ]},
  ],
  calculate: function(v) {
    const life = parseFloat(v.propertyType || '27.5');
    const annual = v.cost / life;
    const monthly = annual / 12;
    let rows = '';
    let bv = v.cost;
    for (let y = 1; y <= life; y++) {
      bv -= annual;
      rows += `<tr><td>${y}</td><td>${core.formatCurrency(annual)}</td><td>${core.formatCurrency(Math.max(0, bv))}</td></tr>`;
    }
    return {
      html: `<h3>Annual Depreciation: ${core.formatCurrency(annual)}</h3>
        <p>Monthly: ${core.formatCurrency(monthly)}</p>
        <table><tr><th>Year</th><th>Depreciation</th><th>Book Value</th></tr>${rows}</table>`
    };
  }
});

R('depreciation-fixed-declining-balance', {
  title: 'Fixed Declining Balance Depreciation Calculator',
  description: 'Calculate depreciation with a fixed declining balance rate.',
  tags: ['depreciation', 'fixed', 'declining balance'],
  fields: [
    { id: 'cost', label: 'Asset Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'salvage', label: 'Salvage Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'life', label: 'Useful Life (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'rate', label: 'Annual Depreciation Rate (%)', type: 'number', step: 0.1, min: 0.1, max: 100, placeholder: 'e.g. 20', half: true },
  ],
  calculate: function(v) {
    const rate = v.rate / 100;
    let bv = v.cost, total = 0;
    let rows = '';
    for (let y = 1; y <= v.life; y++) {
      const dep = Math.min(bv * rate, bv - v.salvage);
      bv -= dep;
      total += dep;
      rows += `<tr><td>${y}</td><td>${core.formatCurrency(dep)}</td><td>${core.formatCurrency(bv)}</td></tr>`;
    }
    return {
      html: `<h3>Rate: ${core.formatPercent(v.rate)}</h3>
        <table><tr><th>Year</th><th>Depreciation</th><th>Book Value</th></tr>${rows}</table>
        <p style="margin-top:.5rem">Total Depreciated: ${core.formatCurrency(total)}</p>`
    };
  }
});

R('depreciation-variable-declining-balance', {
  title: 'Variable Declining Balance Depreciation Calculator',
  description: 'Calculate depreciation with a variable rate each period.',
  tags: ['depreciation', 'variable', 'declining balance'],
  fields: [
    { id: 'cost', label: 'Asset Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'salvage', label: 'Salvage Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'life', label: 'Useful Life (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'rate', label: 'Declining Rate Multiplier', type: 'number', step: 0.1, min: 0.1, max: 5, placeholder: 'e.g. 1.5', half: true },
  ],
  calculate: function(v) {
    const rate = (v.rate || 1) / v.life;
    let bv = v.cost, total = 0;
    let rows = '';
    for (let y = 1; y <= v.life; y++) {
      const dep = Math.min(bv * rate, bv - v.salvage);
      bv -= dep;
      total += dep;
      rows += `<tr><td>${y}</td><td>${core.formatCurrency(dep)}</td><td>${core.formatCurrency(bv)}</td></tr>`;
    }
    return {
      html: `<h3>Rate: ${core.formatPercent(rate * 100)}</h3>
        <table><tr><th>Year</th><th>Depreciation</th><th>Book Value</th></tr>${rows}</table>
        <p style="margin-top:.5rem">Total Depreciated: ${core.formatCurrency(total)}</p>`
    };
  }
});

// --- Interest ---

R('compound-interest-calculator-periodic', {
  title: 'Periodic Compound Interest Calculator',
  description: 'Calculate compound interest with periodic contributions.',
  tags: ['compound', 'interest', 'periodic'],
  fields: [
    { id: 'principal', label: 'Principal', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'contribution', label: 'Periodic Contribution', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500', half: true },
    { id: 'rate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'periods', label: 'Number of Periods', type: 'number', step: 1, min: 1, max: 1000, placeholder: 'e.g. 120', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100, n = v.periods;
    let bal = v.principal;
    for (let i = 0; i < n; i++) {
      bal = bal * (1 + r) + (v.contribution || 0);
    }
    const totalContrib = v.principal + (v.contribution || 0) * n;
    return {
      'Final Balance': core.formatCurrency(bal),
      'Total Contributions': core.formatCurrency(totalContrib),
      'Interest Earned': core.formatCurrency(bal - totalContrib),
    };
  }
});

R('simple-interest-plus-principal-calculator', {
  title: 'Simple Interest Calculator (A = P(1 + rt))',
  description: 'Calculate total amount with simple interest including principal.',
  tags: ['simple', 'interest', 'principal'],
  fields: [
    { id: 'principal', label: 'Principal', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000' },
    { id: 'rate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'time', label: 'Time (years)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>A = P(1 + rt)</code></p>',
  calculate: function(v) {
    const A = v.principal * (1 + (v.rate || 0) / 100 * v.time);
    return {
      'Total Amount': core.formatCurrency(A),
      'Interest': core.formatCurrency(A - v.principal),
      'Principal': core.formatCurrency(v.principal),
    };
  }
});

R('future-value-calculator-basic', {
  title: 'Future Value Calculator',
  description: 'Calculate the future value of a single sum.',
  tags: ['FV', 'future value'],
  fields: [
    { id: 'pv', label: 'Present Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'rate', label: 'Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'periods', label: 'Number of Periods (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100, n = v.periods;
    const fv = v.pv * Math.pow(1 + r, n);
    return {
      'Future Value': core.formatCurrency(fv),
      'Growth': core.formatCurrency(fv - v.pv),
    };
  }
});

R('future-value-investment-calculator', {
  title: 'Future Value of Investment Calculator',
  description: 'Calculate the future value of a present investment sum.',
  tags: ['FV', 'investment'],
  fields: [
    { id: 'pv', label: 'Present Investment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'rate', label: 'Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'periods', label: 'Number of Periods (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100, n = v.periods;
    const fv = v.pv * Math.pow(1 + r, n);
    return {
      'Future Value': core.formatCurrency(fv),
      'Growth': core.formatCurrency(fv - v.pv),
    };
  }
});

R('future-value-investment-account-calculator', {
  title: 'Future Value of Investment Account Calculator',
  description: 'Calculate the future value of an investment account with regular contributions.',
  tags: ['FV', 'investment', 'account'],
  fields: [
    { id: 'pv', label: 'Initial Investment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'pmt', label: 'Regular Contribution', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500', half: true },
    { id: 'rate', label: 'Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'periods', label: 'Number of Periods (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100, n = v.periods;
    const fvPV = v.pv * Math.pow(1 + r, n);
    const fvPMT = r === 0 ? (v.pmt || 0) * n : (v.pmt || 0) * (Math.pow(1 + r, n) - 1) / r;
    return {
      'Future Value': core.formatCurrency(fvPV + fvPMT),
      'From Initial': core.formatCurrency(fvPV),
      'From Contributions': core.formatCurrency(fvPMT),
    };
  }
});

R('future-value-annuity-calculator', {
  title: 'Future Value of Annuity Calculator',
  description: 'Calculate the future value of a series of equal payments.',
  tags: ['FV', 'annuity'],
  fields: [
    { id: 'pmt', label: 'Payment Amount', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500' },
    { id: 'rate', label: 'Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'periods', label: 'Number of Periods', type: 'number', step: 1, min: 1, max: 500, placeholder: 'e.g. 120', half: true },
  ],
  formula: '<p><code>FV = PMT × ((1+r)ⁿ − 1) / r</code></p>',
  calculate: function(v) {
    const r = (v.rate || 0) / 100, n = v.periods;
    const fv = r === 0 ? v.pmt * n : v.pmt * (Math.pow(1 + r, n) - 1) / r;
    return {
      'Future Value': core.formatCurrency(fv),
      'Total Payments': core.formatCurrency(v.pmt * n),
      'Interest Earned': core.formatCurrency(fv - v.pmt * n),
    };
  }
});

R('future-value-cash-flows-calculator', {
  title: 'Future Value of Cash Flows Calculator',
  description: 'Calculate the future value of a series of uneven cash flows.',
  tags: ['FV', 'cash flows'],
  fields: [
    { id: 'cashFlows', label: 'Cash Flows (comma-separated)', type: 'textarea', placeholder: 'e.g. 1000, 1500, 2000, 1200', hint: 'Enter each cash flow separated by commas' },
    { id: 'rate', label: 'Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
  ],
  calculate: function(v) {
    const flows = v.cashFlows.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n));
    const r = (v.rate || 0) / 100;
    let fv = 0;
    for (let i = 0; i < flows.length; i++) {
      fv += flows[i] * Math.pow(1 + r, flows.length - 1 - i);
    }
    return {
      'Future Value': core.formatCurrency(fv),
      'Total Cash Flows': core.formatCurrency(flows.reduce((s, v) => s + v, 0)),
      'Number of Flows': flows.length,
    };
  }
});

R('present-value-calculator-basic', {
  title: 'Present Value Calculator',
  description: 'Calculate the present value of a future sum.',
  tags: ['PV', 'present value'],
  fields: [
    { id: 'fv', label: 'Future Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'rate', label: 'Annual Discount Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'periods', label: 'Number of Periods (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100, n = v.periods;
    const pv = v.fv / Math.pow(1 + r, n);
    return {
      'Present Value': core.formatCurrency(pv),
      'Future Value': core.formatCurrency(v.fv),
      'Discount': core.formatCurrency(v.fv - pv),
    };
  }
});

R('present-value-investment-calculator', {
  title: 'Present Value of a Future Sum Calculator',
  description: 'Calculate what a future amount is worth today.',
  tags: ['PV', 'investment'],
  fields: [
    { id: 'fv', label: 'Future Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'rate', label: 'Annual Discount Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'periods', label: 'Number of Periods (years)', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100, n = v.periods;
    const pv = v.fv / Math.pow(1 + r, n);
    return {
      'Present Value': core.formatCurrency(pv),
      'Future Value': core.formatCurrency(v.fv),
      'Discount': core.formatCurrency(v.fv - pv),
    };
  }
});

R('present-value-annuity-calculator', {
  title: 'Present Value of Annuity Calculator',
  description: 'Calculate the present value of a series of equal payments.',
  tags: ['PV', 'annuity'],
  fields: [
    { id: 'pmt', label: 'Payment Amount', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500' },
    { id: 'rate', label: 'Annual Discount Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'periods', label: 'Number of Periods', type: 'number', step: 1, min: 1, max: 500, placeholder: 'e.g. 120', half: true },
  ],
  formula: '<p><code>PV = PMT × (1 − (1+r)⁻ⁿ) / r</code></p>',
  calculate: function(v) {
    const r = (v.rate || 0) / 100, n = v.periods;
    const pv = r === 0 ? v.pmt * n : v.pmt * (1 - Math.pow(1 + r, -n)) / r;
    return {
      'Present Value': core.formatCurrency(pv),
      'Total Payments': core.formatCurrency(v.pmt * n),
      'Discount': core.formatCurrency(v.pmt * n - pv),
    };
  }
});

R('present-value-cash-flows-calculator', {
  title: 'Present Value of Cash Flows Calculator',
  description: 'Calculate the present value of a series of uneven cash flows.',
  tags: ['PV', 'cash flows'],
  fields: [
    { id: 'cashFlows', label: 'Cash Flows (comma-separated)', type: 'textarea', placeholder: 'e.g. 1000, 1500, 2000, 1200', hint: 'Enter each future cash flow separated by commas' },
    { id: 'rate', label: 'Annual Discount Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
  ],
  calculate: function(v) {
    const flows = v.cashFlows.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n));
    const r = (v.rate || 0) / 100;
    let pv = 0;
    for (let i = 0; i < flows.length; i++) {
      pv += flows[i] / Math.pow(1 + r, i + 1);
    }
    return {
      'Present Value': core.formatCurrency(pv),
      'Total Cash Flows': core.formatCurrency(flows.reduce((s, v) => s + v, 0)),
      'Number of Flows': flows.length,
    };
  }
});

R('net-present-value-calculator', {
  title: 'Net Present Value Calculator',
  description: 'Calculate the NPV of a series of cash flows including an initial investment.',
  tags: ['NPV', 'net present value', 'cash flows'],
  fields: [
    { id: 'initialInvestment', label: 'Initial Investment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'cashFlows', label: 'Future Cash Flows (comma-separated)', type: 'textarea', placeholder: 'e.g. 3000, 4000, 5000, 3000', hint: 'Enter each year\'s cash flow separated by commas' },
    { id: 'rate', label: 'Discount Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>NPV = −Initial + Σ CFₜ / (1+r)ᵗ</code></p>',
  calculate: function(v) {
    const flows = v.cashFlows.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n));
    const r = (v.rate || 0) / 100;
    let npv = -v.initialInvestment;
    for (let i = 0; i < flows.length; i++) {
      npv += flows[i] / Math.pow(1 + r, i + 1);
    }
    return {
      'NPV': core.formatCurrency(npv),
      'Decision': npv >= 0 ? '✅ Accept (positive NPV)' : '❌ Reject (negative NPV)',
      'Initial Investment': core.formatCurrency(v.initialInvestment),
      'Total Cash Inflows': core.formatCurrency(flows.reduce((s, v) => s + v, 0)),
    };
  }
});

R('effective-annual-rate-calculator', {
  title: 'Effective Annual Rate Calculator',
  description: 'Calculate the effective annual rate (EAR) from a nominal rate and compounding frequency.',
  tags: ['EAR', 'effective rate'],
  fields: [
    { id: 'nominalRate', label: 'Nominal Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 12' },
    { id: 'compoundFreq', label: 'Compounding Frequency per Year', type: 'number', step: 1, min: 1, max: 365, placeholder: 'e.g. 12', half: true },
  ],
  formula: '<p><code>EAR = (1 + r/n)ⁿ − 1</code></p>',
  calculate: function(v) {
    const r = v.nominalRate / 100, n = v.compoundFreq;
    const ear = (Math.pow(1 + r / n, n) - 1) * 100;
    return {
      'Effective Annual Rate': core.formatPercent(ear),
      'Nominal Rate': core.formatPercent(v.nominalRate),
      'Compounding Periods': n,
    };
  }
});

R('effective-interest-rate-calculator', {
  title: 'Effective Interest Rate Calculator',
  description: 'Calculate the effective interest rate accounting for compounding.',
  tags: ['EIR', 'effective rate'],
  fields: [
    { id: 'nominalRate', label: 'Nominal Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 12' },
    { id: 'compoundFreq', label: 'Compounding Frequency per Year', type: 'number', step: 1, min: 1, max: 365, placeholder: 'e.g. 12', half: true },
  ],
  calculate: function(v) {
    const r = v.nominalRate / 100, n = v.compoundFreq;
    const eir = (Math.pow(1 + r / n, n) - 1) * 100;
    return {
      'Effective Interest Rate': core.formatPercent(eir),
      'Nominal Rate': core.formatPercent(v.nominalRate),
    };
  }
});

R('equivalent-interest-rate-calculator', {
  title: 'Equivalent Interest Rate Calculator',
  description: 'Find the equivalent rate for a different compounding frequency.',
  tags: ['equivalent', 'interest rate'],
  fields: [
    { id: 'rate', label: 'Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 12' },
    { id: 'fromFreq', label: 'From Compounding Frequency', type: 'number', step: 1, min: 1, max: 365, placeholder: 'e.g. 12', half: true },
    { id: 'toFreq', label: 'To Compounding Frequency', type: 'number', step: 1, min: 1, max: 365, placeholder: 'e.g. 4', half: true },
  ],
  calculate: function(v) {
    const r = v.rate / 100;
    const ear = Math.pow(1 + r / v.fromFreq, v.fromFreq) - 1;
    const equivRate = (Math.pow(1 + ear, 1 / v.toFreq) - 1) * v.toFreq * 100;
    return {
      'Equivalent Rate': core.formatPercent(equivRate),
      'EAR': core.formatPercent(ear * 100),
      'From Frequency': v.fromFreq + 'x/year',
      'To Frequency': v.toFreq + 'x/year',
    };
  }
});

R('nominal-interest-rate-calculator', {
  title: 'Nominal Interest Rate Calculator',
  description: 'Calculate the nominal rate from an effective rate and compounding frequency.',
  tags: ['nominal', 'interest rate'],
  fields: [
    { id: 'effectiveRate', label: 'Effective Annual Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 12.68' },
    { id: 'compoundFreq', label: 'Compounding Frequency per Year', type: 'number', step: 1, min: 1, max: 365, placeholder: 'e.g. 12', half: true },
  ],
  calculate: function(v) {
    const ear = v.effectiveRate / 100, n = v.compoundFreq;
    const nominal = (Math.pow(1 + ear, 1 / n) - 1) * n * 100;
    return {
      'Nominal Rate': core.formatPercent(nominal),
      'Effective Rate': core.formatPercent(v.effectiveRate),
      'Compounding Periods': n,
    };
  }
});

R('periodic-interest-rate-calculator', {
  title: 'Periodic Interest Rate Calculator',
  description: 'Calculate the periodic interest rate from an annual rate.',
  tags: ['periodic', 'interest rate'],
  fields: [
    { id: 'annualRate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 12' },
    { id: 'periodsPerYear', label: 'Periods per Year', type: 'number', step: 1, min: 1, max: 365, placeholder: 'e.g. 12', half: true },
  ],
  calculate: function(v) {
    const periodic = v.annualRate / v.periodsPerYear;
    return {
      'Periodic Rate': core.formatPercent(periodic, 4),
      'Annual Rate': core.formatPercent(v.annualRate),
      'Periods per Year': v.periodsPerYear,
    };
  }
});

R('interest-rate-table', {
  title: 'Interest Rate Table Creator',
  description: 'Generate a table of interest factors for various rates and periods.',
  tags: ['interest', 'rate', 'table'],
  fields: [
    { id: 'startRate', label: 'Starting Rate (%)', type: 'number', step: 0.25, min: 0.25, max: 50, placeholder: 'e.g. 3', half: true },
    { id: 'endRate', label: 'Ending Rate (%)', type: 'number', step: 0.25, min: 0.25, max: 50, placeholder: 'e.g. 10', half: true },
    { id: 'startPeriod', label: 'Starting Periods', type: 'number', step: 1, min: 1, max: 360, placeholder: 'e.g. 12', half: true },
    { id: 'endPeriod', label: 'Ending Periods', type: 'number', step: 1, min: 1, max: 360, placeholder: 'e.g. 60', half: true },
  ],
  calculate: function(v) {
    let html = '<table><tr><th>Periods \\ Rate</th>';
    const rates = [];
    for (let r = v.startRate; r <= v.endRate; r += 0.5) rates.push(r);
    rates.forEach(r => { html += `<th>${r}%</th>`; });
    html += '</tr>';
    for (let p = v.startPeriod; p <= v.endPeriod; p += Math.max(1, Math.floor((v.endPeriod - v.startPeriod) / 10))) {
      html += `<tr><td>${p}</td>`;
      rates.forEach(r => {
        const i = r / 100;
        const factor = Math.pow(1 + i, p);
        html += `<td>${core.formatNumber(factor, 4)}</td>`;
      });
      html += '</tr>';
    }
    html += '</table>';
    return { html };
  }
});

// --- Investment / Savings ---

R('savings-goal-calculator', {
  title: 'Savings Goal Calculator',
  description: 'Calculate how much to save monthly to reach a financial goal.',
  tags: ['savings', 'goal', 'monthly'],
  fields: [
    { id: 'goal', label: 'Savings Goal', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 50000' },
    { id: 'initial', label: 'Current Savings', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'rate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 5', half: true },
    { id: 'years', label: 'Years to Save', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 10', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100 / 12, n = v.years * 12;
    const fvInitial = v.initial * Math.pow(1 + r, n);
    const remaining = v.goal - fvInitial;
    const monthly = r === 0 ? remaining / n : remaining * r / (Math.pow(1 + r, n) - 1);
    return {
      'Monthly Savings Needed': core.formatCurrency(monthly),
      'Growth from Current Savings': core.formatCurrency(fvInitial),
      'Remaining to Save': core.formatCurrency(remaining),
      'Total Contributions': core.formatCurrency(v.initial + monthly * n),
    };
  }
});

R('investment-calculator', {
  title: 'Investment Calculator',
  description: 'Calculate investment growth with regular contributions.',
  tags: ['investment', 'growth'],
  fields: [
    { id: 'initial', label: 'Initial Investment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'monthly', label: 'Monthly Contribution', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500', half: true },
    { id: 'rate', label: 'Annual Return (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 8', half: true },
    { id: 'years', label: 'Years', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 20', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100 / 12, n = v.years * 12;
    let bal = v.initial;
    for (let i = 0; i < n; i++) bal = bal * (1 + r) + (v.monthly || 0);
    const totalContrib = v.initial + (v.monthly || 0) * n;
    return {
      'Final Value': core.formatCurrency(bal),
      'Total Contributed': core.formatCurrency(totalContrib),
      'Growth': core.formatCurrency(bal - totalContrib),
    };
  }
});

R('investment-inflation-calculator', {
  title: 'Investment Inflation Calculator',
  description: 'Calculate the real value of an investment adjusted for inflation.',
  tags: ['investment', 'inflation', 'real return'],
  fields: [
    { id: 'initial', label: 'Initial Investment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'rate', label: 'Annual Return (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'inflation', label: 'Annual Inflation Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 3', half: true },
    { id: 'years', label: 'Years', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 20', half: true },
  ],
  calculate: function(v) {
    const nominalFV = v.initial * Math.pow(1 + v.rate / 100, v.years);
    const realFV = nominalFV / Math.pow(1 + v.inflation / 100, v.years);
    const realRate = ((1 + v.rate / 100) / (1 + v.inflation / 100) - 1) * 100;
    return {
      'Nominal Future Value': core.formatCurrency(nominalFV),
      'Real Future Value': core.formatCurrency(realFV),
      'Real Return Rate': core.formatPercent(realRate),
      'Purchasing Power Lost': core.formatCurrency(nominalFV - realFV),
    };
  }
});

R('retirement-savings-calculator', {
  title: 'Retirement Savings Calculator',
  description: 'Plan your retirement savings with contributions and growth.',
  tags: ['retirement', 'savings', 'planning'],
  fields: [
    { id: 'currentSavings', label: 'Current Savings', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'monthly', label: 'Monthly Contribution', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500', half: true },
    { id: 'rate', label: 'Annual Return (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 7', half: true },
    { id: 'yearsToRetire', label: 'Years Until Retirement', type: 'number', step: 1, min: 1, max: 50, placeholder: 'e.g. 30', half: true },
    { id: 'retirementYears', label: 'Years in Retirement', type: 'number', step: 1, min: 1, max: 40, placeholder: 'e.g. 20', half: true },
  ],
  calculate: function(v) {
    const r = (v.rate || 0) / 100 / 12;
    let bal = v.currentSavings;
    const accMonths = v.yearsToRetire * 12;
    for (let i = 0; i < accMonths; i++) bal = bal * (1 + r) + (v.monthly || 0);
    const retirementBal = bal;
    const payoutMonths = v.retirementYears * 12;
    const monthlyPayout = r === 0 ? retirementBal / payoutMonths : retirementBal * r * Math.pow(1 + r, payoutMonths) / (Math.pow(1 + r, payoutMonths) - 1);
    return {
      'Retirement Nest Egg': core.formatCurrency(retirementBal),
      'Monthly Retirement Income': core.formatCurrency(monthlyPayout),
      'Total Contributions': core.formatCurrency(v.currentSavings + (v.monthly || 0) * accMonths),
      'Growth': core.formatCurrency(retirementBal - v.currentSavings - (v.monthly || 0) * accMonths),
    };
  }
});

R('inflation-calculator', {
  title: 'Inflation Calculator',
  description: 'Calculate the effect of inflation on purchasing power.',
  tags: ['inflation', 'purchasing power'],
  fields: [
    { id: 'amount', label: 'Current Amount', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 1000' },
    { id: 'inflation', label: 'Annual Inflation Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 3', half: true },
    { id: 'years', label: 'Years', type: 'number', step: 0.5, min: 0.5, max: 100, placeholder: 'e.g. 10', half: true },
  ],
  calculate: function(v) {
    const futureValue = v.amount * Math.pow(1 + v.inflation / 100, v.years);
    const purchasingPower = v.amount / Math.pow(1 + v.inflation / 100, v.years);
    return {
      'Future Cost': core.formatCurrency(futureValue),
      'Current Purchasing Power in Future': core.formatCurrency(purchasingPower),
      'Loss in Purchasing Power': core.formatPercent((1 - purchasingPower / v.amount) * 100),
    };
  }
});

R('rule-of-72-calculator', {
  title: 'Rule of 72 Calculator',
  description: 'Estimate how long it takes for an investment to double.',
  tags: ['rule of 72', 'doubling', 'investment'],
  fields: [
    { id: 'rate', label: 'Annual Interest Rate (%)', type: 'number', step: 0.01, min: 0.1, max: 100, placeholder: 'e.g. 8' },
  ],
  formula: '<p><code>Years to Double = 72 / Rate</code></p>',
  calculate: function(v) {
    const years = 72 / v.rate;
    const exactYears = Math.log(2) / Math.log(1 + v.rate / 100);
    return {
      'Estimated Years to Double (Rule of 72)': core.formatNumber(years, 2),
      'Exact Years to Double': core.formatNumber(exactYears, 2),
      'Difference': core.formatNumber(Math.abs(years - exactYears), 4),
    };
  }
});

R('salary-inflation-calculator', {
  title: 'Salary Inflation Calculator',
  description: 'Calculate what your salary would be adjusted for inflation.',
  tags: ['salary', 'inflation', 'wage'],
  fields: [
    { id: 'salary', label: 'Current Salary', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 60000' },
    { id: 'inflation', label: 'Annual Inflation Rate (%)', type: 'number', step: 0.01, min: 0, max: 100, placeholder: 'e.g. 3', half: true },
    { id: 'years', label: 'Years', type: 'number', step: 1, min: 1, max: 50, placeholder: 'e.g. 10', half: true },
  ],
  calculate: function(v) {
    const adjusted = v.salary * Math.pow(1 + v.inflation / 100, v.years);
    return {
      'Inflation-Adjusted Salary': core.formatCurrency(adjusted),
      'Increase Needed': core.formatCurrency(adjusted - v.salary),
      'Percentage Increase': core.formatPercent((adjusted / v.salary - 1) * 100),
    };
  }
});

// --- Salary / Pay ---

R('salary-to-hourly-calculator', {
  title: 'Salary to Hourly Calculator',
  description: 'Convert annual salary to hourly pay rate.',
  tags: ['salary', 'hourly', 'wage'],
  fields: [
    { id: 'salary', label: 'Annual Salary', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 60000' },
    { id: 'hours', label: 'Hours per Week', type: 'number', step: 1, min: 1, max: 168, placeholder: 'e.g. 40', half: true },
    { id: 'weeks', label: 'Working Weeks per Year', type: 'number', step: 1, min: 1, max: 52, placeholder: 'e.g. 52', half: true },
  ],
  calculate: function(v) {
    const hourly = v.salary / (v.hours * v.weeks);
    return {
      'Hourly Rate': core.formatCurrency(hourly),
      'Weekly Pay': core.formatCurrency(v.salary / v.weeks),
      'Bi-weekly Pay': core.formatCurrency(v.salary / 26),
      'Monthly Pay': core.formatCurrency(v.salary / 12),
    };
  }
});

R('tip-calculator', {
  title: 'Tip Calculator',
  description: 'Calculate tip amount and total bill.',
  tags: ['tip', 'gratuity', 'restaurant'],
  fields: [
    { id: 'bill', label: 'Bill Amount', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 85.50' },
    { id: 'tipPercent', label: 'Tip Percentage (%)', type: 'number', step: 0.5, min: 0, max: 100, placeholder: 'e.g. 18', half: true },
    { id: 'split', label: 'Split Between (people)', type: 'number', step: 1, min: 1, max: 50, placeholder: 'e.g. 1', half: true },
  ],
  calculate: function(v) {
    const tip = v.bill * (v.tipPercent || 0) / 100;
    const total = v.bill + tip;
    const perPerson = total / (v.split || 1);
    return {
      'Tip Amount': core.formatCurrency(tip),
      'Total Bill': core.formatCurrency(total),
      'Per Person': core.formatCurrency(perPerson),
    };
  }
});

R('time-card-calculator', {
  title: 'Time Card Calculator',
  description: 'Calculate total hours worked from time card entries.',
  tags: ['time card', 'hours', 'payroll'],
  fields: [
    { id: 'entries', label: 'Time Entries (start-end, one per line)', type: 'textarea', placeholder: 'e.g. 9:00-12:00\n1:00-5:30', hint: 'Enter each shift as start-end time, one per line' },
    { id: 'hourlyRate', label: 'Hourly Rate', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 25', half: true },
  ],
  calculate: function(v) {
    const lines = v.entries.split('\n').filter(l => l.trim());
    let totalHours = 0;
    let details = '';
    for (const line of lines) {
      const parts = line.trim().split(/[-–to]+/i);
      if (parts.length >= 2) {
        const parseTime = (t) => {
          const hms = t.trim().split(':');
          let h = parseInt(hms[0]), m = parseInt(hms[1] || 0);
          return h + m / 60;
        };
        const start = parseTime(parts[0]), end = parseTime(parts[1]);
        const hrs = end - start;
        totalHours += hrs;
        details += `<tr><td>${parts[0].trim()}</td><td>${parts[1].trim()}</td><td>${core.formatNumber(hrs, 2)}</td></tr>`;
      }
    }
    return {
      html: `<h3>Total Hours: ${core.formatNumber(totalHours, 2)}</h3>
        <table><tr><th>Start</th><th>End</th><th>Hours</th></tr>${details}</table>
        ${v.hourlyRate ? '<p>Earnings: ' + core.formatCurrency(totalHours * v.hourlyRate) + '</p>' : ''}`
    };
  }
});

// --- Tax ---

R('sales-tax-calculator', {
  title: 'Sales Tax Calculator',
  description: 'Calculate sales tax on a purchase.',
  tags: ['sales tax', 'tax'],
  fields: [
    { id: 'price', label: 'Purchase Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
    { id: 'taxRate', label: 'Tax Rate (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 8.5', half: true },
  ],
  calculate: function(v) {
    const tax = v.price * (v.taxRate || 0) / 100;
    return {
      'Tax Amount': core.formatCurrency(tax),
      'Total': core.formatCurrency(v.price + tax),
      'Pre-tax Price': core.formatCurrency(v.price),
    };
  }
});

R('sales-tax-calculator-reverse', {
  title: 'Sales Tax Calculator (Reverse)',
  description: 'Find the tax amount from a total price that includes tax.',
  tags: ['sales tax', 'reverse', 'tax'],
  fields: [
    { id: 'total', label: 'Total Price (including tax)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 108.50' },
    { id: 'taxRate', label: 'Tax Rate (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 8.5', half: true },
  ],
  calculate: function(v) {
    const preTax = v.total / (1 + (v.taxRate || 0) / 100);
    const tax = v.total - preTax;
    return {
      'Pre-tax Price': core.formatCurrency(preTax),
      'Tax Amount': core.formatCurrency(tax),
      'Total': core.formatCurrency(v.total),
    };
  }
});

R('sales-tax-calculator-state-local', {
  title: 'State and Local Sales Tax Calculator',
  description: 'Calculate combined state and local sales tax.',
  tags: ['sales tax', 'state', 'local'],
  fields: [
    { id: 'price', label: 'Purchase Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
    { id: 'stateTax', label: 'State Tax Rate (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 6', half: true },
    { id: 'localTax', label: 'Local Tax Rate (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 2.5', half: true },
  ],
  calculate: function(v) {
    const stateAmt = v.price * (v.stateTax || 0) / 100;
    const localAmt = v.price * (v.localTax || 0) / 100;
    const totalTax = stateAmt + localAmt;
    return {
      'State Tax': core.formatCurrency(stateAmt),
      'Local Tax': core.formatCurrency(localAmt),
      'Total Tax': core.formatCurrency(totalTax),
      'Total Price': core.formatCurrency(v.price + totalTax),
      'Combined Rate': core.formatPercent((v.stateTax || 0) + (v.localTax || 0)),
    };
  }
});

R('property-tax-calculator', {
  title: 'Property Tax Calculator',
  description: 'Estimate annual property tax based on assessed value and tax rate.',
  tags: ['property', 'tax', 'real estate'],
  fields: [
    { id: 'assessedValue', label: 'Assessed Property Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 250000' },
    { id: 'taxRate', label: 'Tax Rate (per $1000)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 15', half: true },
  ],
  calculate: function(v) {
    const annual = v.assessedValue * (v.taxRate || 0) / 1000;
    return {
      'Annual Property Tax': core.formatCurrency(annual),
      'Monthly': core.formatCurrency(annual / 12),
      'Effective Rate': core.formatPercent((v.taxRate || 0) / 10),
    };
  }
});

R('service-tax-calculator-india', {
  title: 'Service Tax Calculator (India)',
  description: 'Calculate Indian service tax on a service amount.',
  tags: ['service tax', 'India', 'GST'],
  fields: [
    { id: 'amount', label: 'Service Amount', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000' },
    { id: 'taxRate', label: 'Tax Rate (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 18', half: true },
  ],
  calculate: function(v) {
    const tax = v.amount * (v.taxRate || 0) / 100;
    return {
      'Tax Amount': core.formatCurrency(tax),
      'Total': core.formatCurrency(v.amount + tax),
      'Base Amount': core.formatCurrency(v.amount),
    };
  }
});

// --- Profit / Price ---

R('profit-calculator', {
  title: 'Profit Calculator',
  description: 'Calculate profit from revenue and cost.',
  tags: ['profit', 'revenue', 'cost'],
  fields: [
    { id: 'revenue', label: 'Revenue', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 1000' },
    { id: 'cost', label: 'Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 700', half: true },
  ],
  calculate: function(v) {
    const profit = v.revenue - v.cost;
    return {
      'Profit': core.formatCurrency(profit),
      'Profit Margin': v.revenue ? core.formatPercent((profit / v.revenue) * 100) : 'N/A',
      'Markup': v.cost ? core.formatPercent((profit / v.cost) * 100) : 'N/A',
    };
  }
});

R('profit-goal-calculator', {
  title: 'Profit Goal Calculator',
  description: 'Calculate how many units you need to sell to reach a profit goal.',
  tags: ['profit', 'goal', 'units'],
  fields: [
    { id: 'price', label: 'Selling Price per Unit', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50' },
    { id: 'cost', label: 'Cost per Unit', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 30', half: true },
    { id: 'fixedCost', label: 'Fixed Costs', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000', half: true },
    { id: 'profitGoal', label: 'Profit Goal', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10000', half: true },
  ],
  calculate: function(v) {
    const contribution = v.price - v.cost;
    const units = contribution > 0 ? Math.ceil((v.fixedCost + v.profitGoal) / contribution) : Infinity;
    return {
      'Units Needed': units === Infinity ? 'Impossible (price <= cost)' : units,
      'Revenue at Goal': core.formatCurrency(units * v.price),
      'Contribution per Unit': core.formatCurrency(contribution),
    };
  }
});

R('margin-calculator', {
  title: 'Margin Calculator',
  description: 'Calculate profit margin from cost and selling price.',
  tags: ['margin', 'profit'],
  fields: [
    { id: 'cost', label: 'Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 70' },
    { id: 'price', label: 'Selling Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100', half: true },
  ],
  calculate: function(v) {
    const profit = v.price - v.cost;
    const margin = v.price ? (profit / v.price) * 100 : 0;
    return {
      'Profit': core.formatCurrency(profit),
      'Margin': core.formatPercent(margin),
    };
  }
});

R('markup-calculator', {
  title: 'Markup Calculator',
  description: 'Calculate markup percentage and selling price.',
  tags: ['markup', 'price'],
  fields: [
    { id: 'cost', label: 'Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 70' },
    { id: 'markup', label: 'Markup (%)', type: 'number', step: 0.1, min: 0, max: 1000, placeholder: 'e.g. 40', half: true },
  ],
  calculate: function(v) {
    const sellingPrice = v.cost * (1 + (v.markup || 0) / 100);
    const profit = sellingPrice - v.cost;
    return {
      'Selling Price': core.formatCurrency(sellingPrice),
      'Profit': core.formatCurrency(profit),
      'Markup': core.formatPercent(v.markup || 0),
    };
  }
});

R('price-calculator', {
  title: 'Price Calculator',
  description: 'Calculate selling price from cost and desired margin.',
  tags: ['price', 'margin', 'cost'],
  fields: [
    { id: 'cost', label: 'Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 70' },
    { id: 'margin', label: 'Desired Margin (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 30', half: true },
  ],
  calculate: function(v) {
    const price = v.cost / (1 - (v.margin || 0) / 100);
    return {
      'Selling Price': core.formatCurrency(price),
      'Profit': core.formatCurrency(price - v.cost),
      'Margin': core.formatPercent(v.margin || 0),
    };
  }
});

R('selling-price-calculator', {
  title: 'Selling Price Calculator',
  description: 'Calculate selling price using target profit, margin, or markup.',
  tags: ['selling price', 'marketplace'],
  fields: [
    { id: 'cost', label: 'Cost', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 70' },
    { id: 'method', label: 'Method', type: 'select', options: [
      { value: 'margin', label: 'By Margin %', default: true },
      { value: 'markup', label: 'By Markup %' },
      { value: 'profit', label: 'By Target Profit $' }
    ]},
    { id: 'value', label: 'Value', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 30', half: true },
  ],
  calculate: function(v) {
    let price;
    if (v.method === 'margin') price = v.cost / (1 - v.value / 100);
    else if (v.method === 'markup') price = v.cost * (1 + v.value / 100);
    else price = v.cost + v.value;
    return {
      'Selling Price': core.formatCurrency(price),
      'Profit': core.formatCurrency(price - v.cost),
    };
  }
});

R('sale-price-calculator', {
  title: 'Sale Price Calculator',
  description: 'Calculate the sale price after a discount.',
  tags: ['sale', 'discount', 'price'],
  fields: [
    { id: 'originalPrice', label: 'Original Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
    { id: 'discountPct', label: 'Discount (%)', type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g. 25', half: true },
  ],
  calculate: function(v) {
    const saved = v.originalPrice * (v.discountPct || 0) / 100;
    return {
      'Sale Price': core.formatCurrency(v.originalPrice - saved),
      'You Save': core.formatCurrency(saved),
      'Original Price': core.formatCurrency(v.originalPrice),
    };
  }
});

R('list-price-markdown-calculator', {
  title: 'List Price Markdown Calculator',
  description: 'Calculate markdown from list price to sale price.',
  tags: ['markdown', 'list price', 'sale'],
  fields: [
    { id: 'listPrice', label: 'List Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
    { id: 'salePrice', label: 'Sale Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 75', half: true },
  ],
  calculate: function(v) {
    const markdown = v.listPrice - v.salePrice;
    const markdownPct = v.listPrice ? (markdown / v.listPrice) * 100 : 0;
    return {
      'Markdown Amount': core.formatCurrency(markdown),
      'Markdown %': core.formatPercent(markdownPct),
    };
  }
});

R('sales-calculator', {
  title: 'Sales Calculator',
  description: 'Calculate total sales from quantity and price.',
  tags: ['sales', 'revenue'],
  fields: [
    { id: 'quantity', label: 'Quantity Sold', type: 'number', step: 1, min: 0, placeholder: 'e.g. 150' },
    { id: 'price', label: 'Price per Unit', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 25', half: true },
    { id: 'cost', label: 'Cost per Unit', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 15', half: true },
  ],
  calculate: function(v) {
    const revenue = v.quantity * v.price;
    const totalCost = v.quantity * v.cost;
    return {
      'Total Revenue': core.formatCurrency(revenue),
      'Total Cost': core.formatCurrency(totalCost),
      'Profit': core.formatCurrency(revenue - totalCost),
    };
  }
});

// --- Ratios ---

R('liquidity-ratios-calculator', {
  title: 'Liquidity Ratios Calculator',
  description: 'Calculate current ratio and quick ratio.',
  tags: ['liquidity', 'ratios', 'current ratio', 'quick ratio'],
  fields: [
    { id: 'currentAssets', label: 'Current Assets', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500000' },
    { id: 'currentLiabilities', label: 'Current Liabilities', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 250000', half: true },
    { id: 'inventory', label: 'Inventory', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100000', half: true },
  ],
  calculate: function(v) {
    const currentRatio = v.currentAssets / v.currentLiabilities;
    const quickRatio = (v.currentAssets - (v.inventory || 0)) / v.currentLiabilities;
    return {
      'Current Ratio': core.formatNumber(currentRatio, 2),
      'Quick Ratio': core.formatNumber(quickRatio, 2),
      'Status': currentRatio >= 1.5 ? '✅ Healthy' : '⚠️ May need attention',
    };
  }
});

R('operations-ratios-calculator', {
  title: 'Operations Ratios Calculator',
  description: 'Calculate inventory turnover and other operational ratios.',
  tags: ['operations', 'ratios', 'turnover'],
  fields: [
    { id: 'costOfGoods', label: 'Cost of Goods Sold', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500000' },
    { id: 'inventory', label: 'Average Inventory', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 100000', half: true },
    { id: 'receivables', label: 'Average Receivables', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 80000', half: true },
    { id: 'revenue', label: 'Revenue', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 800000', half: true },
  ],
  calculate: function(v) {
    const invTurnover = v.costOfGoods / v.inventory;
    const daysInv = 365 / invTurnover;
    const revTurnover = v.receivables ? v.revenue / v.receivables : 0;
    const daysSales = revTurnover ? 365 / revTurnover : 0;
    return {
      'Inventory Turnover': core.formatNumber(invTurnover, 2),
      'Days Inventory': core.formatNumber(daysInv, 1) + ' days',
      'Receivables Turnover': core.formatNumber(revTurnover, 2),
      'Days Sales Outstanding': core.formatNumber(daysSales, 1) + ' days',
    };
  }
});

R('profitability-ratios-calculator', {
  title: 'Profitability Ratios Calculator',
  description: 'Calculate ROA, ROE, and other profitability ratios.',
  tags: ['profitability', 'ROA', 'ROE', 'ratios'],
  fields: [
    { id: 'netIncome', label: 'Net Income', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000' },
    { id: 'totalAssets', label: 'Total Assets', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 500000', half: true },
    { id: 'equity', label: 'Shareholders Equity', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 200000', half: true },
    { id: 'revenue', label: 'Revenue', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 300000', half: true },
  ],
  calculate: function(v) {
    const roa = (v.netIncome / v.totalAssets) * 100;
    const roe = (v.netIncome / v.equity) * 100;
    const profitMargin = v.revenue ? (v.netIncome / v.revenue) * 100 : 0;
    return {
      'Return on Assets (ROA)': core.formatPercent(roa),
      'Return on Equity (ROE)': core.formatPercent(roe),
      'Profit Margin': core.formatPercent(profitMargin),
    };
  }
});

R('stock-ratios-calculator', {
  title: 'Stock Ratios Calculator',
  description: 'Calculate P/E ratio, EPS, and other stock valuation ratios.',
  tags: ['stock', 'P/E', 'EPS', 'ratios'],
  fields: [
    { id: 'marketCap', label: 'Market Capitalization', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 1000000000' },
    { id: 'shares', label: 'Shares Outstanding', type: 'number', step: 1, min: 1, placeholder: 'e.g. 10000000', half: true },
    { id: 'netIncome', label: 'Net Income', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50000000', half: true },
    { id: 'dividends', label: 'Annual Dividends per Share', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 2', half: true },
  ],
  calculate: function(v) {
    const price = v.marketCap / v.shares;
    const eps = v.netIncome / v.shares;
    const pe = eps ? price / eps : 0;
    const divYield = price ? (v.dividends / price) * 100 : 0;
    return {
      'Price per Share': core.formatCurrency(price),
      'EPS': core.formatCurrency(eps),
      'P/E Ratio': core.formatNumber(pe, 2),
      'Dividend Yield': core.formatPercent(divYield),
    };
  }
});

// --- Other ---

R('money-calculator', {
  title: 'Money Calculator',
  description: 'Count bills and coins to find the total amount.',
  tags: ['money', 'cash', 'count'],
  fields: [
    { id: 'hundreds', label: '$100 bills', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'fifties', label: '$50 bills', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'twenties', label: '$20 bills', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'tens', label: '$10 bills', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'fives', label: '$5 bills', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'ones', label: '$1 bills', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'quarters', label: 'Quarters', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'dimes', label: 'Dimes', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'nickels', label: 'Nickels', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
    { id: 'pennies', label: 'Pennies', type: 'number', step: 1, min: 0, placeholder: '0', half: true },
  ],
  calculate: function(v) {
    const total = (v.hundreds||0)*100 + (v.fifties||0)*50 + (v.twenties||0)*20 + (v.tens||0)*10 + (v.fives||0)*5 + (v.ones||0)*1 + (v.quarters||0)*0.25 + (v.dimes||0)*0.10 + (v.nickels||0)*0.05 + (v.pennies||0)*0.01;
    return {
      'Total': core.formatCurrency(total),
    };
  }
});

R('money-change-calculator', {
  title: 'Money Change Calculator',
  description: 'Calculate the correct change using the fewest bills and coins.',
  tags: ['money', 'change', 'coins'],
  fields: [
    { id: 'amount', label: 'Change Amount', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 37.63' },
  ],
  calculate: function(v) {
    let cents = Math.round(v.amount * 100);
    const denom = [
      { name: '$100', value: 10000 }, { name: '$50', value: 5000 },
      { name: '$20', value: 2000 }, { name: '$10', value: 1000 },
      { name: '$5', value: 500 }, { name: '$1', value: 100 },
      { name: 'Quarter', value: 25 }, { name: 'Dime', value: 10 },
      { name: 'Nickel', value: 5 }, { name: 'Penny', value: 1 }
    ];
    let result = [], totalItems = 0;
    for (const d of denom) {
      const count = Math.floor(cents / d.value);
      if (count > 0) {
        result.push(count + 'x ' + d.name);
        totalItems += count;
        cents -= count * d.value;
      }
    }
    return {
      'Change Breakdown': result.join(', '),
      'Total Items': totalItems,
      'Remaining': cents > 0 ? cents + ' cents' : 'None',
    };
  }
});

R('layaway-plan-calculator', {
  title: 'Layaway Plan Calculator',
  description: 'Calculate layaway payments and fees.',
  tags: ['layaway', 'payment plan'],
  fields: [
    { id: 'itemPrice', label: 'Item Price', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 500' },
    { id: 'downPayment', label: 'Down Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50', half: true },
    { id: 'monthlyPayment', label: 'Monthly Payment', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50', half: true },
    { id: 'fee', label: 'Layaway Fee', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 25', half: true },
  ],
  calculate: function(v) {
    const remaining = v.itemPrice + (v.fee || 0) - (v.downPayment || 0);
    const months = v.monthlyPayment > 0 ? Math.ceil(remaining / v.monthlyPayment) : 0;
    const lastPayment = v.monthlyPayment > 0 ? remaining - (months - 1) * v.monthlyPayment : remaining;
    return {
      'Number of Payments': months,
      'Last Payment': core.formatCurrency(lastPayment),
      'Total Paid': core.formatCurrency(v.itemPrice + (v.fee || 0)),
      'Item Price': core.formatCurrency(v.itemPrice),
    };
  }
});

R('currency-converter', {
  title: 'Currency Converter',
  description: 'Convert between currencies using approximate fixed rates.',
  tags: ['currency', 'converter', 'exchange'],
  fields: [
    { id: 'amount', label: 'Amount', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
    { id: 'from', label: 'From Currency', type: 'select', options: [
      { value: 'USD', label: 'USD - US Dollar', default: true },
      { value: 'EUR', label: 'EUR - Euro' },
      { value: 'GBP', label: 'GBP - British Pound' },
      { value: 'JPY', label: 'JPY - Japanese Yen' },
      { value: 'INR', label: 'INR - Indian Rupee' },
      { value: 'CAD', label: 'CAD - Canadian Dollar' },
      { value: 'AUD', label: 'AUD - Australian Dollar' },
      { value: 'CHF', label: 'CHF - Swiss Franc' },
      { value: 'CNY', label: 'CNY - Chinese Yuan' },
    ]},
    { id: 'to', label: 'To Currency', type: 'select', options: [
      { value: 'EUR', label: 'EUR - Euro', default: true },
      { value: 'USD', label: 'USD - US Dollar' },
      { value: 'GBP', label: 'GBP - British Pound' },
      { value: 'JPY', label: 'JPY - Japanese Yen' },
      { value: 'INR', label: 'INR - Indian Rupee' },
      { value: 'CAD', label: 'CAD - Canadian Dollar' },
      { value: 'AUD', label: 'AUD - Australian Dollar' },
      { value: 'CHF', label: 'CHF - Swiss Franc' },
      { value: 'CNY', label: 'CNY - Chinese Yuan' },
    ]},
  ],
  calculate: function(v) {
    // Approximate rates to USD
    const rates = { USD: 1, EUR: 1.08, GBP: 1.27, JPY: 0.0067, INR: 0.012, CAD: 0.74, AUD: 0.65, CHF: 1.13, CNY: 0.14 };
    const usdAmount = v.amount / (rates[v.from] || 1);
    const result = usdAmount * (rates[v.to] || 1);
    return {
      'Converted Amount': core.formatCurrency(result, 4),
      'Rate Used': (rates[v.to] || 1) / (rates[v.from] || 1),
      'Note': 'Approximate rates; actual rates may vary.',
    };
  }
});

R('future-value-table-1', {
  title: 'Future Value of a Dollar Table',
  description: 'Generate a table of future value factors.',
  tags: ['FV', 'table', 'factor'],
  fields: [
    { id: 'startRate', label: 'Starting Rate (%)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 3', half: true },
    { id: 'endRate', label: 'Ending Rate (%)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 10', half: true },
    { id: 'startPeriod', label: 'Starting Periods', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 1', half: true },
    { id: 'endPeriod', label: 'Ending Periods', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 20', half: true },
  ],
  calculate: function(v) {
    let html = '<table><tr><th>Periods \\ Rate</th>';
    const rates = [];
    for (let r = v.startRate; r <= v.endRate; r += 0.5) rates.push(r);
    rates.forEach(r => { html += `<th>${r}%</th>`; });
    html += '</tr>';
    for (let p = v.startPeriod; p <= v.endPeriod; p++) {
      html += `<tr><td>${p}</td>`;
      rates.forEach(r => {
        const factor = Math.pow(1 + r / 100, p);
        html += `<td>${core.formatNumber(factor, 4)}</td>`;
      });
      html += '</tr>';
    }
    html += '</table>';
    return { html };
  }
});

R('future-value-table-annuity', {
  title: 'Future Value of a Dollar Annuity Table',
  description: 'Generate a table of future value annuity factors.',
  tags: ['FV', 'annuity', 'table'],
  fields: [
    { id: 'startRate', label: 'Starting Rate (%)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 3', half: true },
    { id: 'endRate', label: 'Ending Rate (%)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 10', half: true },
    { id: 'startPeriod', label: 'Starting Periods', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 1', half: true },
    { id: 'endPeriod', label: 'Ending Periods', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 20', half: true },
  ],
  calculate: function(v) {
    let html = '<table><tr><th>Periods \\ Rate</th>';
    const rates = [];
    for (let r = v.startRate; r <= v.endRate; r += 0.5) rates.push(r);
    rates.forEach(r => { html += `<th>${r}%</th>`; });
    html += '</tr>';
    for (let p = v.startPeriod; p <= v.endPeriod; p++) {
      html += `<tr><td>${p}</td>`;
      rates.forEach(r => {
        const i = r / 100;
        const factor = i === 0 ? p : (Math.pow(1 + i, p) - 1) / i;
        html += `<td>${core.formatNumber(factor, 4)}</td>`;
      });
      html += '</tr>';
    }
    html += '</table>';
    return { html };
  }
});

R('present-value-table-1', {
  title: 'Present Value of a Dollar Table',
  description: 'Generate a table of present value factors.',
  tags: ['PV', 'table', 'factor'],
  fields: [
    { id: 'startRate', label: 'Starting Rate (%)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 3', half: true },
    { id: 'endRate', label: 'Ending Rate (%)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 10', half: true },
    { id: 'startPeriod', label: 'Starting Periods', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 1', half: true },
    { id: 'endPeriod', label: 'Ending Periods', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 20', half: true },
  ],
  calculate: function(v) {
    let html = '<table><tr><th>Periods \\ Rate</th>';
    const rates = [];
    for (let r = v.startRate; r <= v.endRate; r += 0.5) rates.push(r);
    rates.forEach(r => { html += `<th>${r}%</th>`; });
    html += '</tr>';
    for (let p = v.startPeriod; p <= v.endPeriod; p++) {
      html += `<tr><td>${p}</td>`;
      rates.forEach(r => {
        const factor = 1 / Math.pow(1 + r / 100, p);
        html += `<td>${core.formatNumber(factor, 4)}</td>`;
      });
      html += '</tr>';
    }
    html += '</table>';
    return { html };
  }
});

R('present-value-table-annuity', {
  title: 'Present Value of a Dollar Annuity Table',
  description: 'Generate a table of present value annuity factors.',
  tags: ['PV', 'annuity', 'table'],
  fields: [
    { id: 'startRate', label: 'Starting Rate (%)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 3', half: true },
    { id: 'endRate', label: 'Ending Rate (%)', type: 'number', step: 0.5, min: 0.5, max: 50, placeholder: 'e.g. 10', half: true },
    { id: 'startPeriod', label: 'Starting Periods', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 1', half: true },
    { id: 'endPeriod', label: 'Ending Periods', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 20', half: true },
  ],
  calculate: function(v) {
    let html = '<table><tr><th>Periods \\ Rate</th>';
    const rates = [];
    for (let r = v.startRate; r <= v.endRate; r += 0.5) rates.push(r);
    rates.forEach(r => { html += `<th>${r}%</th>`; });
    html += '</tr>';
    for (let p = v.startPeriod; p <= v.endPeriod; p++) {
      html += `<tr><td>${p}</td>`;
      rates.forEach(r => {
        const i = r / 100;
        const factor = i === 0 ? p : (1 - Math.pow(1 + i, -p)) / i;
        html += `<td>${core.formatNumber(factor, 4)}</td>`;
      });
      html += '</tr>';
    }
    html += '</table>';
    return { html };
  }
});

// --- Federal Tax Estimate ---

R('tax-federal-est', {
  title: 'Federal Tax Estimate Calculator',
  description: 'Estimate your federal income tax using simplified 2024 tax brackets.',
  tags: ['federal', 'tax', 'income tax', 'brackets'],
  fields: [
    { id: 'income', label: 'Taxable Income', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 85000' },
    { id: 'filing', label: 'Filing Status', type: 'select', options: [
      { value: 'single', label: 'Single', default: true },
      { value: 'married', label: 'Married Filing Jointly' },
      { value: 'hoh', label: 'Head of Household' }
    ]},
  ],
  formula: '<p>Uses simplified 2024 federal tax brackets. Does not account for deductions, credits, or other adjustments.</p>',
  calculate: function(v) {
    const income = v.income;
    const status = v.filing || 'single';
    // 2024 simplified brackets
    const brackets = {
      single: [
        { limit: 11600, rate: 0.10 },
        { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
        { limit: 243725, rate: 0.32 },
        { limit: 609350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ],
      married: [
        { limit: 23200, rate: 0.10 },
        { limit: 94300, rate: 0.12 },
        { limit: 201050, rate: 0.22 },
        { limit: 383900, rate: 0.24 },
        { limit: 487450, rate: 0.32 },
        { limit: 731200, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ],
      hoh: [
        { limit: 16550, rate: 0.10 },
        { limit: 63100, rate: 0.12 },
        { limit: 100500, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
        { limit: 243700, rate: 0.32 },
        { limit: 609350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ]
    };
    const br = brackets[status] || brackets.single;
    let tax = 0, prev = 0, marginalRate = 0;
    for (const b of br) {
      if (income > prev) {
        const taxable = Math.min(income, b.limit) - prev;
        tax += taxable * b.rate;
        if (income > prev) marginalRate = b.rate * 100;
      }
      prev = b.limit;
      if (income <= prev) break;
    }
    const effectiveRate = income > 0 ? (tax / income) * 100 : 0;
    return {
      'Estimated Federal Tax': core.formatCurrency(tax),
      'Effective Tax Rate': core.formatPercent(effectiveRate),
      'Marginal Tax Rate': core.formatPercent(marginalRate),
      'After-Tax Income': core.formatCurrency(income - tax),
    };
  }
});

// Every calculator in this file is registered — now wire up the catalog aliases.
applyCatalogAliases();

})(calculatorRegistry);
