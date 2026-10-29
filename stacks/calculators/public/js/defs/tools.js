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
  formula: '<p>Counts characters, words, sentences, paragraphs and lines from the supplied text.</p>',
  background: '<p>Text counting depends on conventions: characters may include or exclude spaces, words are usually runs of non-whitespace, and sentences are counted by terminal punctuation with a fallback for unpunctuated text. These rules match what word processors and social platforms report closely enough for planning, though edge cases like hyphenated words differ between tools. Reading and speaking times are estimates based on typical rates of about 200 and 130 words per minute.</p>',
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
  background: '<p>Fuel economy is computed from the distance between two odometer readings and the fuel added at the pump, which is why filling the tank the same way each time gives the most consistent figures. Miles per gallon is the US convention, while most other countries quote litres per 100 kilometres; the two are inversely related, so a higher MPG and a lower L/100km both mean better efficiency. Cost per mile follows directly from the price paid per gallon.</p>',
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
  formula: '<p>Looks up your public IP address from an external service when a network connection is available.</p>',
  background: '<p>There is no formula here: an IP address is assigned by your internet provider or local network, and a public address lookup simply asks an external service what address the request appeared to come from. Address translation means the address your device holds locally is usually different from the one the internet sees. The page falls back to a local indicator when the lookup cannot reach the network.</p>',
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

// All definition files loaded — start the router
router.start();
