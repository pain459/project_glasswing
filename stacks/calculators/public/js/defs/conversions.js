// Conversion calculators
(function(reg) {
const R = reg.register.bind(reg, 'conversions');

// === GENERIC CONVERSION HELPER ===
// Returns a calculator definition object for a standard factor-based converter
function C(units, title, desc, tags, formula, extra) {
  var opts = Object.keys(units).map(function(k) {
    return { value: k, label: units[k].label || k };
  });
  return {
    title: title,
    description: desc,
    tags: tags || [],
    formula: formula || '<p>Converts between units through a common base unit.</p>',
    background: extra && extra.background,
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
  '<p>Converts between metric and imperial length units through the base unit of meters.</p>',
  { background: '<p>Length is the oldest measured quantity: the metre began as one ten-millionth of the distance from the equator to the pole and since 1983 is defined by the speed of light. The inch was fixed at exactly 25.4 mm by the 1959 international yard and pound agreement, which is why the foot is 0.3048 m and the mile 1609.344 m. A nautical mile is one minute of latitude, settled at 1852 m in 1929 because it maps directly onto chart coordinates.</p>' }));

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
  '<p>Converts between metric and imperial mass units through the base unit of kilograms.</p>',
  { background: '<p>Mass is measured in kilograms, the last SI base unit still defined by an artefact until 2019, when it was redefined through the Planck constant. Imperial weights come from the avoirdupois system: 16 ounces to a pound, 14 pounds to a stone, 2000 pounds to a US short ton and 2240 to a UK long ton. The international pound has been exactly 0.45359237 kg since 1959.</p>' }));

// === 3. TEMPERATURE ===
R('temperature', {
  title: 'Temperature Converter',
  description: 'Convert between Celsius, Fahrenheit, Kelvin, and Rankine.',
  tags: ['temperature', 'celsius', 'fahrenheit', 'kelvin'],
  formula: '<p>Temperature conversions use offset-based formulas rather than simple multiplication.</p>',
  background: '<p>Celsius and Fahrenheit are both relative scales tied to the freezing and boiling points of water. Anders Celsius defined 0 and 100 in 1742 and Carl Linnaeus reversed them to the orientation used today, while Daniel Fahrenheit built his 1724 scale around a brine-ice mixture and body temperature, leaving 180 degrees between freezing and boiling. Kelvin shifts the Celsius scale so zero is absolute zero, and Rankine does the same for Fahrenheit degrees.</p>',
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
  '<p>Converts between metric and imperial area units through the base unit of square meters.</p>',
  { background: '<p>Area multiplies length by length, so a factor that holds for feet does not hold for square feet — one square foot is 0.092903 m², not 0.3048. The acre is 43,560 square feet, historically the strip a team of oxen could plough in a day, and the hectare is a square 100 m on a side. Land registries still use acres and square miles, while science and most of the world use m² and km².</p>' }));

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
  '<p>Converts between metric and imperial volume units through the base unit of liters.</p>',
  { background: '<p>Volume units diverge because liquid measures were standardised locally long before they were standardised nationally. The US gallon descends from the 1707 Queen Anne wine gallon of 231 cubic inches (3.785411784 L), while the imperial gallon of 1824 was defined as the volume of 10 pounds of water (4.54609 L), about 20 percent larger. The US fluid ounce is 1/128 of its gallon and the imperial fluid ounce 1/160 of its, so they differ even more than the gallons do.</p>' }));

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
  '<p>Converts between common cooking measurements used in recipes.</p>',
  { background: '<p>Recipe measures are volume measures, and the US cup is 8 US fluid ounces (236.588 mL) while the metric cup used in Australia and much of Europe is 250 mL. Converting a volume to grams only works when you know the density: the gram figure here assumes water, so flour, sugar and rice all weigh noticeably less per cup. Older British recipes may use imperial pints and gills, which are larger than their US namesakes.</p>' }));

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
  '<p>Converts between decimal (SI) storage units: 1 KB = 1000 B, 1 MB = 1000 KB, etc.</p>',
  { background: '<p>Storage is quoted with decimal SI prefixes: 1 KB is 1000 bytes and 1 GB is 10⁹ bytes, which is how drive manufacturers and the SI standard define them. Operating systems often divide by 1024 instead, so a 1 TB drive shows as roughly 931 GB in Windows. The gap grows with each prefix because it is a ratio of 1000/1024 raised to the power of the prefix.</p>' }));

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
  '<p>Converts between density units through the base unit of kg/m3.</p>',
  { background: '<p>Density is mass per unit volume, with kg/m³ as the SI unit and water near 1000 kg/m³ at room temperature, a handy reference for judging a material. Imperial density units combine avoirdupois mass with imperial volume, so lb/ft³ mixes a 0.4536 kg pound with a 0.02832 m³ cubic foot. The slug is the coherent mass unit of the foot-pound-second system, equal to about 14.59 kg.</p>' }));

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
  '<p>Converts between speed units through the base unit of meters per second.</p>',
  { background: '<p>Speed is distance per time, and m/s is the SI expression of it. Road speeds use km/h almost everywhere and mph in the US and UK, where the mile is the 1609.344 m statute mile. A knot is one nautical mile per hour, convenient at sea because it matches minutes of latitude, and Mach is a ratio to the local speed of sound, about 340.3 m/s in 15 °C air at sea level but lower at altitude.</p>' }));

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
  '<p>Converts between time units through the base unit of seconds.</p>',
  { background: '<p>The second is the SI base unit of time, defined since 1967 by the caesium-133 hyperfine transition and refined in 2019. Days, hours and minutes come from Babylonian sexagesimal counting and the 24-hour Egyptian day, and none of them divide the second evenly beyond 60. The month and year used here are averages — 30.44 days and the Julian 365.25-day year — so calendar dates will not line up exactly.</p>' }));

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
  '<p>Converts between pressure units through the base unit of pascals.</p>',
  { background: '<p>Pressure is force per area, so the pascal is one newton per square metre, a very small unit that makes hectopascals and kilopascals convenient for weather and engineering. The atmosphere was defined as 101,325 Pa, exactly 760 mmHg, and the bar as 100,000 Pa, a difference of about 1.3 percent that matters in calibration. PSI is pounds-force per square inch and remains standard for tyres, hydraulics and gas lines in the US.</p>' }));

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
  '<p>Converts between energy units through the base unit of joules.</p>',
  { background: '<p>Energy is force times distance, so the joule is one newton-metre, and every other unit here is a legacy measure of heat or work. The calorie is the heat needed to raise one gram of water by one degree Celsius (4.184 J thermochemical), the BTU does the same for one pound of water by one degree Fahrenheit, and the kilowatt-hour is simply 3.6 megajoules, which is why electricity bills use it. The electron volt is the energy gained by one electron across one volt, about 1.602 × 10⁻¹⁹ J, and is used at atomic and particle scales.</p>' }));

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
  '<p>Converts between power units through the base unit of watts.</p>',
  { background: '<p>Power is energy per unit time, so the watt is one joule per second and the kilowatt-hour is power sustained for an hour. James Watt defined horsepower as 550 foot-pounds per second, about 745.7 W, to compare steam engines with draft horses; the metric horsepower is 75 kgf·m/s, or 735.5 W, and continental car specs usually mean the smaller metric figure. Electrical horsepower is a rounded 746 W.</p>' }));

// === 14. FREQUENCY ===
R('frequency', C({
  hertz: { label: 'Hertz (Hz)', factor: 1 },
  kilohertz: { label: 'Kilohertz (kHz)', factor: 1000 },
  megahertz: { label: 'Megahertz (MHz)', factor: 1e6 },
  gigahertz: { label: 'Gigahertz (GHz)', factor: 1e9 },
  rpm: { label: 'Revolutions/min (RPM)', factor: 1 / 60 },
}, 'Frequency Converter', 'Convert between frequency units.',
  ['frequency', 'hertz', 'convert'],
  '<p>Converts between frequency units through the base unit of hertz.</p>',
  { background: '<p>Frequency counts repetitions per second, and the hertz — one cycle per second, named after Heinrich Hertz — replaced cycles per second in 1960. Radio, clocks and processors use kHz, MHz and GHz in decimal steps of 1000. RPM is a rotational rate rather than an oscillation, and one revolution per minute is 1/60 Hz, so it only behaves like a frequency when one rotating feature passes a sensor per turn.</p>' }));

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
  '<p>Converts between angle units through the base unit of degrees.</p>',
  { background: '<p>Angles are dimensionless ratios, so the units are conventions. The degree splits a turn into 360 parts, a Babylonian base-60 habit, while the radian is the natural measure — the arc length equal to the radius — and there are 2π radians in a turn, which is why calculus and physics prefer it. The gradian divides a right angle into 100 parts for decimal surveying, and the NATO mil divides a turn into 6400 for artillery sighting.</p>' }));

// === 16. FUEL ECONOMY ===
R('fuel-economy', {
  title: 'Fuel Economy Converter',
  description: 'Convert between fuel economy units (MPG, L/100km).',
  tags: ['fuel', 'economy', 'mpg', 'liters'],
  formula: '<p>Converts between miles per gallon and liters per 100 km. Note: higher MPG = better, higher L/100km = worse.</p>',
  background: '<p>Fuel economy is distance per volume, which makes it inversely proportional to consumption: 30 mpg is about 7.84 L/100 km, and improving a low figure saves far more fuel than improving a high one. US and imperial MPG differ by about 20 percent because the gallons differ — 3.785 L against 4.546 L — so the conversion constants 235.215 and 282.481 encode that gap. L/100km is the European convention and km/L is common in Asia and Latin America.</p>',
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
  '<p>Converts between data transfer rate units through the base unit of bits per second.</p>',
  { background: '<p>Network rates are quoted in bits per second while files are sized in bytes, and one byte is eight bits, so a 100 Mbps link carries at most 12.5 MB/s of payload. Prefixes here are decimal (1 Mbps = 10⁶ bps) because that is how link standards are written. Real throughput is lower still once packet headers, framing and protocol overhead are counted, so treat byte-per-second results as an upper bound.</p>' }));

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
  '<p>Converts between surveying units like chains, furlongs, rods, and links through meters.</p>',
  { background: '<p>These are the units of the Gunter chain, a 66-foot surveyor tool of 1620 made of 100 links, which is why a chain, a furlong of 10 chains and an acre of one chain by one furlong fit together so neatly. A fathom of six feet measured depth on sounding lines, and a league was roughly an hour of walking. The parsec and light-year belong to astronomy: a parsec is the distance at which one astronomical unit subtends one arcsecond, about 3.26 light-years, and the light-year is the distance light covers in a Julian year.</p>' }));

// === 19. APOTHECARY MASS ===
R('mass-apothecary', C({
  grain: { label: 'Grains (gr)', factor: 1 },
  scruple: { label: 'Scruples (s)', factor: 20 },
  dram: { label: 'Drams (dr)', factor: 60 },
  ounce: { label: 'Apothecary Ounces (oz ap)', factor: 480 },
  pound: { label: 'Apothecary Pounds (lb ap)', factor: 5760 },
}, 'Apothecary Mass Converter', 'Convert between apothecary weight units.',
  ['apothecary', 'mass', 'weight', 'historical'],
  '<p>Converts between historical apothecary weight units through grains.</p>',
  { background: '<p>The apothecary system was the pharmacists\' counterpart to troy weight, used in Britain and the US into the twentieth century and now almost entirely replaced by metric doses. It shares the 64.79891 mg grain with troy weight, then counts 20 grains to a scruple, 60 to a dram, 480 to an apothecary ounce and 5760 to a pound. The symbols oz ap and lb ap distinguish it from the heavier avoirdupois ounce and pound.</p>' }));

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
  '<p>Converts between British Imperial volume units through fluid ounces.</p>',
  { background: '<p>Imperial volume was fixed by the 1824 Weights and Measures Act, which defined the gallon as the volume of ten pounds of distilled water at 62 °F — 4.54609 litres. The imperial fluid ounce is 1/160 of that gallon (28.413 mL) rather than the US 1/128, so a British pint is 20 fluid ounces and a US pint 16. The gill, peck and bushel are subdivisions and multiples of the same gallon and survive mainly in pub measures and grain trading.</p>' }));

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
  '<p>Converts between British Imperial area units through square feet.</p>',
  { background: '<p>Imperial area is built from the square foot: 144 square inches, 9 square feet to the square yard and 43,560 square feet to the acre. A rood is a quarter acre and a perch is a square rod, so 160 perches make an acre — the units are designed around the chain and rod for field measurement. The township of 36 square miles comes from the US Public Land Survey System, which laid out the Midwest in six-mile squares.</p>' }));

// === 22. ABSOLUTE TEMPERATURE ===
R('temperature-absolute', {
  title: 'Absolute Temperature Converter',
  description: 'Convert between absolute temperature scales including Delisle, Reaumur, and Newton.',
  tags: ['temperature', 'absolute', 'historical', 'convert'],
  formula: '<p>Converts between absolute and historical temperature scales.</p>',
  background: '<p>Absolute scales start at absolute zero, the point where molecular motion cannot be removed further. Kelvin keeps the Celsius degree size but shifts zero to −273.15 °C, and since 2019 it is defined through the Boltzmann constant; Rankine does the same for the Fahrenheit degree, so 0 °R is −459.67 °F. The others are eighteenth-century rivals: Réaumur put 80 degrees between freezing and boiling, Delisle counted downward from boiling to freezing, Newton proposed 33 degrees and Rømer used a 60-degree scale offset by 7.5 degrees.</p>',
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
  '<p>Converts between force units through the base unit of newtons.</p>',
  { background: '<p>Force is mass times acceleration, so the newton is one kilogram-metre per second squared. The pound-force is the weight of one avoirdupois pound under standard gravity, 9.80665 m/s², which is why 1 lbf is 4.44822 N and not simply the mass conversion. The dyne and the kilogram-force are CGS and gravitational-system holdovers, and the poundal is the force that accelerates one pound at one foot per second squared.</p>' }));

// === 24. TORQUE ===
R('torque', C({
  nm: { label: 'Newton-meters (Nm)', factor: 1 },
  ftLb: { label: 'Foot-pounds (ft-lb)', factor: 1.35582 },
  inLb: { label: 'Inch-pounds (in-lb)', factor: 0.112985 },
  kgfCm: { label: 'kgf-cm', factor: 0.0980665 },
  kgfM: { label: 'kgf-m', factor: 9.80665 },
}, 'Torque Converter', 'Convert between torque units.',
  ['torque', 'moment', 'convert'],
  '<p>Converts between torque units through the base unit of newton-meters.</p>',
  { background: '<p>Torque is force applied at a distance from an axis, so its units are force times length and share dimensions with energy even though the two are not interchangeable — a newton-metre of torque does no work unless something rotates. Foot-pounds and inch-pounds are standard on US fasteners and engine specs, while kgf·cm and kgf·m appear in Japanese and older European service manuals. Always check whether a published figure is a peak or a sustained rating before comparing engines or bolts.</p>' }));

// === 25. ACCELERATION ===
R('acceleration', C({
  ms2: { label: 'm/s2', factor: 1 },
  fps2: { label: 'ft/s2', factor: 0.3048 },
  g: { label: 'G (standard gravity)', factor: 9.80665 },
  gal: { label: 'Gal (cm/s2)', factor: 0.01 },
}, 'Acceleration Converter', 'Convert between acceleration units.',
  ['acceleration', 'convert'],
  '<p>Converts between acceleration units through the base unit of m/s2.</p>',
  { background: '<p>Acceleration is the rate of change of velocity, measured in metres per second squared. The g used in engineering and physiology is standard gravity, fixed at 9.80665 m/s² by the 1901 CGPM, not the local value, which varies by a few tenths of a percent with latitude and altitude. The gal, one centimetre per second squared, is the CGS unit used in gravimetry and geodesy and is unrelated to the gallon.</p>' }));

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
  '<p>Converts between volumetric flow rate units through liters per second.</p>',
  { background: '<p>Volumetric flow is volume per time, and the litre per second is the metric baseline. Gallons per minute is the US plumbing, pump and irrigation unit, derived from the 3.785 L US gallon, while cubic feet per second is used in hydrology and water rights because it suits open channels and rivers. UK practice may still quote imperial gallons per minute, which are about 20 percent larger.</p>' }));

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
  '<p>Converts between radiation absorbed dose units through grays.</p>',
  { background: '<p>The gray measures absorbed dose — energy deposited per kilogram of tissue — and replaced the rad, with 1 Gy equal to 100 rad. The sievert measures equivalent dose, applying radiation and tissue weighting factors so different radiation types can be compared for harm, and it replaced the rem at the same 100:1 ratio. This converter scales both families by the same factors, which is numerically valid but only meaningful when comparing like with like.</p>' }));

// === 28. ILLUMINATION ===
R('illumination', C({
  lux: { label: 'Lux (lx)', factor: 1 },
  footcandle: { label: 'Foot-candles (fc)', factor: 10.7639 },
  millilux: { label: 'Millilux (mlx)', factor: 0.001 },
  photocandle: { label: 'Phot (ph)', factor: 10000 },
}, 'Illumination Converter', 'Convert between illumination and luminance units.',
  ['illumination', 'lux', 'footcandle', 'convert'],
  '<p>Converts between illumination units through lux.</p>',
  { background: '<p>Illuminance is luminous flux falling on a surface, so the lux is one lumen per square metre. The foot-candle is one lumen per square foot, about 10.764 lux, and remains common in US lighting codes and photography. For scale, an office is typically 300–500 lux, overcast daylight around 10,000 lux and direct sun over 100,000 lux; the phot is the CGS unit of 10,000 lux.</p>' }));

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
  '<p>Converts between digital storage units. 1 byte = 8 bits.</p>',
  { background: '<p>Digital storage counts bits and bytes, with one byte conventionally eight bits since the 1960s and the bit as the smallest distinguishable state. Decimal prefixes are used for capacity and link rates, so 1 KB here is 1000 bytes and 1 MB is 10⁶ bytes, matching the SI definitions that drive makers and network standards follow. Software that reports 1024-based sizes will therefore show smaller numbers for the same file or disk.</p>' }));

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
  '<p>Converts between typography units through points. 1 pt = 1/72 inch.</p>',
  { background: '<p>The desktop publishing point is exactly 1/72 inch, a convention fixed by PostScript in 1985 and inherited from the earlier Anglo-American point of about 0.01383 inch. Twelve points make a pica and six picas make an inch, so picas and points are a base-12 subdivision of the inch. An em is not a fixed length at all — it is the width of the font at its current size — so the 12-point assumption here only holds at that size.</p>' }));

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
  '<p>Converts between textile measurement units through meters.</p>',
  { background: '<p>Textile measurement mixes two different things: lengths such as metres and yards, and yarn counts such as denier and tex, which describe linear density rather than length. Denier is the mass in grams of 9000 metres of yarn, so a finer silk or hosiery yarn has a lower number, while tex is grams per 1000 metres and dtex a tenth of that. Converting between the two families is not physically meaningful, even though this tool scales every entry the same way.</p>' }));

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
  '<p>Converts between nautical measurement units through nautical miles.</p>',
  { background: '<p>Maritime units are tied to the globe: one nautical mile is one minute of latitude, fixed at 1852 m by the 1929 International Hydrographic Conference, which makes chart distances and coordinates directly comparable. A cable is a tenth of a nautical mile, roughly 185 m, and a fathom of six feet measures depth. A knot is one nautical mile per hour, so it is a speed rather than a length and only shares the factor here because the converter lists it alongside nautical miles.</p>' }));

// === 33. AGRICULTURAL ===
R('agricultural', C({
  kgHa: { label: 'kg/hectare', factor: 1 },
  lbAcre: { label: 'lb/acre', factor: 0.112085 },
  buAcre: { label: 'bushels/acre', factor: 53.81 },
  tonHa: { label: 'metric tons/hectare', factor: 0.001 },
  tonAcre: { label: 'short tons/acre', factor: 0.0892176 },
}, 'Agricultural Measurement Converter', 'Convert between agricultural measurement units.',
  ['agricultural', 'farming', 'yield', 'convert'],
  '<p>Converts between agricultural measurement units through kg/hectare.</p>',
  { background: '<p>Agricultural yields are mass per area, so the numbers depend on both the mass unit and the land unit. Metric agronomy reports kilograms or tonnes per hectare, while US extension services use pounds or bushels per acre, and one hectare is 2.471 acres. Bushels are a volume measure whose weight varies by crop and moisture — wheat is about 60 lb per bushel, corn 56 lb and soybeans 60 lb — so bushel-per-acre figures embed an assumed test weight.</p>' }));

// === 34. CONSTRUCTION MEASUREMENTS ===
R('construction-measurements', C({
  boardFoot: { label: 'Board Feet (BF)', factor: 1 },
  cubicFoot: { label: 'Cubic Feet (ft3)', factor: 12 },
  cubicMeter: { label: 'Cubic Meters (m3)', factor: 418.88 },
  cubicInch: { label: 'Cubic Inches (in3)', factor: 144 },
  cubicCentimeter: { label: 'Cubic Centimeters (cm3)', factor: 545.4 },
}, 'Construction Measurement Converter', 'Convert between construction and building measurement units.',
  ['construction', 'building', 'lumber', 'convert'],
  '<p>Converts between construction measurement units through board feet.</p>',
  { background: '<p>Lumber in North America is priced by the board foot, a nominal volume of one square foot one inch thick, or 144 cubic inches. Bulk materials such as concrete, gravel and mulch are sold by the cubic yard, and framing and sheet goods by the square foot, so construction estimates routinely mix all three. A cubic metre is about 35.3 cubic feet or 424 board feet, which is why imported timber quotes look very different from domestic ones.</p>' }));

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
  '<p>Uses approximate fixed exchange rates as of 2024. For real-time rates, use a financial API.</p>',
  { background: '<p>This converter uses fixed rates captured around 2024, not a live feed, so it is meant for rough budgeting and sanity checks rather than transactions. Exchange rates float continuously and diverge between interbank, card and cash rates, with spreads and fees often costing one to three percent. For anything involving real money, use a dated rate from a bank or a financial API.</p>' }));

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
  '<p>Converts between metric prefixes: kilo, mega, giga, etc.</p>',
  { background: '<p>SI prefixes are powers of ten adopted with the metric system in 1795 and extended by the CGPM — kilo in 1795, mega and micro in 1873, giga and nano in 1960, pico and femto in 1964. Case matters: M is mega and m is milli, which is why MB and Mb mean different things. The 2022 additions ronna, quetta, ronto and quecto extend the range beyond this table.</p>' }));

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
  '<p>Converts between binary prefixes: 1 KiB = 1024 B, 1 MiB = 1024 KiB, etc.</p>',
  { background: '<p>Binary prefixes were introduced by the IEC in 1998 to end the ambiguity between 1000 and 1024. Memory and filesystem sizes are naturally powers of two, so 1 KiB is exactly 1024 bytes, 1 MiB is 1024 KiB, and so on. Windows still labels 1024-based sizes with the decimal names, so a file shown as 1 GB there is really about 0.93 GiB.</p>' }));

// === 38. ARC MINUTES/SECONDS ===
R('angle-arc', C({
  degree: { label: 'Degrees (deg)', factor: 1 },
  arcminute: { label: 'Arc Minutes (arcmin)', factor: 1 / 60 },
  arcsecond: { label: 'Arc Seconds (arcsec)', factor: 1 / 3600 },
  radian: { label: 'Radians (rad)', factor: 180 / Math.PI },
  mil: { label: 'Mils', factor: 360 / 6400 },
}, 'Arc Minutes and Seconds Converter', 'Convert between arc minutes, arc seconds, and decimal degrees.',
  ['angle', 'arc', 'minutes', 'seconds', 'convert'],
  '<p>Converts between arc-based angle units. 1 degree = 60 arc minutes = 3600 arc seconds.</p>',
  { background: '<p>Arc minutes and arc seconds are the sexagesimal subdivisions of a degree: 60 minutes to a degree and 60 seconds to a minute, inherited from Babylonian astronomy. A minute of arc is one nautical mile of latitude, which is why navigation and charts use them, and an arcsecond is about 30 metres on the Earth surface. Astronomy and optics work in arcseconds because they need to express very small angles, such as stellar parallax or telescope resolution.</p>' }));

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
  '<p>Converts between US customary volume units through fluid ounces.</p>',
  { background: '<p>US customary volume descends from pre-1824 English measures, before the imperial reform, so its names match British ones but its sizes do not. The fluid ounce is 1/128 of the 231-cubic-inch US gallon, about 29.5735 mL, and the cup, pint, quart and gallon are 8, 16, 32 and 128 fluid ounces. The gill, four fluid ounces or half a cup, is obsolete but still appears in older cocktail and recipe books.</p>' }));

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
  '<p>Converts between US customary weight units through ounces.</p>',
  { background: '<p>US customary weight is the avoirdupois system, named from the Old French for goods of weight, and it fixes 7000 grains to the pound and 16 ounces to the pound. A stone is 14 pounds, a short hundredweight 100 pounds and a short ton 2000 pounds, while British practice uses the 112-pound long hundredweight and the 2240-pound long ton. The pound has been exactly 0.45359237 kg since the 1959 agreement.</p>' }));

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
  '<p>Converts between US customary distance units through inches.</p>',
  { background: '<p>US customary distance runs on the 1959 international yard, which fixed the inch at exactly 25.4 mm and the mile at 5280 feet, or 63,360 inches. The rod, chain and furlong are surveyor units — 16.5 feet, 66 feet and 660 feet — that survive in land descriptions and horse racing. The slightly longer US survey foot was retired at the end of 2022 in favour of the international foot.</p>' }));

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
  '<p>Converts between US customary area units through square feet.</p>',
  { background: '<p>US customary area starts from the square foot: 144 square inches, 9 square feet to the square yard and 43,560 square feet to the acre. The section and township come from the Public Land Survey System set up in 1785, which divided the western territories into six-mile-square townships of 36 one-mile sections. That grid is why so many US state and county boundaries run in straight lines.</p>' }));

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
  '<p>Converts between scientific speed units through meters per second.</p>',
  { background: '<p>Scientific speeds are quoted in metres per second, with kilometres per second for orbital and interplanetary motion. The speed of light is exactly 299,792,458 m/s by definition since 1983, and it now defines the metre rather than the other way round. Mach numbers are ratios to the local speed of sound, which depends on temperature: about 340.3 m/s in 15 °C sea-level air but roughly 295 m/s near the tropopause, so a Mach figure means little without stating the atmosphere.</p>' }));

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
  '<p>Converts between thermal energy units through joules.</p>',
  { background: '<p>Thermal units all measure heat, but each was defined against a different reference. The International Table BTU is 1055.056 J, the US therm is 105.4804 MJ (100,000 BTU of the 59 °F definition), and the EC and UK therm is 105.506 MJ. The quad, 10¹⁵ BTU or about 1.055 exajoules, is the unit US energy statistics use for national consumption.</p>' }));

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
  '<p>Converts between electrical power units through watts.</p>',
  { background: '<p>Electrical power is voltage times current, and the watt is the SI unit for it. Milliwatts suit small electronics and gigawatts suit power stations, with the kilowatt-hour remaining the billing unit for energy rather than power. dBm is logarithmic — ten times the base-10 logarithm of power relative to 1 mW — so it cannot be converted by simple multiplication, and the linear factor listed here is only an approximation at the 1 mW reference.</p>' }));

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
  '<p>Converts between voltage units through volts.</p>',
  { background: '<p>Voltage is electric potential difference, one joule per coulomb, and the volt is named after Alessandro Volta. Millivolts and microvolts appear in sensor and audio signals, kilovolts in distribution and transmission lines, and megavolts in particle accelerators and HVDC links. The abvolt and statvolt belong to the CGS electromagnetic and electrostatic systems, which were largely replaced by SI; one statvolt is about 299.79 V.</p>' }));

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
  '<p>Converts between electric current units through amperes.</p>',
  { background: '<p>Current is charge flow per second, and the ampere became an SI base unit defined by the force between parallel wires, then redefined in 2019 in terms of the elementary charge. Milliamps and microamps are the everyday electronics units, nanoamps matter for leakage and sensor bias, and kiloamps appear in welding, traction and fault currents. The abampere, or biot, is 10 A in the CGS electromagnetic system, and the statampere is about 3.336 × 10⁻¹⁰ A.</p>' }));

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
  '<p>Converts between electrical resistance units through ohms.</p>',
  { background: '<p>Resistance is voltage divided by current, so the ohm is one volt per ampere and is named after Georg Ohm. Practical resistors span milliohms for shunts and current-sense paths up to gigohms for insulation and feedback networks. The abohm and statohm are CGS counterparts: one abohm is 10⁻⁹ ohm and one statohm is roughly 8.988 × 10¹¹ ohm.</p>' }));

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
  '<p>Converts between electrical capacitance units through farads.</p>',
  { background: '<p>Capacitance is stored charge per volt, and one farad holds one coulomb at one volt — a very large unit, so real components are rated in microfarads, nanofarads and picofarads. The unit honours Michael Faraday, and the 1000-step prefixes match how capacitor values are marked and stocked. Femtofarads appear in RF work and stray capacitance, where circuit layout dominates the value.</p>' }));

// === 50. INDUCTANCE ===
R('inductance', C({
  henry: { label: 'Henries (H)', factor: 1 },
  millihenry: { label: 'Millihenries (mH)', factor: 0.001 },
  microhenry: { label: 'Microhenries (uH)', factor: 1e-6 },
  nanohenry: { label: 'Nanohenries (nH)', factor: 1e-9 },
  picohenry: { label: 'Picohenries (pH)', factor: 1e-12 },
}, 'Inductance Converter', 'Convert between electrical inductance units.',
  ['inductance', 'henries', 'electric', 'convert'],
  '<p>Converts between electrical inductance units through henries.</p>',
  { background: '<p>Inductance relates changing current to induced voltage, and one henry produces one volt per ampere per second; it is named after Joseph Henry, who discovered self-induction at the same time as Faraday. Practical inductors and transformer windings run from nanohenries in RF work to millihenries in filters and chokes. A one-henry component is large, which is why most datasheets use mH and µH.</p>' }));

// === SPECIFIC CONVERSIONS FROM CATALOG ===

// Kilograms to Pounds
R('kilograms-to-pounds', {
  title: 'Kilograms to Pounds Converter',
  description: 'Convert kilograms to pounds.',
  tags: ['weight', 'kg', 'lb', 'convert'],
  formula: '<p>1 kilogram = 2.20462 pounds</p>',
  background: '<p>The kilogram is the SI base unit of mass and the pound the avoirdupois unit used in the US and, informally, the UK. Since the 1959 international yard and pound agreement the pound is exactly 0.45359237 kg, making one kilogram 2.20462262 pounds. Body weight, shipping and grocery labels are the usual places this conversion comes up.</p>',
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
  background: '<p>This is the inverse of the exact 1959 definition, where one international avoirdupois pound equals 0.45359237 kilograms. The pound is still the everyday weight unit in the US and is used for body weight in Britain alongside stones. Because the factor is exact, the only rounding comes from the display precision.</p>',
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
  background: '<p>An acre is 43,560 square feet, the area of a rectangle one chain by one furlong (66 by 660 feet). It originated as the amount of land a yoke of oxen could plough in a day, which is why it is a strip rather than a square. US real estate, agriculture and forestry still quote land in acres.</p>',
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
  background: '<p>Dividing square footage by 43,560 gives acres, the traditional English land unit of one chain by one furlong. The acre is not a square — its shape was fixed by ploughing geometry — but it is exactly 4046.8564224 m². It remains the standard unit for US property, farmland and timber tracts.</p>',
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
  background: '<p>One foot is exactly 0.3048 m under the 1959 agreement, so a square foot is 0.3048², or 0.09290304 m². Floor areas are quoted in square feet in the US and in square metres nearly everywhere else, which makes this one of the most common real estate conversions. Do not confuse it with the linear foot-to-metre factor, which is only about a third as large.</p>',
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
  background: '<p>This is the inverse of the exact square-foot definition: one square metre is 1/0.09290304, or about 10.7639 square feet. Metric building plans and product datasheets use m², while US listings, carpets and paint coverage often use square feet. The ratio is the square of the 3.28084 feet-per-metre factor, not the factor itself.</p>',
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
  background: '<p>Both scales pin water at the same two points but divide the interval differently: 100 Celsius degrees against 180 Fahrenheit degrees, a ratio of 9/5. The 32-degree offset exists because Fahrenheit put the freezing point of water at 32 rather than zero. The Fahrenheit scale is still used for weather, cooking and medicine in the US and a few other countries.</p>',
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
  background: '<p>Subtracting the 32-degree offset first and then multiplying by 5/9 reverses the Fahrenheit definition, where water freezes at 32 °F and boils at 212 °F. The 5/9 factor reflects that 180 Fahrenheit degrees span the same interval as 100 Celsius degrees. The scales cross at −40, the one temperature where both read the same.</p>',
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
  background: '<p>Kelvin is the SI base unit of temperature and starts at absolute zero, the point where no more thermal energy can be extracted. Its degree size is identical to the Celsius degree, so the only change is the 273.15 offset — 0 °C is 273.15 K. Since 2019 the kelvin is defined through the Boltzmann constant rather than the triple point of water.</p>',
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
  background: '<p>Subtracting 273.15 converts an absolute temperature to the Celsius scale used in everyday life and most laboratories. The offset comes from water freezing at 273.15 K, fixed by the pre-2019 triple-point definition and retained for continuity after the 2019 redefinition. A negative result means the input was below the freezing point of water, not an error, unless it falls below 0 K.</p>',
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
  background: '<p>This combines both steps: remove the 32-degree Fahrenheit offset, scale by 5/9 to Celsius degrees, then add 273.15 to reach absolute zero. The result is absolute, so values below 0 K are physically impossible and indicate a bad input. Kelvin is used in physics and chemistry because ratios of temperatures are meaningful only on an absolute scale.</p>',
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
  background: '<p>Absolute temperatures in kelvin are converted to Celsius degrees by subtracting 273.15, then to Fahrenheit by scaling 9/5 and adding 32. Rankine is the shortcut for this direction, since a Rankine degree equals a Fahrenheit degree and 0 °R is absolute zero. Cryogenics and aerospace often use kelvin, while US engineering datasheets may use Rankine or Fahrenheit.</p>',
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
  background: '<p>Rankine is the absolute version of the Fahrenheit scale, proposed by William Rankine in 1859: the degree size matches Fahrenheit and zero sits at absolute zero. Converting from Celsius therefore adds 273.15 and then scales by 9/5, giving 491.67 °R at the freezing point of water. It survives in US steam and power engineering, where tables are still published in °R.</p>',
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
  background: '<p>Because both scales use the same degree size, converting Fahrenheit to Rankine is a pure offset of 459.67 degrees. Rankine is the absolute Fahrenheit scale, so 0 °R is absolute zero and water freezes at 491.67 °R. It is used in US thermodynamics and power plant work where Fahrenheit-based tables are traditional.</p>',
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
  background: '<p>Kelvin and Rankine are both absolute scales, so the conversion is purely a degree-size ratio of 9/5. Absolute zero is zero on both, which makes the relationship a simple multiplication with no offset. Rankine is used mainly in US engineering, while kelvin is the SI standard everywhere else.</p>',
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
  background: '<p>The centimetre is a metric length unit, and the inch has been exactly 2.54 cm since the 1959 international yard and pound agreement. Before that the inch varied slightly between countries and even between trades. Screen sizes, clothing, tools and paper formats are the usual places this conversion is needed.</p>',
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
  background: '<p>Multiplying inches by exactly 2.54 gives centimetres, a definition fixed by the 1959 agreement that reconciled the British and American inch. The inch itself descends from the Roman uncia, one twelfth of a foot, though its length drifted for centuries. Product dimensions and body measurements are the common use cases.</p>',
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
  background: '<p>Time is counted in base 60 from Babylonian astronomy, which is why an hour has 60 minutes and a minute 60 seconds rather than following the decimal system. The 24-hour day comes from Egyptian convention. Minutes are used for scheduling, billing and travel times, where decimal fractions of an hour can be confusing.</p>',
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
  background: '<p>Dividing minutes by 60 gives decimal hours, and the whole-and-remainder form is what people usually want for scheduling. Decimal hours matter for timesheets and payroll, where rates are applied per hour, and rounding rules can change what a worker is paid. The underlying 60-minute hour is a Babylonian convention that has outlasted every attempt to decimalise time.</p>',
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
  background: '<p>A civil day is 24 hours, a convention inherited from Egyptian and Babylonian timekeeping that ignores the slightly shorter sidereal day of about 23 hours 56 minutes. Dividing by 24 gives a decimal day count, while the remainder form suits shift planning and elapsed-time descriptions. Daylight saving shifts the local wall-clock day by an hour but not its length.</p>',
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
  '<p>Converts between momentum units through kg-m/s.</p>',
  { background: '<p>Momentum is mass times velocity, so the SI unit is the kilogram-metre per second, which is dimensionally identical to the newton-second used for impulse. The CGS equivalent, the gram-centimetre per second, is 10⁻⁵ of it, and pound-foot per second belongs to the foot-pound-second system. Momentum is conserved in collisions, which is why it often matters more than kinetic energy when working out what happens after an impact.</p>' }));

// Decimal Degrees to DMS
R('convert-decimal-degrees-to-degrees-minutes-seconds', {
  title: 'Decimal Degrees to DMS Converter',
  description: 'Convert decimal degrees to degrees, minutes, seconds.',
  tags: ['angle', 'degrees', 'DMS', 'convert'],
  formula: '<p>Converts decimal degrees to degrees-minutes-seconds format.</p>',
  background: '<p>Decimal degrees and degrees-minutes-seconds encode the same angle in different bases: the first is convenient for software and GIS, the second for charts, navigation and astronomy. One degree is 60 minutes and one minute 60 seconds, a Babylonian inheritance, and one minute of latitude is one nautical mile. The sign convention here maps negative values to south and west, the usual GPS convention.</p>',
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
  background: '<p>Human height is metric almost everywhere but is still given in feet and inches in the US and, conversationally, the UK. The conversion rests on the exact 2.54 cm inch and the 12-inch foot, so 175 cm is 5 ft 8.9 in. Medical charts in the US often record both, which is why the total-inches figure is also useful.</p>',
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
  background: '<p>Feet and inches are converted by turning the height into total inches and multiplying by 2.54, the exact post-1959 inch. The metric result is what most of the world uses for passports, medical records and clothing sizes. Note that the inches field accepts fractions up to 11.9, so 5 ft 12 in should be entered as 6 ft 0 in.</p>',
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

// Meters to Feet
R('meters-to-feet', {
  title: 'Meters to Feet Converter',
  description: 'Convert meters to feet and inches.',
  tags: ['length', 'meters', 'feet', 'convert'],
  formula: '<p>1 meter = 3.28084 feet</p>',
  background: '<p>The metre is the SI base unit of length, originally a fraction of the Earth meridian and now defined by the distance light travels in a fraction of a second. One metre is exactly 1/0.3048 feet, or about 3.28084 ft, since the 1959 agreement fixed the foot at 0.3048 m. Splitting the remainder into inches is useful because US plans and heights rarely use decimal feet.</p>',
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
  '<p>Converts between metric units using standard SI prefixes.</p>',
  { background: '<p>This converter covers length only, despite the description mentioning dimensions: kilometres down to nanometres, all linked by powers of ten. SI prefixes date from the metric system of 1795 and were extended by the CGPM through giga, nano, pico and femto in the 1960s. Nanometres are the working unit for semiconductors and light wavelengths, while micrometres suit cells, fibres and precision machining.</p>' }));

// Troy Weight
R('weighttroy', C({
  grain: { label: 'Grains (gr)', factor: 1 },
  pennyweight: { label: 'Pennyweights (dwt)', factor: 24 },
  troyOunce: { label: 'Troy Ounces (oz t)', factor: 480 },
  troyPound: { label: 'Troy Pounds (lb t)', factor: 5760 },
}, 'Troy Weight Converter', 'Convert between troy weight units used for precious metals.',
  ['troy', 'weight', 'precious metals', 'convert'],
  '<p>Converts between troy weight units through grains. 1 troy oz = 480 grains.</p>',
  { background: '<p>Troy weight is the system for precious metals, gemstones and, historically, coinage; the troy ounce of 31.1034768 g is the quote unit for gold and silver. It shares the 64.79891 mg grain with avoirdupois but counts 480 grains to the ounce and 12 ounces to the pound, against 437.5 grains and 16 ounces. The pennyweight of 24 grains is a medieval relic, once literally the weight of a silver penny.</p>' }));

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
  '<p>Converts between avoirdupois weight units through grains.</p>',
  { background: '<p>Avoirdupois is the everyday weight system of the English-speaking world, from the Old French for goods of weight, standardised in the thirteenth century. Its pound is 7000 grains, against 5760 for the troy pound, and it divides into 16 ounces of 437.5 grains. The dram, stone and hundredweight are traditional subdivisions; the 100-pound short hundredweight here differs from the British 112-pound long hundredweight.</p>' }));

// Cubic Feet to Cubic Yards
R('cubic-feet-to-cubic-yards', {
  title: 'Cubic Feet to Cubic Yards Converter',
  description: 'Convert cubic feet to cubic yards.',
  tags: ['volume', 'cubic feet', 'cubic yards', 'convert'],
  formula: '<p>1 cubic yard = 27 cubic feet</p>',
  background: '<p>A cubic yard is 3 × 3 × 3, or 27 cubic feet, because the yard is three feet and volume scales with the cube of the length ratio. Concrete, topsoil, mulch and gravel are sold by the cubic yard in the US, while appliance and shipping volumes are often given in cubic feet. Ordering slightly more than the calculated figure is normal practice to allow for settling and spillage.</p>',
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
  background: '<p>Multiplying by 27 converts cubic yards to cubic feet, since each yard is three feet in every dimension. Bulk landscaping and construction materials are quoted in cubic yards, but bagged products and equipment capacities often use cubic feet. The same cube relationship explains why a cubic metre is 35.3 cubic feet.</p>',
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
  background: '<p>Spelling out numbers is a legal safeguard: amounts written in words on cheques, contracts and invoices are much harder to alter than digits. English uses the short scale, where a billion is 10⁹ and a trillion 10¹², a convention the US adopted early and Britain followed in 1974. Hyphenation and the use of and vary by style guide, so word output is approximate rather than definitive.</p>',
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
  background: '<p>Reading digits individually avoids the ambiguity of spoken numbers, where fifteen and fifty or thirteen and thirty are easily confused. Phone numbers, serial numbers, account references and error codes are therefore dictated digit by digit. The tool strips punctuation, so separators in the input do not appear in the output.</p>',
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
  background: '<p>Decimal hours are used in payroll, timesheets and project billing because multiplying a decimal fraction by an hourly rate is simple arithmetic. Forty-five minutes is 0.75 hours, and 8 hours 20 minutes is 8.33, which is not the same as 8.20. Some payroll systems round to the nearest quarter hour, which can shift pay noticeably over a pay period.</p>',
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
