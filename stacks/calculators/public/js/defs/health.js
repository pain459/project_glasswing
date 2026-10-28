// Health calculators
(function(reg) {
const R = reg.register.bind(reg, 'health');

// === BMI ===

R('bmi-calculator', {
  title: 'Body Mass Index Calculator',
  description: 'Calculate your BMI from weight and height.',
  tags: ['BMI', 'body mass index', 'weight', 'health'],
  fields: [
    { id: 'weight', label: 'Weight (kg)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 70', half: true },
    { id: 'height', label: 'Height (cm)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 175', half: true },
  ],
  formula: '<p><code>BMI = weight (kg) / height (m)²</code></p>',
  calculate: function(v) {
    const h = v.height / 100;
    const bmi = v.weight / (h * h);
    let cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    return {
      'BMI': core.formatNumber(bmi, 1),
      'Category': cat,
      'Healthy Weight Range': core.formatNumber(18.5 * h * h, 1) + ' – ' + core.formatNumber(24.9 * h * h, 1) + ' kg',
    };
  }
});

// === CONCEPTION ===

R('conception-calculator', {
  title: 'Conception Date Calculator',
  description: 'Estimate your conception date from your due date.',
  tags: ['conception', 'pregnancy', 'due date', 'fertility'],
  fields: [
    { id: 'dueDate', label: 'Estimated Due Date', type: 'date', placeholder: 'e.g. 2025-06-15' },
  ],
  formula: '<p>Conception typically occurs about 266 days (38 weeks) before the due date.</p>',
  calculate: function(v) {
    const due = new Date(v.dueDate);
    if (isNaN(due.getTime())) return { error: 'Enter a valid due date.' };
    const conception = new Date(due);
    conception.setDate(conception.getDate() - 266);
    const lmp = new Date(conception);
    lmp.setDate(lmp.getDate() - 14);
    return {
      'Estimated Conception Date': conception.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      'Estimated LMP Date': lmp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      'Gestational Age': '38 weeks from conception',
    };
  }
});

// === PREGNANCY ===

R('pregnancy-calculator', {
  title: 'Pregnancy Due Date Calculator',
  description: 'Calculate your estimated due date from your last menstrual period.',
  tags: ['pregnancy', 'due date', 'EDD', 'Naegele'],
  fields: [
    { id: 'lmp', label: 'Last Menstrual Period Date', type: 'date', placeholder: 'e.g. 2024-12-01' },
    { id: 'cycle', label: 'Average Cycle Length (days)', type: 'number', step: 1, min: 20, max: 45, placeholder: 'e.g. 28', half: true },
  ],
  formula: '<p><code>EDD = LMP + 280 days</code> (Naegele\'s rule, adjusted for cycle length).</p>',
  calculate: function(v) {
    const lmp = new Date(v.lmp);
    if (isNaN(lmp.getTime())) return { error: 'Enter a valid date.' };
    const cycle = v.cycle || 28;
    const adjust = cycle - 28;
    const due = new Date(lmp);
    due.setDate(due.getDate() + 280 + adjust);
    const conception = new Date(lmp);
    conception.setDate(conception.getDate() + cycle - 14);
    const now = new Date();
    const daysPreg = Math.floor((now - lmp) / 86400000);
    const weeks = Math.floor(daysPreg / 7);
    const days = daysPreg % 7;
    const remaining = Math.max(0, Math.floor((due - now) / 86400000));
    return {
      'Estimated Due Date': due.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      'Current Gestational Age': weeks + ' weeks, ' + days + ' days',
      'Estimated Conception': conception.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      'Days Remaining': remaining + ' days',
      'Trimester': daysPreg < 13*7 ? 'First' : daysPreg < 27*7 ? 'Second' : 'Third',
    };
  }
});

// === BODY FAT ===

R('body-fat', {
  title: 'Body Fat Percentage Calculator',
  description: 'Estimate body fat percentage using the U.S. Navy method.',
  tags: ['body fat', 'body fat percentage', 'navy method', 'fitness'],
  fields: [
    { id: 'gender', label: 'Gender', type: 'select', options: [
      { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }
    ]},
    { id: 'waist', label: 'Waist (cm)', type: 'number', step: 0.1, min: 40, placeholder: 'e.g. 85', half: true },
    { id: 'neck', label: 'Neck (cm)', type: 'number', step: 0.1, min: 20, placeholder: 'e.g. 38', half: true },
    { id: 'height', label: 'Height (cm)', type: 'number', step: 0.1, min: 100, placeholder: 'e.g. 175' },
    { id: 'hip', label: 'Hip (cm) — females only', type: 'number', step: 0.1, min: 40, placeholder: 'e.g. 95', half: true },
  ],
  formula: '<p>U.S. Navy method using waist, neck, height (and hip for females).</p>',
  calculate: function(v) {
    const waist = v.waist, neck = v.neck, height = v.height;
    if (!waist || !neck || !height) return { error: 'Enter all required measurements.' };
    let bf;
    if (v.gender === 'female') {
      const hip = v.hip || 0;
      if (!hip) return { error: 'Hip measurement required for females.' };
      bf = 100 * (0.495 / (1.20 * Math.log10(waist + (hip || 0) - neck) - 0.70 * Math.log10(height) - 0.567) - 0.45);
    } else {
      bf = 100 * (0.495 / (1.20 * Math.log10(waist - neck) - 0.70 * Math.log10(height)) - 0.45);
    }
    if (isNaN(bf) || bf < 0) return { error: 'Check your measurements.' };
    let cat = bf < 6 ? 'Essential Fat' : bf < 14 ? 'Athletic' : bf < 18 ? 'Fitness' : bf < 25 ? 'Average' : 'Obese';
    if (v.gender === 'female') {
      cat = bf < 14 ? 'Essential Fat' : bf < 21 ? 'Athletic' : bf < 25 ? 'Fitness' : bf < 32 ? 'Average' : 'Obese';
    }
    return {
      'Body Fat %': core.formatNumber(bf, 1) + '%',
      'Category': cat,
    };
  }
});

// === BMR ===

R('bmr', {
  title: 'Basal Metabolic Rate Calculator',
  description: 'Calculate your BMR using the Mifflin-St Jeor equation.',
  tags: ['BMR', 'basal metabolic rate', 'calories', 'metabolism'],
  fields: [
    { id: 'gender', label: 'Gender', type: 'select', options: [
      { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }
    ]},
    { id: 'weight', label: 'Weight (kg)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 70', half: true },
    { id: 'height', label: 'Height (cm)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 175', half: true },
    { id: 'age', label: 'Age (years)', type: 'number', step: 1, min: 1, max: 120, placeholder: 'e.g. 30', half: true },
  ],
  formula: '<p><code>BMR = 10W + 6.25H − 5A ± s</code> where W=weight(kg), H=height(cm), A=age, s=+5 for men, −161 for women.</p>',
  calculate: function(v) {
    const s = v.gender === 'male' ? 5 : -161;
    const bmr = 10 * v.weight + 6.25 * v.height - 5 * v.age + s;
    return {
      'BMR': core.formatNumber(bmr, 0) + ' kcal/day',
      'Description': 'Calories your body burns at complete rest',
    };
  }
});

// === TDEE ===

R('tdee', {
  title: 'Total Daily Energy Expenditure Calculator',
  description: 'Calculate your total daily calorie needs based on activity level.',
  tags: ['TDEE', 'calories', 'activity', 'maintenance'],
  fields: [
    { id: 'gender', label: 'Gender', type: 'select', options: [
      { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }
    ]},
    { id: 'weight', label: 'Weight (kg)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 70', half: true },
    { id: 'height', label: 'Height (cm)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 175', half: true },
    { id: 'age', label: 'Age (years)', type: 'number', step: 1, min: 1, max: 120, placeholder: 'e.g. 30', half: true },
    { id: 'activity', label: 'Activity Level', type: 'select', options: [
      { value: '1.2', label: 'Sedentary (little or no exercise)' },
      { value: '1.375', label: 'Lightly active (1-3 days/week)' },
      { value: '1.55', label: 'Moderately active (3-5 days/week)' },
      { value: '1.725', label: 'Very active (6-7 days/week)' },
      { value: '1.9', label: 'Extra active (very hard exercise)' },
    ]},
  ],
  formula: '<p><code>TDEE = BMR × Activity Factor</code> where BMR uses the Mifflin-St Jeor equation.</p>',
  calculate: function(v) {
    const s = v.gender === 'male' ? 5 : -161;
    const bmr = 10 * v.weight + 6.25 * v.height - 5 * v.age + s;
    const tdee = bmr * parseFloat(v.activity);
    return {
      'BMR': core.formatNumber(bmr, 0) + ' kcal/day',
      'TDEE': core.formatNumber(tdee, 0) + ' kcal/day',
      'To Lose Weight': core.formatNumber(tdee - 500, 0) + ' kcal/day',
      'To Gain Weight': core.formatNumber(tdee + 500, 0) + ' kcal/day',
    };
  }
});

// === IDEAL WEIGHT ===

R('ideal-weight', {
  title: 'Ideal Body Weight Calculator',
  description: 'Calculate your ideal body weight using multiple formulas.',
  tags: ['ideal weight', 'IBW', 'Devine', 'Robinson', 'Miller'],
  fields: [
    { id: 'gender', label: 'Gender', type: 'select', options: [
      { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }
    ]},
    { id: 'heightFt', label: 'Height (feet)', type: 'number', step: 1, min: 3, max: 9, placeholder: 'e.g. 5', half: true },
    { id: 'heightIn', label: 'Height (inches)', type: 'number', step: 1, min: 0, max: 11, placeholder: 'e.g. 9', half: true },
  ],
  formula: '<p>Devine: Men 50+2.3(in>60), Women 45.5+2.3(in>60). Robinson and Miller use similar adjustments.</p>',
  calculate: function(v) {
    const totalIn = v.heightFt * 12 + v.heightIn;
    const over60 = Math.max(0, totalIn - 60);
    let devine, robinson, miller;
    if (v.gender === 'male') {
      devine = 50 + 2.3 * over60;
      robinson = 52 + 1.9 * over60;
      miller = 56.2 + 1.41 * over60;
    } else {
      devine = 45.5 + 2.3 * over60;
      robinson = 49 + 1.7 * over60;
      miller = 53.1 + 1.36 * over60;
    }
    return {
      'Devine Formula': core.formatNumber(devine, 1) + ' kg (' + core.formatNumber(devine * 2.205, 1) + ' lb)',
      'Robinson Formula': core.formatNumber(robinson, 1) + ' kg (' + core.formatNumber(robinson * 2.205, 1) + ' lb)',
      'Miller Formula': core.formatNumber(miller, 1) + ' kg (' + core.formatNumber(miller * 2.205, 1) + ' lb)',
      'Average': core.formatNumber((devine + robinson + miller) / 3, 1) + ' kg',
    };
  }
});

// === ONE REP MAX ===

R('one-rep-max', {
  title: 'One Rep Max Calculator',
  description: 'Estimate your one-rep max from a weight lifted for multiple reps.',
  tags: ['1RM', 'one rep max', 'strength', 'weightlifting'],
  fields: [
    { id: 'weight', label: 'Weight Lifted (kg)', type: 'number', step: 0.5, min: 0.5, placeholder: 'e.g. 100' },
    { id: 'reps', label: 'Number of Reps', type: 'number', step: 1, min: 1, max: 30, placeholder: 'e.g. 8' },
  ],
  formula: '<p><code>1RM = Weight × (1 + Reps / 30)</code> (Epley formula).</p>',
  calculate: function(v) {
    const o = v.weight * (1 + v.reps / 30);
    const pcts = [100, 95, 90, 85, 80, 75, 70, 65, 60];
    let rows = '';
    pcts.forEach(p => {
      rows += `<tr><td>${p}%</td><td>${core.formatNumber(o * p / 100, 1)} kg</td></tr>`;
    });
    return {
      html: `<h3>Estimated 1RM: ${core.formatNumber(o, 1)} kg</h3>
        <table><tr><th>% of 1RM</th><th>Weight</th></tr>${rows}</table>`
    };
  }
});

// === TARGET HEART RATE ===

R('target-heart-rate', {
  title: 'Target Heart Rate Zone Calculator',
  description: 'Calculate your target heart rate zones for exercise.',
  tags: ['heart rate', 'target', 'exercise', 'fitness', 'zones'],
  fields: [
    { id: 'age', label: 'Age (years)', type: 'number', step: 1, min: 10, max: 100, placeholder: 'e.g. 30' },
    { id: 'restingHR', label: 'Resting Heart Rate (bpm)', type: 'number', step: 1, min: 30, max: 120, placeholder: 'e.g. 60', half: true },
  ],
  formula: '<p><code>Max HR = 220 − Age</code>. Zones use the Karvonen formula: <code>Target = (Max − Resting) × % + Resting</code>.</p>',
  calculate: function(v) {
    const maxHR = 220 - v.age;
    const rhr = v.restingHR || 60;
    const hrr = maxHR - rhr;
    const zones = [
      { name: 'Very Light (50-60%)', lo: 0.50, hi: 0.60 },
      { name: 'Light / Warm-up (60-70%)', lo: 0.60, hi: 0.70 },
      { name: 'Moderate / Fat Burn (70-80%)', lo: 0.70, hi: 0.80 },
      { name: 'Hard / Cardio (80-90%)', lo: 0.80, hi: 0.90 },
      { name: 'Maximum (90-100%)', lo: 0.90, hi: 1.00 },
    ];
    let rows = '';
    zones.forEach(z => {
      const lo = core.formatNumber(hrr * z.lo + rhr, 0);
      const hi = core.formatNumber(hrr * z.hi + rhr, 0);
      rows += `<tr><td>${z.name}</td><td>${lo} – ${hi} bpm</td></tr>`;
    });
    return {
      html: `<h3>Max Heart Rate: ${maxHR} bpm</h3>
        <table><tr><th>Zone</th><th>Target (bpm)</th></tr>${rows}</table>`
    };
  }
});

// === BMI CALCULATOR FOR WOMEN ===

R('bmi-calculator-women', {
  title: 'BMI Calculator for Female Adults',
  description: 'Calculate BMI specifically for women with female-specific health categories.',
  tags: ['BMI', 'body mass index', 'women', 'female', 'health'],
  fields: [
    { id: 'weight', label: 'Weight (kg)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 65', half: true },
    { id: 'height', label: 'Height (cm)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 165', half: true },
  ],
  formula: '<p><code>BMI = weight (kg) / height (m)²</code></p>',
  calculate: function(v) {
    const h = v.height / 100;
    const bmi = v.weight / (h * h);
    let cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    return {
      'BMI': core.formatNumber(bmi, 1),
      'Category': cat,
      'Healthy Weight Range': core.formatNumber(18.5 * h * h, 1) + ' – ' + core.formatNumber(24.9 * h * h, 1) + ' kg',
    };
  }
});

// === GESTATION CALCULATOR ===

R('gestation-calculator', {
  title: 'Gestation Period Calculator',
  description: 'Estimate due date for pregnant animals based on species.',
  tags: ['gestation', 'pregnancy', 'animals', 'due date'],
  fields: [
    { id: 'species', label: 'Species', type: 'select', options: [
      { value: 'dog', label: 'Dog (63 days)' },
      { value: 'cat', label: 'Cat (65 days)' },
      { value: 'horse', label: 'Horse (335 days)' },
      { value: 'cow', label: 'Cow (283 days)' },
      { value: 'pig', label: 'Pig (114 days)' },
      { value: 'rabbit', label: 'Rabbit (31 days)' },
      { value: 'sheep', label: 'Sheep (150 days)' },
    ]},
    { id: 'breedingDate', label: 'Breeding Date', type: 'date', placeholder: 'e.g. 2025-03-01' },
  ],
  formula: '<p>Due date = Breeding date + gestation period for the species.</p>',
  calculate: function(v) {
    const days = { dog: 63, cat: 65, horse: 335, cow: 283, pig: 114, rabbit: 31, sheep: 150 };
    const breed = new Date(v.breedingDate);
    if (isNaN(breed.getTime())) return { error: 'Enter a valid breeding date.' };
    const due = new Date(breed);
    due.setDate(due.getDate() + (days[v.species] || 63));
    const now = new Date();
    const elapsed = Math.floor((now - breed) / 86400000);
    const remaining = Math.max(0, Math.floor((due - now) / 86400000));
    return {
      'Species': v.species,
      'Gestation Period': (days[v.species] || 63) + ' days',
      'Estimated Due Date': due.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      'Days Elapsed': elapsed,
      'Days Remaining': remaining,
    };
  }
});

// === PACE CALCULATOR ===

R('pace-calculator', {
  title: 'Pace Calculator',
  description: 'Calculate running or walking pace from distance and time.',
  tags: ['pace', 'running', 'walking', 'speed', 'fitness'],
  fields: [
    { id: 'distance', label: 'Distance (km)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'hours', label: 'Hours', type: 'number', step: 1, min: 0, max: 24, placeholder: 'e.g. 0', half: true },
    { id: 'minutes', label: 'Minutes', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 30', half: true },
    { id: 'seconds', label: 'Seconds', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p><code>Pace = Time / Distance</code> expressed as min/km.</p>',
  calculate: function(v) {
    const totalSec = (v.hours || 0) * 3600 + (v.minutes || 0) * 60 + (v.seconds || 0);
    if (totalSec <= 0) return { error: 'Enter a time greater than zero.' };
    const paceSecPerKm = totalSec / v.distance;
    const paceMin = Math.floor(paceSecPerKm / 60);
    const paceSec = Math.round(paceSecPerKm % 60);
    const speedKmh = (v.distance / (totalSec / 3600));
    return {
      'Pace': paceMin + ':' + String(paceSec).padStart(2, '0') + ' min/km',
      'Speed': core.formatNumber(speedKmh, 2) + ' km/h',
      'Total Time': v.hours + 'h ' + v.minutes + 'm ' + v.seconds + 's',
    };
  }
});

// === PERIOD CALCULATOR ===

R('period-calculator', {
  title: 'Period Calculator',
  description: 'Predict your next menstrual period based on cycle information.',
  tags: ['period', 'menstrual', 'cycle', 'prediction'],
  fields: [
    { id: 'lastPeriod', label: 'First Day of Last Period', type: 'date', placeholder: 'e.g. 2025-09-01' },
    { id: 'cycleLength', label: 'Average Cycle Length (days)', type: 'number', step: 1, min: 20, max: 45, placeholder: 'e.g. 28', half: true },
    { id: 'periodLength', label: 'Period Duration (days)', type: 'number', step: 1, min: 1, max: 10, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p>Next period = Last period start + cycle length. Ovulation ≈ cycle day 14.</p>',
  calculate: function(v) {
    const last = new Date(v.lastPeriod);
    if (isNaN(last.getTime())) return { error: 'Enter a valid date.' };
    const cycleLen = v.cycleLength || 28;
    const periodLen = v.periodLength || 5;
    const nextPeriod = new Date(last);
    nextPeriod.setDate(nextPeriod.getDate() + cycleLen);
    const ovulation = new Date(last);
    ovulation.setDate(ovulation.getDate() + cycleLen - 14);
    const fertileStart = new Date(ovulation);
    fertileStart.setDate(fertileStart.getDate() - 5);
    const fertileEnd = new Date(ovulation);
    fertileEnd.setDate(fertileEnd.getDate() + 1);
    const fmt = function(d) { return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); };
    return {
      'Next Period Start': fmt(nextPeriod),
      'Next Period End': (function() { var e = new Date(nextPeriod); e.setDate(e.getDate() + periodLen - 1); return fmt(e); })(),
      'Estimated Ovulation': fmt(ovulation),
      'Fertile Window': fmt(fertileStart) + ' – ' + fmt(fertileEnd),
    };
  }
});

// === PREGNANCY WEIGHT GAIN CALCULATOR ===

R('pregnancy-weight-gain-calculator', {
  title: 'Pregnancy Weight Gain Calculator',
  description: 'Track healthy weight gain during pregnancy based on pre-pregnancy BMI.',
  tags: ['pregnancy', 'weight gain', 'BMI', 'health'],
  fields: [
    { id: 'preWeight', label: 'Pre-pregnancy Weight (kg)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 65', half: true },
    { id: 'height', label: 'Height (cm)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 165', half: true },
    { id: 'currentWeight', label: 'Current Weight (kg)', type: 'number', step: 0.1, min: 1, placeholder: 'e.g. 72', half: true },
    { id: 'weeks', label: 'Weeks Pregnant', type: 'number', step: 1, min: 1, max: 42, placeholder: 'e.g. 20', half: true },
  ],
  formula: '<p>IOM guidelines: Underweight 12.5-18 kg, Normal 11.5-16 kg, Overweight 7-11.5 kg, Obese 5-9 kg total gain.</p>',
  calculate: function(v) {
    const h = v.height / 100;
    const bmi = v.preWeight / (h * h);
    let lo, hi, cat;
    if (bmi < 18.5) { lo = 12.5; hi = 18; cat = 'Underweight'; }
    else if (bmi < 25) { lo = 11.5; hi = 16; cat = 'Normal weight'; }
    else if (bmi < 30) { lo = 7; hi = 11.5; cat = 'Overweight'; }
    else { lo = 5; hi = 9; cat = 'Obese'; }
    const gained = v.currentWeight - v.preWeight;
    const mid = (lo + hi) / 2;
    const expectedRate = mid / 40;
    const expectedGain = expectedRate * v.weeks;
    return {
      'Pre-pregnancy BMI': core.formatNumber(bmi, 1) + ' (' + cat + ')',
      'Recommended Total Gain': lo + ' – ' + hi + ' kg',
      'Weight Gained So Far': core.formatNumber(gained, 1) + ' kg',
      ['Expected Gain by Week ' + v.weeks]: core.formatNumber(expectedGain, 1) + ' kg',
      'Status': gained > expectedGain * 1.1 ? 'Above expected' : gained < expectedGain * 0.9 ? 'Below expected' : 'On track',
    };
  }
});

// === TARGET HEART RATE ZONE CALCULATOR (alias) ===

R('target-heart-rate-zone-calculator', {
  title: 'Target Heart Rate Zone Calculator',
  description: 'Calculate your target heart rate zones for exercise.',
  tags: ['heart rate', 'target', 'exercise', 'fitness', 'zones'],
  fields: [
    { id: 'age', label: 'Age (years)', type: 'number', step: 1, min: 10, max: 100, placeholder: 'e.g. 30' },
    { id: 'restingHR', label: 'Resting Heart Rate (bpm)', type: 'number', step: 1, min: 30, max: 120, placeholder: 'e.g. 60', half: true },
  ],
  formula: '<p><code>Max HR = 220 − Age</code>. Zones use the Karvonen formula: <code>Target = (Max − Resting) × % + Resting</code>.</p>',
  calculate: function(v) {
    const maxHR = 220 - v.age;
    const rhr = v.restingHR || 60;
    const hrr = maxHR - rhr;
    const zones = [
      { name: 'Very Light (50-60%)', lo: 0.50, hi: 0.60 },
      { name: 'Light / Warm-up (60-70%)', lo: 0.60, hi: 0.70 },
      { name: 'Moderate / Fat Burn (70-80%)', lo: 0.70, hi: 0.80 },
      { name: 'Hard / Cardio (80-90%)', lo: 0.80, hi: 0.90 },
      { name: 'Maximum (90-100%)', lo: 0.90, hi: 1.00 },
    ];
    let rows = '';
    zones.forEach(z => {
      const lo = core.formatNumber(hrr * z.lo + rhr, 0);
      const hi = core.formatNumber(hrr * z.hi + rhr, 0);
      rows += `<tr><td>${z.name}</td><td>${lo} – ${hi} bpm</td></tr>`;
    });
    return {
      html: `<h3>Max Heart Rate: ${maxHR} bpm</h3>
        <table><tr><th>Zone</th><th>Target (bpm)</th></tr>${rows}</table>`
    };
  }
});

})(calculatorRegistry);
