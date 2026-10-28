// Conversion calculators
(function(reg) {
const R = reg.register.bind(reg, 'conversions');

// === GENERIC CONVERSION HELPER ===
// Returns a calculator definition object for a standard factor-based converter
function C(units, title, desc, tags, formula) {
  var opts = Object.keys(units).map(function(k) {
    return { value: k, label: units[k].label || k };
  });
  return {
    title: title,
    description: desc,
    tags: tags || [],
    formula: formula || '<p>Converts between units through a common base unit.</p>',
    fields: [
      { id: 'value', label: 'Value', type: 'number', step: 0.001, placeholder: 'e.g. 100' },
      { id: 'fromUnit', label: 'From', type: 'select', half: true, options: opts },
      { id: 'toUnit', label: 'To', type: 'select', half: true, options: opts },
    ],
    calculate: (function(u) {
      return function(v) {
        if (!v.value) return { error: 'Enter a value' };
        var fromFactor = u[v.fromUnit].factor;
        var toFactor = u[v.toUnit].factor;
        var base = v.value * fromFactor;
        var result = base / toFactor;
        var fromLabel = u[v.fromUnit].label || v.fromUnit;
        var toLabel = u[v.toUnit].label || v.toUnit;
        return {
          'Result': core.formatNumber(result, 6),
          'Formula': v.value + ' ' + fromLabel + ' = ' + core.formatNumber(result, 6) + ' ' + toLabel,
        };
      };
    })(units)
  };
}

// === 1. DISTANCE / LENGTH ===
R('distance', C({
  meter: { label: 'Meters (m)', factor: 1 },
  kilometer: { label: 'Kilometers (km)', factor: 1000 },
  centimeter: { label: 'Centimeters (cm)', factor: 0.01 },
  millimeter: { label: 'Millimeters (mm)', factor: 0.001 },
  mile: { label: 'Miles (mi)', factor: 1609.344 },
  yard: { label: 'Yards (yd)', factor: 0.9144 },
  foot: { label: 'Feet (ft)', factor: 0.3048 },
  inch: { label: 'Inches (in)', factor: 0.0254 },
  nauticalMile: { label: 'Nautical Miles (nmi)', factor: 1852 },
}, 'Distance Converter', 'Convert between distance and length units.',
  ['distance', 'length', 'convert'],
  '<p>Converts between metric and imperial length units through the base unit of meters.</p>'));

// === 2. WEIGHT / MASS ===
R('weight', C({
  kilogram: { label: 'Kilograms (kg)', factor: 1 },
  gram: { label: 'Grams (g)', factor: 0.001 },
  milligram: { label: 'Milligrams (mg)', factor: 0.000001 },
  metricTon: { label: 'Metric Tons (t)', factor: 1000 },
  pound: { label: 'Pounds (lb)', factor: 0.453592 },
  ounce: { label: 'Ounces (oz)', factor: 0.0283495 },
  stone: { label: 'Stones (st)', factor: 6.35029 },
  shortTon: { label: 'Short Tons (US)', factor: 907.185 },
  longTon: { label: 'Long Tons (UK)', factor: 1016.05 },
}, 'Weight (Mass) Converter', 'Convert between weight and mass units.',
  ['weight', 'mass', 'convert'],
  '<p>Converts between metric and imperial mass units through the base unit of kilograms.</p>'));

// === 3. TEMPERATURE ===
R('temperature', {
  title: 'Temperature Converter',
  description: 'Convert between Celsius, Fahrenheit, Kelvin, and Rankine.',
  tags: ['temperature', 'celsius', 'fahrenheit', 'kelvin'],
  formula: '<p>Temperature conversions use offset-based formulas rather than simple multiplication.</p>',
  fields: [
    { id: 'value', label: 'Value', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
    { id: 'fromUnit', label: 'From', type: 'select', half: true, options: [
      { value: 'celsius', label: 'Celsius (C)' }, { value: 'fahrenheit', label: 'Fahrenheit (F)' },
      { value: 'kelvin', label: 'Kelvin (K)' }, { value: 'rankine', label: 'Rankine (R)' },
    ]},
    { id: 'toUnit', label: 'To', type: 'select', half: true, options: [
      { value: 'celsius', label: 'Celsius (C)' }, { value: 'fahrenheit', label: 'Fahrenheit (F)' },
      { value: 'kelvin', label: 'Kelvin (K)' }, { value: 'rankine', label: 'Rankine (R)' },
    ]},
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var c;
    switch (v.fromUnit) {
      case 'celsius': c = v.value; break;
      case 'fahrenheit': c = (v.value - 32) * 5 / 9; break;
      case 'kelvin': c = v.value - 273.15; break;
      case 'rankine': c = (v.value - 491.67) * 5 / 9; break;
    }
    var result;
    switch (v.toUnit) {
      case 'celsius': result = c; break;
      case 'fahrenheit': result = c * 9 / 5 + 32; break;
      case 'kelvin': result = c + 273.15; break;
      case 'rankine': result = (c + 273.15) * 9 / 5; break;
    }
    var names = { celsius: 'C', fahrenheit: 'F', kelvin: 'K', rankine: 'R' };
    return {
      'Result': core.formatNumber(result, 4) + ' ' + names[v.toUnit],
      'Formula': v.value + ' ' + names[v.fromUnit] + ' = ' + core.formatNumber(result, 4) + ' ' + names[v.toUnit],
    };
  }
});

// === 4. AREA ===
R('area', C({
  sqMeter: { label: 'Square Meters (m2)', factor: 1 },
  sqKilometer: { label: 'Square Kilometers (km2)', factor: 1e6 },
  sqCentimeter: { label: 'Square Centimeters (cm2)', factor: 0.0001 },
  sqMillimeter: { label: 'Square Millimeters (mm2)', factor: 1e-6 },
  sqMile: { label: 'Square Miles (mi2)', factor: 2.59e6 },
  sqYard: { label: 'Square Yards (yd2)', factor: 0.836127 },
  sqFoot: { label: 'Square Feet (ft2)', factor: 0.092903 },
  sqInch: { label: 'Square Inches (in2)', factor: 0.00064516 },
  acre: { label: 'Acres', factor: 4046.86 },
  hectare: { label: 'Hectares (ha)', factor: 10000 },
}, 'Area Converter', 'Convert between area units.',
  ['area', 'square', 'convert'],
  '<p>Converts between metric and imperial area units through the base unit of square meters.</p>'));

// === 5. VOLUME ===
R('volume', C({
  liter: { label: 'Liters (L)', factor: 1 },
  milliliter: { label: 'Milliliters (mL)', factor: 0.001 },
  cubicMeter: { label: 'Cubic Meters (m3)', factor: 1000 },
  cubicCentimeter: { label: 'Cubic Centimeters (cm3)', factor: 0.001 },
  usGallon: { label: 'US Gallons (gal)', factor: 3.78541 },
  usQuart: { label: 'US Quarts (qt)', factor: 0.946353 },
  usPint: { label: 'US Pints (pt)', factor: 0.473176 },
  usCup: { label: 'US Cups', factor: 0.236588 },
  usFluidOz: { label: 'US Fluid Ounces (fl oz)', factor: 0.0295735 },
  usTablespoon: { label: 'US Tablespoons (tbsp)', factor: 0.0147868 },
  usTeaspoon: { label: 'US Teaspoons (tsp)', factor: 0.00492892 },
  imperialGallon: { label: 'Imperial Gallons (gal)', factor: 4.54609 },
}, 'Volume Converter', 'Convert between volume units.',
  ['volume', 'liters', 'gallons', 'convert'],
  '<p>Converts between metric and imperial volume units through the base unit of liters.</p>'));

// === 6. COOKING ===
R('cooking', C({
  cup: { label: 'Cups', factor: 1 },
  tablespoon: { label: 'Tablespoons', factor: 1 / 16 },
  teaspoon: { label: 'Teaspoons', factor: 1 / 48 },
  fluidOunce: { label: 'Fluid Ounces', factor: 1 / 8 },
  milliliter: { label: 'Milliliters (mL)', factor: 1 / 236.588 },
  liter: { label: 'Liters (L)', factor: 1 / 236588 },
  pint: { label: 'Pints', factor: 1 / 2 },
  quart: { label: 'Quarts', factor: 1 / 4 },
  gallon: { label: 'Gallons', factor: 1 / 128 },
  ounce: { label: 'Ounces (weight)', factor: 1 / 6 },
  gram: { label: 'Grams (water equiv.)', factor: 236.588 },
}, 'Cooking Measurement Converter', 'Convert between cooking measurement units.',
  ['cooking', 'recipe', 'cups', 'tablespoons'],
  '<p>Converts between common cooking measurements used in recipes.</p>'));

// === 7. COMPUTER STORAGE ===
R('computerstorage', C({
  byte: { label: 'Bytes (B)', factor: 1 },
  kilobyte: { label: 'Kilobytes (KB)', factor: 1000 },
  megabyte: { label: 'Megabytes (MB)', factor: 1e6 },
  gigabyte: { label: 'Gigabytes (GB)', factor: 1e9 },
  terabyte: { label: 'Terabytes (TB)', factor: 1e12 },
  petabyte: { label: 'Petabytes (PB)', factor: 1e15 },
}, 'Computer Storage Converter', 'Convert between computer storage units.',
  ['computer', 'storage', 'bytes', 'convert'],
  '<p>Converts between decimal (SI) storage units: 1 KB = 1000 B, 1 MB = 1000 KB, etc.</p>'));

// === 8. DENSITY ===
R('density', C({
  kgPerM3: { label: 'kg/m3', factor: 1 },
  gPerCm3: { label: 'g/cm3', factor: 1000 },
  gPerMl: { label: 'g/mL', factor: 1000 },
  lbPerFt3: { label: 'lb/ft3', factor: 16.0185 },
  lbPerIn3: { label: 'lb/in3', factor: 27679.9 },
  lbPerGal: { label: 'lb/US gal', factor: 119.826 },
  ozPerIn3: { label: 'oz/in3', factor: 1729.98 },
  slugPerFt3: { label: 'slug/ft3', factor: 515.379 },
}, 'Density Converter', 'Convert between density units.',
  ['density', 'mass', 'volume', 'convert'],
  '<p>Converts between density units through the base unit of kg/m3.</p>'));

// === 9. SPEED ===
R('speed', C({
  mps: { label: 'Meters/second (m/s)', factor: 1 },
  kph: { label: 'Kilometers/hour (km/h)', factor: 1 / 3.6 },
  mph: { label: 'Miles/hour (mph)', factor: 0.44704 },
  fps: { label: 'Feet/second (ft/s)', factor: 0.3048 },
  knot: { label: 'Knots (kn)', factor: 0.514444 },
  mach: { label: 'Mach (at sea level)', factor: 340.3 },
  c: { label: 'Speed of Light (c)', factor: 299792458 },
}, 'Speed Converter', 'Convert between speed units.',
  ['speed', 'velocity', 'convert'],
  '<p>Converts between speed units through the base unit of meters per second.</p>'));

// === 10. TIME ===
R('time', C({
  second: { label: 'Seconds (s)', factor: 1 },
  minute: { label: 'Minutes (min)', factor: 60 },
  hour: { label: 'Hours (h)', factor: 3600 },
  day: { label: 'Days', factor: 86400 },
  week: { label: 'Weeks', factor: 604800 },
  month: { label: 'Months (avg 30.44d)', factor: 2629746 },
  year: { label: 'Years (avg 365.25d)', factor: 31557600 },
  millisecond: { label: 'Milliseconds (ms)', factor: 0.001 },
  microsecond: { label: 'Microseconds (us)', factor: 1e-6 },
  nanosecond: { label: 'Nanoseconds (ns)', factor: 1e-9 },
}, 'Time Converter', 'Convert between time units.',
  ['time', 'seconds', 'minutes', 'hours', 'convert'],
  '<p>Converts between time units through the base unit of seconds.</p>'));

// === 11. PRESSURE ===
R('pressure', C({
  pascal: { label: 'Pascals (Pa)', factor: 1 },
  kilopascal: { label: 'Kilopascals (kPa)', factor: 1000 },
  megapascal: { label: 'Megapascals (MPa)', factor: 1e6 },
  bar: { label: 'Bars', factor: 1e5 },
  psi: { label: 'PSI (lb/in2)', factor: 6894.76 },
  atm: { label: 'Atmospheres (atm)', factor: 101325 },
  mmHg: { label: 'mmHg (Torr)', factor: 133.322 },
  torr: { label: 'Torr', factor: 133.322 },
  inHg: { label: 'Inches Hg', factor: 3386.39 },
  psf: { label: 'PSF (lb/ft2)', factor: 47.8803 },
}, 'Pressure Converter', 'Convert between pressure units.',
  ['pressure', 'pascal', 'psi', 'convert'],
  '<p>Converts between pressure units through the base unit of pascals.</p>'));

// === 12. ENERGY ===
R('energy', C({
  joule: { label: 'Joules (J)', factor: 1 },
  kilojoule: { label: 'Kilojoules (kJ)', factor: 1000 },
  calorie: { label: 'Calories (cal)', factor: 4.184 },
  kilocalorie: { label: 'Kilocalories (kcal)', factor: 4184 },
  wattHour: { label: 'Watt-hours (Wh)', factor: 3600 },
  kilowattHour: { label: 'Kilowatt-hours (kWh)', factor: 3.6e6 },
  btu: { label: 'BTU', factor: 1055.06 },
  electronVolt: { label: 'Electron Volts (eV)', factor: 1.602e-19 },
  erg: { label: 'Ergs', factor: 1e-7 },
  footPound: { label: 'Foot-pounds (ft-lb)', factor: 1.35582 },
  therm: { label: 'Therms', factor: 105506e3 },
}, 'Energy Converter', 'Convert between energy units.',
  ['energy', 'joules', 'calories', 'convert'],
  '<p>Converts between energy units through the base unit of joules.</p>'));

// === 13. POWER ===
R('power', C({
  watt: { label: 'Watts (W)', factor: 1 },
  kilowatt: { label: 'Kilowatts (kW)', factor: 1000 },
  megawatt: { label: 'Megawatts (MW)', factor: 1e6 },
  hpMechanical: { label: 'Horsepower (mechanical)', factor: 745.7 },
  hpMetric: { label: 'Horsepower (metric)', factor: 735.5 },
  hpElectrical: { label: 'Horsepower (electrical)', factor: 746 },
  btuPerHour: { label: 'BTU/hour', factor: 0.293071 },
  footPoundPerSec: { label: 'Foot-pounds/second', factor: 1.35582 },
  calPerSec: { label: 'Calories/second', factor: 4.184 },
}, 'Power Converter', 'Convert between power units.',
  ['power', 'watts', 'horsepower', 'convert'],
  '<p>Converts between power units through the base unit of watts.</p>'));

// === 14. FREQUENCY ===
R('frequency', C({
  hertz: { label: 'Hertz (Hz)', factor: 1 },
  kilohertz: { label: 'Kilohertz (kHz)', factor: 1000 },
  megahertz: { label: 'Megahertz (MHz)', factor: 1e6 },
  gigahertz: { label: 'Gigahertz (GHz)', factor: 1e9 },
  rpm: { label: 'Revolutions/min (RPM)', factor: 1 / 60 },
}, 'Frequency Converter', 'Convert between frequency units.',
  ['frequency', 'hertz', 'convert'],
  '<p>Converts between frequency units through the base unit of hertz.</p>'));

// === 15. ANGLE ===
R('angle', C({
  degree: { label: 'Degrees (deg)', factor: 1 },
  radian: { label: 'Radians (rad)', factor: 180 / Math.PI },
  gradian: { label: 'Gradians (gon)', factor: 0.9 },
  arcminute: { label: 'Arc Minutes', factor: 1 / 60 },
  arcsecond: { label: 'Arc Seconds', factor: 1 / 3600 },
  turn: { label: 'Turns', factor: 360 },
  mil: { label: 'Mils (NATO)', factor: 360 / 6400 },
}, 'Angle Converter', 'Convert between angle units.',
  ['angle', 'degrees', 'radians', 'convert'],
  '<p>Converts between angle units through the base unit of degrees.</p>'));

// === 16. FUEL ECONOMY ===
R('fuel-economy', {
  title: 'Fuel Economy Converter',
  description: 'Convert between fuel economy units (MPG, L/100km).',
  tags: ['fuel', 'economy', 'mpg', 'liters'],
  formula: '<p>Converts between miles per gallon and liters per 100 km. Note: higher MPG = better, higher L/100km = worse.</p>',
  fields: [
    { id: 'value', label: 'Value', type: 'number', step: 0.01, placeholder: 'e.g. 30' },
    { id: 'fromUnit', label: 'From', type: 'select', half: true, options: [
      { value: 'mpgUS', label: 'MPG (US)' }, { value: 'mpgImp', label: 'MPG (Imperial)' },
      { value: 'lPer100km', label: 'L/100km' }, { value: 'kmPerL', label: 'km/L' },
    ]},
    { id: 'toUnit', label: 'To', type: 'select', half: true, options: [
      { value: 'mpgUS', label: 'MPG (US)' }, { value: 'mpgImp', label: 'MPG (Imperial)' },
      { value: 'lPer100km', label: 'L/100km' }, { value: 'kmPerL', label: 'km/L' },
    ]},
  ],
  calculate: function(v) {
    if (!v.value || v.value <= 0) return { error: 'Enter a positive value' };
    var lPer100km;
    switch (v.fromUnit) {
      case 'mpgUS': lPer100km = 235.215 / v.value; break;
      case 'mpgImp': lPer100km = 282.481 / v.value; break;
      case 'lPer100km': lPer100km = v.value; break;
      case 'kmPerL': lPer100km = 100 / v.value; break;
    }
    var result;
    switch (v.toUnit) {
      case 'mpgUS': result = 235.215 / lPer100km; break;
      case 'mpgImp': result = 282.481 / lPer100km; break;
      case 'lPer100km': result = lPer100km; break;
      case 'kmPerL': result = 100 / lPer100km; break;
    }
    var names = { mpgUS: 'MPG (US)', mpgImp: 'MPG (Imp)', lPer100km: 'L/100km', kmPerL: 'km/L' };
    return {
      'Result': core.formatNumber(result, 4) + ' ' + names[v.toUnit],
      'Formula': v.value + ' ' + names[v.fromUnit] + ' = ' + core.formatNumber(result, 4) + ' ' + names[v.toUnit],
    };
  }
});

// === 17. DATA TRANSFER RATE ===
R('data-transfer', C({
  bps: { label: 'Bits/second (bps)', factor: 1 },
  kbps: { label: 'Kilobits/second (Kbps)', factor: 1000 },
  mbps: { label: 'Megabits/second (Mbps)', factor: 1e6 },
  gbps: { label: 'Gigabits/second (Gbps)', factor: 1e9 },
  tbps: { label: 'Terabits/second (Tbps)', factor: 1e12 },
  KBps: { label: 'KB/second', factor: 8000 },
  MBps: { label: 'MB/second', factor: 8e6 },
  GBps: { label: 'GB/second', factor: 8e9 },
}, 'Data Transfer Rate Converter', 'Convert between data transfer rate units.',
  ['data', 'transfer', 'bandwidth', 'convert'],
  '<p>Converts between data transfer rate units through the base unit of bits per second.</p>'));

// === 18. LENGTH CHAIN / SURVEYING ===
R('length-chain', C({
  chain: { label: 'Chains (ch)', factor: 20.1168 },
  furlong: { label: 'Furlongs', factor: 201.168 },
  rod: { label: 'Rods (rd)', factor: 5.0292 },
  link: { label: 'Links (li)', factor: 0.201168 },
  fathom: { label: 'Fathoms (fm)', factor: 1.8288 },
  league: { label: 'Leagues (statute)', factor: 4828.03 },
  parsec: { label: 'Parsecs (pc)', factor: 3.086e16 },
  lightyear: { label: 'Light Years (ly)', factor: 9.461e15 },
  astronomicalUnit: { label: 'Astronomical Units (AU)', factor: 1.496e11 },
}, 'Length (Surveying) Converter', 'Convert between surveying and historical length units.',
  ['length', 'chain', 'surveying', 'furlong'],
  '<p>Converts between surveying units like chains, furlongs, rods, and links through meters.</p>'));

// === 19. APOTHECARY MASS ===
R('mass-apothecary', C({
  grain: { label: 'Grains (gr)', factor: 1 },
  scruple: { label: 'Scruples (s)', factor: 20 },
  dram: { label: 'Drams (dr)', factor: 60 },
  ounce: { label: 'Apothecary Ounces (oz ap)', factor: 480 },
  pound: { label: 'Apothecary Pounds (lb ap)', factor: 5760 },
}, 'Apothecary Mass Converter', 'Convert between apothecary weight units.',
  ['apothecary', 'mass', 'weight', 'historical'],
  '<p>Converts between historical apothecary weight units through grains.</p>'));

// === 20. IMPERIAL VOLUME ===
R('volume-imperial', C({
  flOz: { label: 'Fluid Ounces (imp fl oz)', factor: 1 },
  gill: { label: 'Gills (imp)', factor: 5 },
  pint: { label: 'Pints (imp)', factor: 20 },
  quart: { label: 'Quarts (imp)', factor: 40 },
  gallon: { label: 'Gallons (imp)', factor: 160 },
  peck: { label: 'Pecks (imp)', factor: 2304 },
  bushel: { label: 'Bushels (imp)', factor: 9216 },
}, 'Imperial Volume Converter', 'Convert between British Imperial volume units.',
  ['imperial', 'volume', 'british', 'convert'],
  '<p>Converts between British Imperial volume units through fluid ounces.</p>'));

// === 21. IMPERIAL AREA ===
R('area-imperial', C({
  sqFoot: { label: 'Square Feet (ft2)', factor: 1 },
  sqInch: { label: 'Square Inches (in2)', factor: 1 / 144 },
  sqYard: { label: 'Square Yards (yd2)', factor: 9 },
  acre: { label: 'Acres', factor: 43560 },
  sqMile: { label: 'Square Miles (mi2)', factor: 27878400 },
  rood: { label: 'Roods', factor: 10890 },
  perch: { label: 'Perches', factor: 272.25 },
  township: { label: 'Townships', factor: 1139967600 },
}, 'Imperial Area Converter', 'Convert between British Imperial area units.',
  ['imperial', 'area', 'british', 'convert'],
  '<p>Converts between British Imperial area units through square feet.</p>'));

// === 22. ABSOLUTE TEMPERATURE ===
R('temperature-absolute', {
  title: 'Absolute Temperature Converter',
  description: 'Convert between absolute temperature scales including Delisle, Reaumur, and Newton.',
  tags: ['temperature', 'absolute', 'historical', 'convert'],
  formula: '<p>Converts between absolute and historical temperature scales.</p>',
  fields: [
    { id: 'value', label: 'Value', type: 'number', step: 0.01, placeholder: 'e.g. 300' },
    { id: 'fromUnit', label: 'From', type: 'select', half: true, options: [
      { value: 'kelvin', label: 'Kelvin (K)' }, { value: 'rankine', label: 'Rankine (R)' },
      { value: 'reaumur', label: 'Reaumur (Re)' }, { value: 'delisle', label: 'Delisle (De)' },
      { value: 'newton', label: 'Newton (N)' }, { value: 'romer', label: 'Romer (Ro)' },
    ]},
    { id: 'toUnit', label: 'To', type: 'select', half: true, options: [
      { value: 'kelvin', label: 'Kelvin (K)' }, { value: 'rankine', label: 'Rankine (R)' },
      { value: 'reaumur', label: 'Reaumur (Re)' }, { value: 'delisle', label: 'Delisle (De)' },
      { value: 'newton', label: 'Newton (N)' }, { value: 'romer', label: 'Romer (Ro)' },
    ]},
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var c;
    switch (v.fromUnit) {
      case 'kelvin': c = v.value - 273.15; break;
      case 'rankine': c = (v.value - 491.67) * 5 / 9; break;
      case 'reaumur': c = v.value * 1.25; break;
      case 'delisle': c = 100 - v.value * 2 / 3; break;
      case 'newton': c = v.value * 100 / 33; break;
      case 'romer': c = (v.value - 7.5) * 40 / 21; break;
    }
    var result;
    switch (v.toUnit) {
      case 'kelvin': result = c + 273.15; break;
      case 'rankine': result = (c + 273.15) * 9 / 5; break;
      case 'reaumur': result = c * 0.8; break;
      case 'delisle': result = (100 - c) * 3 / 2; break;
      case 'newton': result = c * 33 / 100; break;
      case 'romer': result = c * 21 / 40 + 7.5; break;
    }
    var names = { kelvin: 'K', rankine: 'R', reaumur: 'Re', delisle: 'De', newton: 'N', romer: 'Ro' };
    return {
      'Result': core.formatNumber(result, 4) + ' ' + names[v.toUnit],
      'Formula': v.value + ' ' + names[v.fromUnit] + ' = ' + core.formatNumber(result, 4) + ' ' + names[v.toUnit],
    };
  }
});

// === 23. FORCE ===
R('force', C({
  newton: { label: 'Newtons (N)', factor: 1 },
  kilonewton: { label: 'Kilonewtons (kN)', factor: 1000 },
  lbf: { label: 'Pounds-force (lbf)', factor: 4.44822 },
  dyne: { label: 'Dynes (dyn)', factor: 1e-5 },
  kgf: { label: 'Kilogram-force (kgf)', factor: 9.80665 },
  poundal: { label: 'Poundals (pdl)', factor: 0.138255 },
}, 'Force Converter', 'Convert between force units.',
  ['force', 'newton', 'convert'],
  '<p>Converts between force units through the base unit of newtons.</p>'));

// === 24. TORQUE ===
R('torque', C({
  nm: { label: 'Newton-meters (Nm)', factor: 1 },
  ftLb: { label: 'Foot-pounds (ft-lb)', factor: 1.35582 },
  inLb: { label: 'Inch-pounds (in-lb)', factor: 0.112985 },
  kgfCm: { label: 'kgf-cm', factor: 0.0980665 },
  kgfM: { label: 'kgf-m', factor: 9.80665 },
}, 'Torque Converter', 'Convert between torque units.',
  ['torque', 'moment', 'convert'],
  '<p>Converts between torque units through the base unit of newton-meters.</p>'));

// === 25. ACCELERATION ===
R('acceleration', C({
  ms2: { label: 'm/s2', factor: 1 },
  fps2: { label: 'ft/s2', factor: 0.3048 },
  g: { label: 'G (standard gravity)', factor: 9.80665 },
  gal: { label: 'Gal (cm/s2)', factor: 0.01 },
}, 'Acceleration Converter', 'Convert between acceleration units.',
  ['acceleration', 'convert'],
  '<p>Converts between acceleration units through the base unit of m/s2.</p>'));

// === 26. FLOW RATE ===
R('flow-rate', C({
  lps: { label: 'Liters/second (L/s)', factor: 1 },
  lpm: { label: 'Liters/minute (L/min)', factor: 1 / 60 },
  lph: { label: 'Liters/hour (L/h)', factor: 1 / 3600 },
  m3s: { label: 'Cubic meters/second (m3/s)', factor: 1000 },
  m3h: { label: 'Cubic meters/hour (m3/h)', factor: 1000 / 3600 },
  gps: { label: 'US Gallons/second (gal/s)', factor: 3.78541 },
  gpm: { label: 'US Gallons/minute (GPM)', factor: 3.78541 / 60 },
  gph: { label: 'US Gallons/hour (gal/h)', factor: 3.78541 / 3600 },
  cfs: { label: 'Cubic feet/second (cfs)', factor: 28.3168 },
}, 'Flow Rate Converter', 'Convert between volumetric flow rate units.',
  ['flow', 'rate', 'volumetric', 'convert'],
  '<p>Converts between volumetric flow rate units through liters per second.</p>'));

// === 27. RADIATION ===
R('radiation', C({
  gray: { label: 'Grays (Gy)', factor: 1 },
  milligray: { label: 'Milligrays (mGy)', factor: 0.001 },
  rad: { label: 'Rads', factor: 0.01 },
  sievert: { label: 'Sieverts (Sv)', factor: 1 },
  millisievert: { label: 'Millisieverts (mSv)', factor: 0.001 },
  rem: { label: 'REMs', factor: 0.01 },
}, 'Radiation Converter', 'Convert between radiation dose and activity units.',
  ['radiation', 'dose', 'activity', 'convert'],
  '<p>Converts between radiation absorbed dose units through grays.</p>'));

// === 28. ILLUMINATION ===
R('illumination', C({
  lux: { label: 'Lux (lx)', factor: 1 },
  footcandle: { label: 'Foot-candles (fc)', factor: 10.7639 },
  millilux: { label: 'Millilux (mlx)', factor: 0.001 },
  photocandle: { label: 'Phot (ph)', factor: 10000 },
}, 'Illumination Converter', 'Convert between illumination and luminance units.',
  ['illumination', 'lux', 'footcandle', 'convert'],
  '<p>Converts between illumination units through lux.</p>'));

// === 29. DIGITAL STORAGE (BITS) ===
R('digital-storage', C({
  bit: { label: 'Bits (b)', factor: 1 },
  byte: { label: 'Bytes (B)', factor: 8 },
  kilobit: { label: 'Kilobits (Kb)', factor: 1000 },
  kilobyte: { label: 'Kilobytes (KB)', factor: 8000 },
  megabit: { label: 'Megabits (Mb)', factor: 1e6 },
  megabyte: { label: 'Megabytes (MB)', factor: 8e6 },
  gigabit: { label: 'Gigabits (Gb)', factor: 1e9 },
  gigabyte: { label: 'Gigabytes (GB)', factor: 8e9 },
  terabit: { label: 'Terabits (Tb)', factor: 1e12 },
  terabyte: { label: 'Terabytes (TB)', factor: 8e12 },
}, 'Digital Storage Converter', 'Convert between digital storage units including bits and bytes.',
  ['digital', 'storage', 'bits', 'bytes', 'convert'],
  '<p>Converts between digital storage units. 1 byte = 8 bits.</p>'));

// === 30. TYPOGRAPHY ===
R('typography', C({
  point: { label: 'Points (pt)', factor: 1 },
  pica: { label: 'Picas (pc)', factor: 1 / 12 },
  inch: { label: 'Inches (in)', factor: 1 / 72 },
  cm: { label: 'Centimeters (cm)', factor: 1 / 28.3465 },
  mm: { label: 'Millimeters (mm)', factor: 1 / 2.83465 },
  em: { label: 'EM (at 12pt base)', factor: 1 / 12 },
}, 'Typography Converter', 'Convert between typography measurement units.',
  ['typography', 'points', 'picas', 'convert'],
  '<p>Converts between typography units through points. 1 pt = 1/72 inch.</p>'));

// === 31. TEXTILE ===
R('textile', C({
  meter: { label: 'Meters (m)', factor: 1 },
  yard: { label: 'Yards (yd)', factor: 0.9144 },
  inch: { label: 'Inches (in)', factor: 0.0254 },
  denier: { label: 'Denier (g/9km)', factor: 1 },
  tex: { label: 'Tex (g/km)', factor: 9 },
  dtex: { label: 'Decitex (dg/km)', factor: 0.9 },
}, 'Textile Measurement Converter', 'Convert between textile and fabric measurement units.',
  ['textile', 'fabric', 'yarn', 'convert'],
  '<p>Converts between textile measurement units through meters.</p>'));

// === 32. NAUTICAL ===
R('nautical', C({
  nauticalMile: { label: 'Nautical Miles (NM)', factor: 1 },
  cable: { label: 'Cables (intl)', factor: 1 / 10 },
  fathom: { label: 'Fathoms', factor: 10 / 9.26 },
  knot: { label: 'Knots (speed)', factor: 1 },
  minuteOfArc: { label: 'Minutes of Arc (lat)', factor: 1 },
  degreeOfArc: { label: 'Degrees of Arc (lat)', factor: 1 / 60 },
}, 'Nautical Measurement Converter', 'Convert between nautical and maritime measurement units.',
  ['nautical', 'maritime', 'sea', 'convert'],
  '<p>Converts between nautical measurement units through nautical miles.</p>'));

// === 33. AGRICULTURAL ===
R('agricultural', C({
  kgHa: { label: 'kg/hectare', factor: 1 },
  lbAcre: { label: 'lb/acre', factor: 0.112085 },
  buAcre: { label: 'bushels/acre', factor: 53.81 },
  tonHa: { label: 'metric tons/hectare', factor: 0.001 },
  tonAcre: { label: 'short tons/acre', factor: 0.0892176 },
}, 'Agricultural Measurement Converter', 'Convert between agricultural measurement units.',
  ['agricultural', 'farming', 'yield', 'convert'],
  '<p>Converts between agricultural measurement units through kg/hectare.</p>'));

// === 34. CONSTRUCTION MEASUREMENTS ===
R('construction-measurements', C({
  boardFoot: { label: 'Board Feet (BF)', factor: 1 },
  cubicFoot: { label: 'Cubic Feet (ft3)', factor: 12 },
  cubicMeter: { label: 'Cubic Meters (m3)', factor: 418.88 },
  cubicInch: { label: 'Cubic Inches (in3)', factor: 144 },
  cubicCentimeter: { label: 'Cubic Centimeters (cm3)', factor: 545.4 },
}, 'Construction Measurement Converter', 'Convert between construction and building measurement units.',
  ['construction', 'building', 'lumber', 'convert'],
  '<p>Converts between construction measurement units through board feet.</p>'));

// === 35. CURRENCY APPROXIMATE ===
R('currency-approximate', C({
  usd: { label: 'US Dollar (USD)', factor: 1 },
  eur: { label: 'Euro (EUR)', factor: 0.92 },
  gbp: { label: 'British Pound (GBP)', factor: 0.79 },
  jpy: { label: 'Japanese Yen (JPY)', factor: 151.5 },
  inr: { label: 'Indian Rupee (INR)', factor: 83.1 },
  cny: { label: 'Chinese Yuan (CNY)', factor: 7.24 },
  aud: { label: 'Australian Dollar (AUD)', factor: 1.53 },
  cad: { label: 'Canadian Dollar (CAD)', factor: 1.36 },
  chf: { label: 'Swiss Franc (CHF)', factor: 0.88 },
  krw: { label: 'South Korean Won (KRW)', factor: 1325 },
  mxn: { label: 'Mexican Peso (MXN)', factor: 17.1 },
  brl: { label: 'Brazilian Real (BRL)', factor: 4.97 },
}, 'Approximate Currency Converter', 'Convert between currencies using approximate fixed rates (as of 2024).',
  ['currency', 'money', 'exchange', 'approximate'],
  '<p>Uses approximate fixed exchange rates as of 2024. For real-time rates, use a financial API.</p>'));

// === 36. METRIC PREFIX ===
R('prefix', C({
  peta: { label: 'Peta- (P)', factor: 1e15 },
  tera: { label: 'Tera- (T)', factor: 1e12 },
  giga: { label: 'Giga- (G)', factor: 1e9 },
  mega: { label: 'Mega- (M)', factor: 1e6 },
  kilo: { label: 'Kilo- (k)', factor: 1e3 },
  base: { label: 'Base unit', factor: 1 },
  milli: { label: 'Milli- (m)', factor: 1e-3 },
  micro: { label: 'Micro- (u)', factor: 1e-6 },
  nano: { label: 'Nano- (n)', factor: 1e-9 },
  pico: { label: 'Pico- (p)', factor: 1e-12 },
  femto: { label: 'Femto- (f)', factor: 1e-15 },
}, 'Metric Prefix Converter', 'Convert between metric prefixes.',
  ['metric', 'prefix', 'kilo', 'convert'],
  '<p>Converts between metric prefixes: kilo, mega, giga, etc.</p>'));

// === 37. BINARY PREFIX ===
R('binary-prefix', C({
  kibibyte: { label: 'Kibibytes (KiB)', factor: 1024 },
  mebibyte: { label: 'Mebibytes (MiB)', factor: 1048576 },
  gibibyte: { label: 'Gibibytes (GiB)', factor: 1073741824 },
  tebibyte: { label: 'Tebibytes (TiB)', factor: 1099511627776 },
  pebibyte: { label: 'Pebibytes (PiB)', factor: 1125899906842624 },
  byte: { label: 'Bytes (B)', factor: 1 },
}, 'Binary Prefix Converter', 'Convert between binary prefixes (IEC standard).',
  ['binary', 'prefix', 'kibibyte', 'mebibyte', 'convert'],
  '<p>Converts between binary prefixes: 1 KiB = 1024 B, 1 MiB = 1024 KiB, etc.</p>'));

// === 38. ARC MINUTES/SECONDS ===
R('angle-arc', C({
  degree: { label: 'Degrees (deg)', factor: 1 },
  arcminute: { label: 'Arc Minutes (arcmin)', factor: 1 / 60 },
  arcsecond: { label: 'Arc Seconds (arcsec)', factor: 1 / 3600 },
  radian: { label: 'Radians (rad)', factor: 180 / Math.PI },
  mil: { label: 'Mils', factor: 360 / 6400 },
}, 'Arc Minutes and Seconds Converter', 'Convert between arc minutes, arc seconds, and decimal degrees.',
  ['angle', 'arc', 'minutes', 'seconds', 'convert'],
  '<p>Converts between arc-based angle units. 1 degree = 60 arc minutes = 3600 arc seconds.</p>'));

// === 39. US CUSTOMARY VOLUME ===
R('volume-us', C({
  flOz: { label: 'Fluid Ounces (fl oz)', factor: 1 },
  tablespoon: { label: 'Tablespoons (tbsp)', factor: 0.5 },
  teaspoon: { label: 'Teaspoons (tsp)', factor: 1 / 6 },
  cup: { label: 'Cups', factor: 8 },
  pint: { label: 'Pints (pt)', factor: 16 },
  quart: { label: 'Quarts (qt)', factor: 32 },
  gallon: { label: 'Gallons (gal)', factor: 128 },
  gill: { label: 'Gills (US)', factor: 4 },
}, 'US Customary Volume Converter', 'Convert between US customary volume units.',
  ['volume', 'US', 'customary', 'convert'],
  '<p>Converts between US customary volume units through fluid ounces.</p>'));

// === 40. US CUSTOMARY WEIGHT ===
R('weight-us', C({
  ounce: { label: 'Ounces (oz)', factor: 1 },
  pound: { label: 'Pounds (lb)', factor: 16 },
  stone: { label: 'Stones (st)', factor: 224 },
  shortHundredweight: { label: 'Short Hundredweight (cwt)', factor: 1600 },
  shortTon: { label: 'Short Tons', factor: 32000 },
  ton: { label: 'Long Tons', factor: 35840 },
}, 'US Customary Weight Converter', 'Convert between US customary weight units.',
  ['weight', 'US', 'customary', 'convert'],
  '<p>Converts between US customary weight units through ounces.</p>'));

// === 41. US CUSTOMARY DISTANCE ===
R('distance-us', C({
  inch: { label: 'Inches (in)', factor: 1 },
  foot: { label: 'Feet (ft)', factor: 12 },
  yard: { label: 'Yards (yd)', factor: 36 },
  rod: { label: 'Rods (rd)', factor: 198 },
  chain: { label: 'Chains (ch)', factor: 660 },
  furlong: { label: 'Furlongs', factor: 7920 },
  mile: { label: 'Miles (mi)', factor: 63360 },
}, 'US Customary Distance Converter', 'Convert between US customary distance units.',
  ['distance', 'US', 'customary', 'convert'],
  '<p>Converts between US customary distance units through inches.</p>'));

// === 42. US CUSTOMARY AREA ===
R('area-us', C({
  sqFoot: { label: 'Square Feet (ft2)', factor: 1 },
  sqInch: { label: 'Square Inches (in2)', factor: 1 / 144 },
  sqYard: { label: 'Square Yards (yd2)', factor: 9 },
  acre: { label: 'Acres', factor: 43560 },
  sqMile: { label: 'Square Miles (mi2)', factor: 27878400 },
  section: { label: 'Sections (640 acres)', factor: 27878400 },
  township: { label: 'Townships (36 sections)', factor: 1003622400 },
}, 'US Customary Area Converter', 'Convert between US customary area units.',
  ['area', 'US', 'customary', 'convert'],
  '<p>Converts between US customary area units through square feet.</p>'));

// === 43. SCIENTIFIC SPEED ===
R('speed-scientific', C({
  mps: { label: 'Meters/second (m/s)', factor: 1 },
  cms: { label: 'Centimeters/second (cm/s)', factor: 0.01 },
  kps: { label: 'Kilometers/second (km/s)', factor: 1000 },
  machStd: { label: 'Mach (standard)', factor: 340.3 },
  machHigh: { label: 'Mach (high altitude)', factor: 295.15 },
  c: { label: 'Speed of Light (c)', factor: 299792458 },
  fps: { label: 'Feet/second (ft/s)', factor: 0.3048 },
  fpm: { label: 'Feet/minute (ft/min)', factor: 0.00508 },
}, 'Scientific Speed Converter', 'Convert between scientific and specialized speed units.',
  ['speed', 'scientific', 'mach', 'convert'],
  '<p>Converts between scientific speed units through meters per second.</p>'));

// === 44. THERMAL ENERGY ===
R('energy-thermal', C({
  joule: { label: 'Joules (J)', factor: 1 },
  calorie: { label: 'Calories (cal)', factor: 4.184 },
  kilocalorie: { label: 'Kilocalories (kcal)', factor: 4184 },
  btu: { label: 'BTU (IT)', factor: 1055.06 },
  thermUS: { label: 'Therms (US)', factor: 105480e3 },
  thermUK: { label: 'Therms (UK)', factor: 105506e3 },
  wattHour: { label: 'Watt-hours (Wh)', factor: 3600 },
  kilowattHour: { label: 'Kilowatt-hours (kWh)', factor: 3.6e6 },
  quad: { label: 'Quads (10^15 BTU)', factor: 1.055e18 },
}, 'Thermal Energy Converter', 'Convert between thermal energy units.',
  ['thermal', 'energy', 'heat', 'convert'],
  '<p>Converts between thermal energy units through joules.</p>'));

// === 45. ELECTRICAL POWER ===
R('power-electrical', C({
  watt: { label: 'Watts (W)', factor: 1 },
  milliwatt: { label: 'Milliwatts (mW)', factor: 0.001 },
  kilowatt: { label: 'Kilowatts (kW)', factor: 1000 },
  megawatt: { label: 'Megawatts (MW)', factor: 1e6 },
  gigawatt: { label: 'Gigawatts (GW)', factor: 1e9 },
  dbm: { label: 'dBm (log scale, ref 1mW)', factor: 0.001 },
  hp: { label: 'Horsepower (electrical)', factor: 746 },
}, 'Electrical Power Converter', 'Convert between electrical power units.',
  ['electrical', 'power', 'watts', 'convert'],
  '<p>Converts between electrical power units through watts.</p>'));

// === 46. VOLTAGE ===
R('voltage', C({
  volt: { label: 'Volts (V)', factor: 1 },
  millivolt: { label: 'Millivolts (mV)', factor: 0.001 },
  microvolt: { label: 'Microvolts (uV)', factor: 1e-6 },
  kilovolt: { label: 'Kilovolts (kV)', factor: 1000 },
  megavolt: { label: 'Megavolts (MV)', factor: 1e6 },
  abvolt: { label: 'Abvolts (CGS)', factor: 1e-8 },
  statvolt: { label: 'Statvolts (CGS)', factor: 299.792 },
}, 'Voltage Converter', 'Convert between voltage units.',
  ['voltage', 'electric', 'potential', 'convert'],
  '<p>Converts between voltage units through volts.</p>'));

// === 47. CURRENT ===
R('current', C({
  ampere: { label: 'Amperes (A)', factor: 1 },
  milliampere: { label: 'Milliamperes (mA)', factor: 0.001 },
  microampere: { label: 'Microamperes (uA)', factor: 1e-6 },
  nanoampere: { label: 'Nanoamperes (nA)', factor: 1e-9 },
  kiloampere: { label: 'Kiloamperes (kA)', factor: 1000 },
  abampere: { label: 'Abamperes (CGS)', factor: 10 },
  statampere: { label: 'Statamperes (CGS)', factor: 3.3356e-10 },
}, 'Current Converter', 'Convert between electric current units.',
  ['current', 'amperes', 'electric', 'convert'],
  '<p>Converts between electric current units through amperes.</p>'));

// === 48. RESISTANCE ===
R('resistance', C({
  ohm: { label: 'Ohms (Ohm)', factor: 1 },
  milliohm: { label: 'Milliohms (mOhm)', factor: 0.001 },
  microohm: { label: 'Microohms (uOhm)', factor: 1e-6 },
  kiloohm: { label: 'Kilohms (kOhm)', factor: 1000 },
  megaohm: { label: 'Megohms (MOhm)', factor: 1e6 },
  gigaohm: { label: 'Gigohms (GOhm)', factor: 1e9 },
  abohm: { label: 'Abohms (CGS)', factor: 1e-9 },
  statohm: { label: 'Statohms (CGS)', factor: 8.9876e11 },
}, 'Resistance Converter', 'Convert between electrical resistance units.',
  ['resistance', 'ohms', 'electric', 'convert'],
  '<p>Converts between electrical resistance units through ohms.</p>'));

// === 49. CAPACITANCE ===
R('capacitance', C({
  farad: { label: 'Farads (F)', factor: 1 },
  millifarad: { label: 'Millifarads (mF)', factor: 0.001 },
  microfarad: { label: 'Microfarads (uF)', factor: 1e-6 },
  nanofarad: { label: 'Nanofarads (nF)', factor: 1e-9 },
  picofarad: { label: 'Picofarads (pF)', factor: 1e-12 },
  femtofarad: { label: 'Femtofarads (fF)', factor: 1e-15 },
}, 'Capacitance Converter', 'Convert between electrical capacitance units.',
  ['capacitance', 'farads', 'electric', 'convert'],
  '<p>Converts between electrical capacitance units through farads.</p>'));

// === 50. INDUCTANCE ===
R('inductance', C({
  henry: { label: 'Henries (H)', factor: 1 },
  millihenry: { label: 'Millihenries (mH)', factor: 0.001 },
  microhenry: { label: 'Microhenries (uH)', factor: 1e-6 },
  nanohenry: { label: 'Nanohenries (nH)', factor: 1e-9 },
  picohenry: { label: 'Picohenries (pH)', factor: 1e-12 },
}, 'Inductance Converter', 'Convert between electrical inductance units.',
  ['inductance', 'henries', 'electric', 'convert'],
  '<p>Converts between electrical inductance units through henries.</p>'));

// === SPECIFIC CONVERSIONS FROM CATALOG ===

// Kilograms to Pounds
R('kilograms-to-pounds', {
  title: 'Kilograms to Pounds Converter',
  description: 'Convert kilograms to pounds.',
  tags: ['weight', 'kg', 'lb', 'convert'],
  formula: '<p>1 kilogram = 2.20462 pounds</p>',
  fields: [
    { id: 'value', label: 'Kilograms', type: 'number', step: 0.01, placeholder: 'e.g. 70' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var lbs = v.value * 2.20462;
    return { 'Pounds': core.formatNumber(lbs, 4), 'Formula': v.value + ' kg = ' + core.formatNumber(lbs, 4) + ' lb' };
  }
});

// Pounds to Kilograms
R('pounds-to-kilograms', {
  title: 'Pounds to Kilograms Converter',
  description: 'Convert pounds to kilograms.',
  tags: ['weight', 'lb', 'kg', 'convert'],
  formula: '<p>1 pound = 0.453592 kilograms</p>',
  fields: [
    { id: 'value', label: 'Pounds', type: 'number', step: 0.01, placeholder: 'e.g. 150' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var kg = v.value * 0.453592;
    return { 'Kilograms': core.formatNumber(kg, 4), 'Formula': v.value + ' lb = ' + core.formatNumber(kg, 4) + ' kg' };
  }
});

// Acres to Square Feet
R('acres-to-square-feet', {
  title: 'Acres to Square Feet Converter',
  description: 'Convert acres to square feet.',
  tags: ['area', 'acres', 'square feet', 'convert'],
  formula: '<p>1 acre = 43,560 square feet</p>',
  fields: [
    { id: 'value', label: 'Acres', type: 'number', step: 0.01, placeholder: 'e.g. 5' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var sqft = v.value * 43560;
    return { 'Square Feet': core.formatNumber(sqft, 2), 'Formula': v.value + ' acres = ' + core.formatNumber(sqft, 2) + ' sq ft' };
  }
});

// Square Feet to Acres
R('square-feet-to-acres', {
  title: 'Square Feet to Acres Converter',
  description: 'Convert square feet to acres.',
  tags: ['area', 'square feet', 'acres', 'convert'],
  formula: '<p>1 acre = 43,560 square feet</p>',
  fields: [
    { id: 'value', label: 'Square Feet', type: 'number', step: 0.01, placeholder: 'e.g. 43560' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var acres = v.value / 43560;
    return { 'Acres': core.formatNumber(acres, 6), 'Formula': v.value + ' sq ft = ' + core.formatNumber(acres, 6) + ' acres' };
  }
});

// Square Feet to Square Meters
R('square-feet-to-square-meters', {
  title: 'Square Feet to Square Meters Converter',
  description: 'Convert square feet to square meters.',
  tags: ['area', 'square feet', 'square meters', 'convert'],
  formula: '<p>1 square foot = 0.092903 square meters</p>',
  fields: [
    { id: 'value', label: 'Square Feet', type: 'number', step: 0.01, placeholder: 'e.g. 1000' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var sqm = v.value * 0.092903;
    return { 'Square Meters': core.formatNumber(sqm, 4), 'Formula': v.value + ' sq ft = ' + core.formatNumber(sqm, 4) + ' sq m' };
  }
});

// Square Meters to Square Feet
R('square-meters-to-square-feet', {
  title: 'Square Meters to Square Feet Converter',
  description: 'Convert square meters to square feet.',
  tags: ['area', 'square meters', 'square feet', 'convert'],
  formula: '<p>1 square meter = 10.7639 square feet</p>',
  fields: [
    { id: 'value', label: 'Square Meters', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var sqft = v.value * 10.7639;
    return { 'Square Feet': core.formatNumber(sqft, 4), 'Formula': v.value + ' sq m = ' + core.formatNumber(sqft, 4) + ' sq ft' };
  }
});

// Celsius to Fahrenheit
R('celsius-to-fahrenheit', {
  title: 'Celsius to Fahrenheit Converter',
  description: 'Convert Celsius to Fahrenheit.',
  tags: ['temperature', 'celsius', 'fahrenheit', 'convert'],
  formula: '<p>F = C x 9/5 + 32</p>',
  fields: [
    { id: 'value', label: 'Celsius', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var f = v.value * 9 / 5 + 32;
    return { 'Fahrenheit': core.formatNumber(f, 4) + ' F', 'Formula': v.value + ' C = ' + core.formatNumber(f, 4) + ' F' };
  }
});

// Fahrenheit to Celsius
R('fahrenheit-to-celsius', {
  title: 'Fahrenheit to Celsius Converter',
  description: 'Convert Fahrenheit to Celsius.',
  tags: ['temperature', 'fahrenheit', 'celsius', 'convert'],
  formula: '<p>C = (F - 32) x 5/9</p>',
  fields: [
    { id: 'value', label: 'Fahrenheit', type: 'number', step: 0.01, placeholder: 'e.g. 212' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var c = (v.value - 32) * 5 / 9;
    return { 'Celsius': core.formatNumber(c, 4) + ' C', 'Formula': v.value + ' F = ' + core.formatNumber(c, 4) + ' C' };
  }
});

// Celsius to Kelvin
R('celsius-to-kelvin', {
  title: 'Celsius to Kelvin Converter',
  description: 'Convert Celsius to Kelvin.',
  tags: ['temperature', 'celsius', 'kelvin', 'convert'],
  formula: '<p>K = C + 273.15</p>',
  fields: [
    { id: 'value', label: 'Celsius', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var k = v.value + 273.15;
    return { 'Kelvin': core.formatNumber(k, 4) + ' K', 'Formula': v.value + ' C = ' + core.formatNumber(k, 4) + ' K' };
  }
});

// Kelvin to Celsius
R('kelvin-to-celsius', {
  title: 'Kelvin to Celsius Converter',
  description: 'Convert Kelvin to Celsius.',
  tags: ['temperature', 'kelvin', 'celsius', 'convert'],
  formula: '<p>C = K - 273.15</p>',
  fields: [
    { id: 'value', label: 'Kelvin', type: 'number', step: 0.01, placeholder: 'e.g. 373.15' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var c = v.value - 273.15;
    return { 'Celsius': core.formatNumber(c, 4) + ' C', 'Formula': v.value + ' K = ' + core.formatNumber(c, 4) + ' C' };
  }
});

// Fahrenheit to Kelvin
R('fahrenheit-to-kelvin', {
  title: 'Fahrenheit to Kelvin Converter',
  description: 'Convert Fahrenheit to Kelvin.',
  tags: ['temperature', 'fahrenheit', 'kelvin', 'convert'],
  formula: '<p>K = (F - 32) x 5/9 + 273.15</p>',
  fields: [
    { id: 'value', label: 'Fahrenheit', type: 'number', step: 0.01, placeholder: 'e.g. 212' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var k = (v.value - 32) * 5 / 9 + 273.15;
    return { 'Kelvin': core.formatNumber(k, 4) + ' K', 'Formula': v.value + ' F = ' + core.formatNumber(k, 4) + ' K' };
  }
});

// Kelvin to Fahrenheit
R('kelvin-to-fahrenheit', {
  title: 'Kelvin to Fahrenheit Converter',
  description: 'Convert Kelvin to Fahrenheit.',
  tags: ['temperature', 'kelvin', 'fahrenheit', 'convert'],
  formula: '<p>F = (K - 273.15) x 9/5 + 32</p>',
  fields: [
    { id: 'value', label: 'Kelvin', type: 'number', step: 0.01, placeholder: 'e.g. 373.15' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var f = (v.value - 273.15) * 9 / 5 + 32;
    return { 'Fahrenheit': core.formatNumber(f, 4) + ' F', 'Formula': v.value + ' K = ' + core.formatNumber(f, 4) + ' F' };
  }
});

// Celsius to Rankine
R('celsius-to-rankine', {
  title: 'Celsius to Rankine Converter',
  description: 'Convert Celsius to Rankine.',
  tags: ['temperature', 'celsius', 'rankine', 'convert'],
  formula: '<p>R = (C + 273.15) x 9/5</p>',
  fields: [
    { id: 'value', label: 'Celsius', type: 'number', step: 0.01, placeholder: 'e.g. 100' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var r = (v.value + 273.15) * 9 / 5;
    return { 'Rankine': core.formatNumber(r, 4) + ' R', 'Formula': v.value + ' C = ' + core.formatNumber(r, 4) + ' R' };
  }
});

// Fahrenheit to Rankine
R('fahrenheit-to-rankine', {
  title: 'Fahrenheit to Rankine Converter',
  description: 'Convert Fahrenheit to Rankine.',
  tags: ['temperature', 'fahrenheit', 'rankine', 'convert'],
  formula: '<p>R = F + 459.67</p>',
  fields: [
    { id: 'value', label: 'Fahrenheit', type: 'number', step: 0.01, placeholder: 'e.g. 212' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var r = v.value + 459.67;
    return { 'Rankine': core.formatNumber(r, 4) + ' R', 'Formula': v.value + ' F = ' + core.formatNumber(r, 4) + ' R' };
  }
});

// Kelvin to Rankine
R('kelvin-to-rankine', {
  title: 'Kelvin to Rankine Converter',
  description: 'Convert Kelvin to Rankine.',
  tags: ['temperature', 'kelvin', 'rankine', 'convert'],
  formula: '<p>R = K x 9/5</p>',
  fields: [
    { id: 'value', label: 'Kelvin', type: 'number', step: 0.01, placeholder: 'e.g. 373.15' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var r = v.value * 9 / 5;
    return { 'Rankine': core.formatNumber(r, 4) + ' R', 'Formula': v.value + ' K = ' + core.formatNumber(r, 4) + ' R' };
  }
});

// CM to Inches
R('cm-to-inches', {
  title: 'Centimeters to Inches Converter',
  description: 'Convert centimeters to inches.',
  tags: ['length', 'cm', 'inches', 'convert'],
  formula: '<p>1 inch = 2.54 centimeters</p>',
  fields: [
    { id: 'value', label: 'Centimeters', type: 'number', step: 0.01, placeholder: 'e.g. 30' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var inches = v.value / 2.54;
    return { 'Inches': core.formatNumber(inches, 4), 'Formula': v.value + ' cm = ' + core.formatNumber(inches, 4) + ' in' };
  }
});

// Inches to CM
R('inches-to-cm', {
  title: 'Inches to Centimeters Converter',
  description: 'Convert inches to centimeters.',
  tags: ['length', 'inches', 'cm', 'convert'],
  formula: '<p>1 inch = 2.54 centimeters</p>',
  fields: [
    { id: 'value', label: 'Inches', type: 'number', step: 0.01, placeholder: 'e.g. 12' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var cm = v.value * 2.54;
    return { 'Centimeters': core.formatNumber(cm, 4), 'Formula': v.value + ' in = ' + core.formatNumber(cm, 4) + ' cm' };
  }
});

// Hours to Minutes
R('hours-to-minutes', {
  title: 'Hours to Minutes Converter',
  description: 'Convert hours to minutes.',
  tags: ['time', 'hours', 'minutes', 'convert'],
  formula: '<p>1 hour = 60 minutes</p>',
  fields: [
    { id: 'value', label: 'Hours', type: 'number', step: 0.01, placeholder: 'e.g. 2.5' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var mins = v.value * 60;
    return { 'Minutes': core.formatNumber(mins, 2), 'Formula': v.value + ' hours = ' + core.formatNumber(mins, 2) + ' minutes' };
  }
});

// Minutes to Hours
R('minutes-to-hours', {
  title: 'Minutes to Hours Converter',
  description: 'Convert minutes to hours.',
  tags: ['time', 'minutes', 'hours', 'convert'],
  formula: '<p>1 hour = 60 minutes</p>',
  fields: [
    { id: 'value', label: 'Minutes', type: 'number', step: 0.01, placeholder: 'e.g. 90' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var hrs = v.value / 60;
    var wholeHrs = Math.floor(hrs);
    var remainingMins = Math.round((hrs - wholeHrs) * 60);
    return {
      'Hours (decimal)': core.formatNumber(hrs, 4),
      'Hours and Minutes': wholeHrs + ' hours ' + remainingMins + ' minutes',
      'Formula': v.value + ' minutes = ' + core.formatNumber(hrs, 4) + ' hours',
    };
  }
});

// Hours to Days
R('hours-to-days', {
  title: 'Hours to Days Converter',
  description: 'Convert hours to days.',
  tags: ['time', 'hours', 'days', 'convert'],
  formula: '<p>1 day = 24 hours</p>',
  fields: [
    { id: 'value', label: 'Hours', type: 'number', step: 0.01, placeholder: 'e.g. 48' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var days = v.value / 24;
    var wholeDays = Math.floor(days);
    var remainingHrs = Math.round((days - wholeDays) * 24);
    return {
      'Days (decimal)': core.formatNumber(days, 4),
      'Days and Hours': wholeDays + ' days ' + remainingHrs + ' hours',
      'Formula': v.value + ' hours = ' + core.formatNumber(days, 4) + ' days',
    };
  }
});

// Momentum
R('momentum', C({
  kgMs: { label: 'kg-m/s', factor: 1 },
  gCmS: { label: 'g-cm/s', factor: 0.00001 },
  lbFtS: { label: 'lb-ft/s', factor: 0.138255 },
  newtonSec: { label: 'N-s', factor: 1 },
  poundalSec: { label: 'poundal-s', factor: 0.138255 },
}, 'Momentum Converter', 'Convert between momentum units.',
  ['momentum', 'physics', 'convert'],
  '<p>Converts between momentum units through kg-m/s.</p>'));

// Decimal Degrees to DMS
R('convert-decimal-degrees-to-degrees-minutes-seconds', {
  title: 'Decimal Degrees to DMS Converter',
  description: 'Convert decimal degrees to degrees, minutes, seconds.',
  tags: ['angle', 'degrees', 'DMS', 'convert'],
  formula: '<p>Converts decimal degrees to degrees-minutes-seconds format.</p>',
  fields: [
    { id: 'value', label: 'Decimal Degrees', type: 'number', step: 0.0001, placeholder: 'e.g. 40.7128' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a value' };
    var absVal = Math.abs(v.value);
    var deg = Math.floor(absVal);
    var minFloat = (absVal - deg) * 60;
    var min = Math.floor(minFloat);
    var sec = ((minFloat - min) * 60).toFixed(2);
    var dir = v.value < 0 ? 'S/W' : 'N/E';
    return {
      'Degrees': deg,
      'Minutes': min,
      'Seconds': sec,
      'DMS': deg + 'deg ' + min + '\'' + sec + '"' + ' ' + dir,
      'Formula': v.value + ' decimal deg = ' + deg + 'deg ' + min + '\'' + sec + '"',
    };
  }
});

// Height: CM to Feet/Inches
R('height-cm-to-in-and-ft', {
  title: 'Height Converter (cm to ft/in)',
  description: 'Convert height from centimeters to feet and inches.',
  tags: ['height', 'cm', 'feet', 'inches', 'convert'],
  formula: '<p>1 inch = 2.54 cm, 1 foot = 12 inches</p>',
  fields: [
    { id: 'value', label: 'Centimeters', type: 'number', step: 0.1, placeholder: 'e.g. 175' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var totalInches = v.value / 2.54;
    var feet = Math.floor(totalInches / 12);
    var inches = (totalInches % 12).toFixed(1);
    return {
      'Feet': feet,
      'Inches': inches,
      'Height': feet + '\'' + inches + '"',
      'Total Inches': core.formatNumber(totalInches, 2),
      'Formula': v.value + ' cm = ' + feet + ' ft ' + inches + ' in',
    };
  }
});

// Height: Feet/Inches to CM
R('height-ft-and-in-to-cm', {
  title: 'Height Converter (ft/in to cm)',
  description: 'Convert height from feet and inches to centimeters.',
  tags: ['height', 'feet', 'inches', 'cm', 'convert'],
  formula: '<p>1 inch = 2.54 cm</p>',
  fields: [
    { id: 'feet', label: 'Feet', type: 'number', step: 1, min: 0, placeholder: 'e.g. 5', half: true },
    { id: 'inches', label: 'Inches', type: 'number', step: 0.1, min: 0, max: 11.9, placeholder: 'e.g. 9', half: true },
  ],
  calculate: function(v) {
    var totalInches = (v.feet || 0) * 12 + (v.inches || 0);
    var cm = totalInches * 2.54;
    return {
      'Centimeters': core.formatNumber(cm, 2),
      'Meters': core.formatNumber(cm / 100, 4),
      'Formula': v.feet + ' ft ' + v.inches + ' in = ' + core.formatNumber(cm, 2) + ' cm',
    };
  }
});

// Height: FT/IN to CM (combined)
R('heightftcm', {
  title: 'Height Converter (ft/in to cm)',
  description: 'Convert height between feet/inches and centimeters.',
  tags: ['height', 'feet', 'cm', 'convert'],
  formula: '<p>1 inch = 2.54 cm</p>',
  fields: [
    { id: 'feet', label: 'Feet', type: 'number', step: 1, min: 0, placeholder: 'e.g. 5', half: true },
    { id: 'inches', label: 'Inches', type: 'number', step: 0.1, min: 0, max: 11.9, placeholder: 'e.g. 9', half: true },
  ],
  calculate: function(v) {
    var totalInches = (v.feet || 0) * 12 + (v.inches || 0);
    var cm = totalInches * 2.54;
    return {
      'Centimeters': core.formatNumber(cm, 2),
      'Meters': core.formatNumber(cm / 100, 4),
      'Formula': v.feet + '\'' + v.inches + '" = ' + core.formatNumber(cm, 2) + ' cm',
    };
  }
});

// Meters to Feet
R('meters-to-feet', {
  title: 'Meters to Feet Converter',
  description: 'Convert meters to feet and inches.',
  tags: ['length', 'meters', 'feet', 'convert'],
  formula: '<p>1 meter = 3.28084 feet</p>',
  fields: [
    { id: 'value', label: 'Meters', type: 'number', step: 0.01, placeholder: 'e.g. 1.8' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var totalFeet = v.value * 3.28084;
    var feet = Math.floor(totalFeet);
    var inches = (totalFeet % 1 * 12).toFixed(1);
    return {
      'Total Feet': core.formatNumber(totalFeet, 4),
      'Feet': feet,
      'Inches': inches,
      'Formula': v.value + ' m = ' + feet + ' ft ' + inches + ' in',
    };
  }
});

// Metric Units
R('metricunits', C({
  km: { label: 'Kilometers (km)', factor: 1000 },
  m: { label: 'Meters (m)', factor: 1 },
  cm: { label: 'Centimeters (cm)', factor: 0.01 },
  mm: { label: 'Millimeters (mm)', factor: 0.001 },
  um: { label: 'Micrometers (um)', factor: 1e-6 },
  nm: { label: 'Nanometers (nm)', factor: 1e-9 },
}, 'Metric Units Converter', 'Convert between metric units across different dimensions.',
  ['metric', 'units', 'convert'],
  '<p>Converts between metric units using standard SI prefixes.</p>'));

// Troy Weight
R('weighttroy', C({
  grain: { label: 'Grains (gr)', factor: 1 },
  pennyweight: { label: 'Pennyweights (dwt)', factor: 24 },
  troyOunce: { label: 'Troy Ounces (oz t)', factor: 480 },
  troyPound: { label: 'Troy Pounds (lb t)', factor: 5760 },
}, 'Troy Weight Converter', 'Convert between troy weight units used for precious metals.',
  ['troy', 'weight', 'precious metals', 'convert'],
  '<p>Converts between troy weight units through grains. 1 troy oz = 480 grains.</p>'));

// Avoirdupois Weight
R('weightavoirdupois', C({
  grain: { label: 'Grains (gr)', factor: 1 },
  dram: { label: 'Drams (dr)', factor: 27.3438 },
  ounce: { label: 'Ounces (oz)', factor: 437.5 },
  pound: { label: 'Pounds (lb)', factor: 7000 },
  stone: { label: 'Stones (st)', factor: 98000 },
  quarter: { label: 'Quarters (qr)', factor: 350000 },
  hundredweight: { label: 'Hundredweight (cwt)', factor: 700000 },
  longTon: { label: 'Long Tons', factor: 16800000 },
}, 'Avoirdupois Weight Converter', 'Convert between avoirdupois weight units.',
  ['avoirdupois', 'weight', 'convert'],
  '<p>Converts between avoirdupois weight units through grains.</p>'));

// Cubic Feet to Cubic Yards
R('cubic-feet-to-cubic-yards', {
  title: 'Cubic Feet to Cubic Yards Converter',
  description: 'Convert cubic feet to cubic yards.',
  tags: ['volume', 'cubic feet', 'cubic yards', 'convert'],
  formula: '<p>1 cubic yard = 27 cubic feet</p>',
  fields: [
    { id: 'value', label: 'Cubic Feet', type: 'number', step: 0.01, placeholder: 'e.g. 54' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var cy = v.value / 27;
    return { 'Cubic Yards': core.formatNumber(cy, 4), 'Formula': v.value + ' cu ft = ' + core.formatNumber(cy, 4) + ' cu yd' };
  }
});

// Cubic Yards to Cubic Feet
R('cubic-yards-to-cubic-feet', {
  title: 'Cubic Yards to Cubic Feet Converter',
  description: 'Convert cubic yards to cubic feet.',
  tags: ['volume', 'cubic yards', 'cubic feet', 'convert'],
  formula: '<p>1 cubic yard = 27 cubic feet</p>',
  fields: [
    { id: 'value', label: 'Cubic Yards', type: 'number', step: 0.01, placeholder: 'e.g. 2' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var cf = v.value * 27;
    return { 'Cubic Feet': core.formatNumber(cf, 4), 'Formula': v.value + ' cu yd = ' + core.formatNumber(cf, 4) + ' cu ft' };
  }
});

// Numbers to Words
R('numberstowords', {
  title: 'Numbers to Words Converter',
  description: 'Convert numbers to their English word representation.',
  tags: ['numbers', 'words', 'convert'],
  formula: '<p>Converts a number into its English word representation.</p>',
  fields: [
    { id: 'value', label: 'Number', type: 'number', step: 1, min: 0, max: 999999999999, placeholder: 'e.g. 12345' },
  ],
  calculate: function(v) {
    if (v.value === undefined) return { error: 'Enter a number' };
    var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    function numToWords(n) {
      if (n === 0) return 'zero';
      if (n < 0) return 'negative ' + numToWords(-n);
      var result = '';
      if (n >= 1e12) { result += numToWords(Math.floor(n / 1e12)) + ' trillion '; n %= 1e12; }
      if (n >= 1e9) { result += numToWords(Math.floor(n / 1e9)) + ' billion '; n %= 1e9; }
      if (n >= 1e6) { result += numToWords(Math.floor(n / 1e6)) + ' million '; n %= 1e6; }
      if (n >= 1000) { result += numToWords(Math.floor(n / 1000)) + ' thousand '; n %= 1000; }
      if (n >= 100) { result += ones[Math.floor(n / 100)] + ' hundred '; n %= 100; }
      if (n >= 20) { result += tens[Math.floor(n / 10)]; n %= 10; if (n > 0) result += '-' + ones[n]; }
      else if (n > 0) { result += ones[n]; }
      return result.trim();
    }
    return {
      'Words': numToWords(Math.round(v.value)),
      'Formula': v.value + ' = ' + numToWords(Math.round(v.value)),
    };
  }
});

// Digits to Words (string of digits)
R('digits-to-words', {
  title: 'Digits to Words Converter',
  description: 'Convert a string of digits into individual word representations.',
  tags: ['digits', 'words', 'convert'],
  formula: '<p>Converts each digit in a number string to its word form.</p>',
  fields: [
    { id: 'value', label: 'Digits', type: 'text', placeholder: 'e.g. 12345' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter digits' };
    var digits = v.value.toString().replace(/[^0-9]/g, '');
    if (!digits) return { error: 'Enter valid digits' };
    var words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    var result = digits.split('').map(function(d) { return words[parseInt(d)]; }).join(' ');
    return { 'Words': result, 'Formula': v.value + ' = ' + result };
  }
});

// Minutes to Decimal
R('minutes-to-decimal', {
  title: 'Minutes to Decimal Converter',
  description: 'Convert minutes to decimal hours.',
  tags: ['time', 'minutes', 'decimal', 'convert'],
  formula: '<p>Divides minutes by 60 to get decimal hours.</p>',
  fields: [
    { id: 'value', label: 'Minutes', type: 'number', step: 0.01, placeholder: 'e.g. 45' },
  ],
  calculate: function(v) {
    if (!v.value) return { error: 'Enter a value' };
    var decimal = v.value / 60;
    return { 'Decimal Hours': core.formatNumber(decimal, 4), 'Formula': v.value + ' minutes = ' + core.formatNumber(decimal, 4) + ' hours' };
  }
});

})(calculatorRegistry);
