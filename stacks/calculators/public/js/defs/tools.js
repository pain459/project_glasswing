// Tools calculators
(function(reg) {
const R = reg.register.bind(reg, 'tools');

// === CHARACTER COUNTER ===

R('character-counter', {
  title: 'Character / Word Counter',
  description: 'Count characters, words, sentences, and paragraphs in text.',
  tags: ['character', 'word', 'count', 'text', 'counter'],
  fields: [
    { id: 'text', label: 'Enter or paste your text', type: 'textarea', placeholder: 'Type or paste text here...', hint: 'Text to analyze' },
  ],
  calculate: function(v) {
    const text = v.text || '';
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentences = text.trim() ? (text.match(/[.!?]+/g) || []).length || (words > 0 ? 1 : 0) : 0;
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length || (text.trim() ? 1 : 0) : 0;
    const lines = text.trim() ? text.split(/\n/).filter(l => l.trim()).length : 0;
    const avgWordLen = words > 0 ? core.formatNumber(charsNoSpace / words, 1) : 0;
    const readTime = Math.ceil(words / 200);
    const speakTime = Math.ceil(words / 130);
    return {
      'Characters': chars,
      'Characters (no spaces)': charsNoSpace,
      'Words': words,
      'Sentences': sentences,
      'Paragraphs': paragraphs,
      'Lines': lines,
      'Avg Word Length': avgWordLen,
      'Reading Time': readTime + ' min',
      'Speaking Time': speakTime + ' min',
    };
  }
});

// === RANDOM NUMBER GENERATOR ===

R('random-number-generator', {
  title: 'Random Number Generator',
  description: 'Generate random numbers within a range.',
  tags: ['random', 'number', 'generator', 'RNG', 'dice'],
  fields: [
    { id: 'min', label: 'Minimum', type: 'number', step: 1, placeholder: 'e.g. 1', half: true },
    { id: 'max', label: 'Maximum', type: 'number', step: 1, placeholder: 'e.g. 100', half: true },
    { id: 'count', label: 'How Many Numbers', type: 'number', step: 1, min: 1, max: 100, placeholder: 'e.g. 10', half: true },
    { id: 'allowDup', label: 'Allow Duplicates?', type: 'select', options: [
      { value: '1', label: 'Yes' }, { value: '0', label: 'No' }
    ]},
  ],
  formula: '<p>Generates random integers between min and max (inclusive).</p>',
  calculate: function(v) {
    const min = v.min, max = v.max, count = Math.min(v.count || 1, 100);
    const allowDup = v.allowDup !== '0';
    if (min >= max) return { error: 'Minimum must be less than maximum.' };
    const range = max - min + 1;
    if (!allowDup && count > range) return { error: 'Cannot generate ' + count + ' unique numbers from range of ' + range + '.' };
    const results = [];
    if (allowDup) {
      for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * range) + min);
      }
    } else {
      const pool = [];
      for (let i = min; i <= max; i++) pool.push(i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (let i = 0; i < count; i++) results.push(pool[i]);
    }
    const sum = results.reduce((a, b) => a + b, 0);
    const avg = sum / results.length;
    return {
      'Numbers': results.join(', '),
      'Count': results.length,
      'Sum': sum,
      'Average': core.formatNumber(avg, 2),
      'Min Generated': Math.min(...results),
      'Max Generated': Math.max(...results),
    };
  }
});

// === GAS MILEAGE CALCULATOR ===

R('gas-mileage-calculator', {
  title: 'Gas Mileage Calculator',
  description: 'Calculate your vehicle\'s fuel efficiency in MPG or L/100km.',
  tags: ['gas mileage', 'MPG', 'fuel efficiency', 'vehicle', 'cost'],
  fields: [
    { id: 'odometerStart', label: 'Starting Odometer (miles)', type: 'number', step: 0.1, min: 0, placeholder: 'e.g. 10000', half: true },
    { id: 'odometerEnd', label: 'Ending Odometer (miles)', type: 'number', step: 0.1, min: 0, placeholder: 'e.g. 10150', half: true },
    { id: 'gallons', label: 'Gallons Used', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'pricePerGallon', label: 'Price per Gallon ($)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3.50', half: true },
  ],
  formula: '<p><code>MPG = Miles Driven / Gallons Used</code></p>',
  calculate: function(v) {
    const miles = v.odometerEnd - v.odometerStart;
    if (miles <= 0) return { error: 'Ending odometer must be greater than starting odometer.' };
    const mpg = miles / v.gallons;
    const lPer100km = 235.215 / mpg;
    const costPerMile = v.pricePerGallon / mpg;
    const totalCost = v.gallons * v.pricePerGallon;
    return {
      'Miles Driven': core.formatNumber(miles, 1),
      'MPG': core.formatNumber(mpg, 2),
      'L/100km': core.formatNumber(lPer100km, 2),
      'Cost per Mile': '$' + core.formatNumber(costPerMile, 4),
      'Total Fuel Cost': '$' + core.formatNumber(totalCost, 2),
    };
  }
});

// === WHAT IS MY IP ADDRESS ===

R('what-is-my-ip-address', {
  title: 'What Is My IP Address?',
  description: 'Display your public IP address and connection information.',
  tags: ['IP address', 'network', 'public IP', 'connection'],
  fields: [],
  calculate: function() {
    return {
      html: '<div style="text-align:center;padding:1rem">' +
        '<p style="font-size:1.2em">Your public IP address will be shown here.</p>' +
        '<p><em>Note: IP detection requires a server-side lookup. In this offline calculator, your browser-local address is shown below.</em></p>' +
        '<p style="font-size:1.5em;font-weight:bold;margin:1rem 0">Local Address: <span id="myip">Detecting...</span></p>' +
        '<script>fetch("https://api.ipify.org?format=json").then(function(r){return r.json()}).then(function(d){document.getElementById("myip").textContent=d.ip}).catch(function(){document.getElementById("myip").textContent="Unavailable (check network)"});<\/script>' +
        '</div>'
    };
  }
});

})(calculatorRegistry);
