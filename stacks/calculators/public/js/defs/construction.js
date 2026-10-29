// Construction calculators
(function(reg) {
const R = reg.register.bind(reg, 'construction');

// === CONCRETE ===

R('concrete-calculator', {
  title: 'Concrete Calculator',
  description: 'Calculate how much concrete you need for a project.',
  tags: ['concrete', 'volume', 'yards', 'cubic', 'foundation'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 8', half: true },
    { id: 'depth', label: 'Depth (inches)', type: 'number', step: 0.5, min: 0.25, placeholder: 'e.g. 4', half: true },
    { id: 'shape', label: 'Shape', type: 'select', options: [
      { value: 'rect', label: 'Rectangle / Slab' },
      { value: 'circle', label: 'Circle' },
      { value: 'cylinder', label: 'Cylinder / Pipe' },
    ]},
  ],
  formula: '<p><code>Volume = L × W × D</code> for rectangular slabs. 1 cubic yard = 27 cubic feet.</p>',
  background: '<p>Ready-mix concrete is ordered by the cubic yard, and a yard is 27 cubic feet, so slab dimensions given in feet and inches are converted before ordering. Bagged mixes are sold by weight and yield roughly 0.6 cubic feet per 80-lb bag, which is why bag counts are rounded up. A little overage is normal because subgrade is never perfectly level and some material is lost in mixing, pumping and finishing.</p>',
  calculate: function(v) {
    let cuFt;
    if (v.shape === 'circle') {
      const r = v.length / 2;
      cuFt = Math.PI * r * r * (v.depth / 12);
    } else if (v.shape === 'cylinder') {
      const r = v.width / 2;
      cuFt = Math.PI * r * r * v.length;
    } else {
      cuFt = v.length * v.width * (v.depth / 12);
    }
    const cuYd = cuFt / 27;
    const bags80 = Math.ceil(cuYd * 45);
    const bags60 = Math.ceil(cuYd * 60);
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      '80-lb Bags Needed': bags80,
      '60-lb Bags Needed': bags60,
    };
  }
});

// === CUBIC YARDS ===

R('cubic-yards', {
  title: 'Cubic Yards Calculator',
  description: 'Calculate volume in cubic yards for landscaping, gravel, and fill.',
  tags: ['cubic yards', 'volume', 'landscaping', 'gravel'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 20', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'depth', label: 'Depth (inches)', type: 'number', step: 0.5, min: 0.25, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p><code>Cubic Yards = (L × W × D) / 324</code> where D is in inches.</p>',
  background: '<p>Cubic yards are the ordering unit for bulk materials such as gravel, sand, mulch, topsoil and fill, because a cubic yard is about what a small dump truck or loader bucket carries. Suppliers quote by the yard while plans usually give depth in inches, so the depth has to be converted before the volume means anything. Rounding up matters here: loads are sold in whole or half yards, and a short delivery means a second trip.</p>',
  calculate: function(v) {
    const cuFt = v.length * v.width * (v.depth / 12);
    const cuYd = cuFt / 27;
    const tons = cuYd * 1.35;
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      'Estimated Weight (tons)': core.formatNumber(tons, 2),
    };
  }
});

// === CUBIC FEET ===

R('cubic-feet', {
  title: 'Cubic Feet Calculator',
  description: 'Calculate volume in cubic feet for storage, tanks, and containers.',
  tags: ['cubic feet', 'volume', 'storage', 'container'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'height', label: 'Height (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>Volume = L × W × H</code></p>',
  background: '<p>The cubic foot is the customary unit for the internal volume of boxes, appliances, refrigerators, freezers and shipping containers, and it also appears on natural gas bills. Manufacturers quote capacity in cubic feet because it compares directly against the exterior dimensions shown on a specification sheet. Liquid equivalents are listed because tank and container sizes are often given in gallons rather than cubic measure.</p>',
  calculate: function(v) {
    const cuFt = v.length * v.width * v.height;
    const cuYd = cuFt / 27;
    const cuM = cuFt * 0.0283168;
    const gal = cuFt * 7.48052;
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      'Volume (cubic meters)': core.formatNumber(cuM, 2),
      'Volume (gallons)': core.formatNumber(gal, 2),
    };
  }
});

// === PAINT ===

R('paint-calculator', {
  title: 'Paint Calculator',
  description: 'Calculate how much paint you need for a room or project.',
  tags: ['paint', 'coverage', 'gallons', 'walls', 'ceiling'],
  fields: [
    { id: 'wallLength', label: 'Room Length (ft)', type: 'number', step: 0.5, min: 0.1, placeholder: 'e.g. 15', half: true },
    { id: 'wallWidth', label: 'Room Width (ft)', type: 'number', step: 0.5, min: 0.1, placeholder: 'e.g. 12', half: true },
    { id: 'wallHeight', label: 'Wall Height (ft)', type: 'number', step: 0.5, min: 0.1, placeholder: 'e.g. 8', half: true },
    { id: 'coats', label: 'Number of Coats', type: 'number', step: 1, min: 1, max: 5, placeholder: 'e.g. 2', half: true },
    { id: 'coverage', label: 'Paint Coverage (sq ft/gal)', type: 'number', step: 1, min: 100, max: 600, placeholder: 'e.g. 400', half: true },
    { id: 'doors', label: 'Number of Doors', type: 'number', step: 1, min: 0, max: 20, placeholder: 'e.g. 2', half: true },
    { id: 'windows', label: 'Number of Windows', type: 'number', step: 1, min: 0, max: 20, placeholder: 'e.g. 2', half: true },
  ],
  formula: '<p><code>Wall Area = 2 × H × (L + W) − openings</code>. Gallons = total area / coverage per gallon.</p>',
  background: '<p>Paint is sold by the gallon or quart, and a gallon typically covers 350 to 400 square feet on a smooth, primed interior wall. Two coats are the usual minimum for a colour change, so the paintable wall area is counted twice before dividing by coverage. Doors and windows are deducted because painting them is a separate task, and a small allowance is prudent for touch-ups and for porous or textured surfaces.</p>',
  calculate: function(v) {
    const wallArea = 2 * v.wallHeight * (v.wallLength + v.wallWidth);
    const doorArea = (v.doors || 0) * 21;
    const winArea = (v.windows || 0) * 15;
    const netArea = wallArea - doorArea - winArea;
    const coverage = v.coverage || 400;
    const coats = v.coats || 2;
    const gallons = (netArea * coats) / coverage;
    var out = {};
    out['Total Wall Area'] = core.formatNumber(wallArea, 1) + ' sq ft';
    out['Net Paintable Area'] = core.formatNumber(netArea, 1) + ' sq ft';
    out['Gallons Needed (' + coats + ' coats)'] = core.formatNumber(Math.ceil(gallons * 4) / 4, 2);
    out['Quarts Needed'] = core.formatNumber(Math.ceil(gallons * 4), 0);
    return out;
  }
});

// === MULCH ===

R('mulch-calculator', {
  title: 'Mulch Calculator',
  description: 'Calculate how much mulch you need for a garden bed.',
  tags: ['mulch', 'garden', 'landscaping', 'cubic yards'],
  fields: [
    { id: 'area', label: 'Area (sq ft)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 100', half: true },
    { id: 'depth', label: 'Depth (inches)', type: 'number', step: 0.5, min: 0.5, max: 12, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>Cubic Yards = Area × Depth / 324</code></p>',
  background: '<p>Mulch is sold by the cubic yard in bulk or in 2-cubic-foot bags at garden centres, and it is spread two to four inches deep to smother weeds and hold soil moisture. Because bags come in whole units and mulch settles as it decomposes, ordering slightly more than the calculated volume avoids running short halfway through a bed. Depth is the variable that matters most, since an extra inch over a large area multiplies quickly.</p>',
  calculate: function(v) {
    const cuYd = v.area * v.depth / 324;
    const cuFt = v.area * v.depth / 12;
    const bags = Math.ceil(cuFt / 2);
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      '2-cu-ft Bags Needed': bags,
    };
  }
});

// === TILE ===

R('tile-calculator', {
  title: 'Tile Calculator',
  description: 'Calculate how many tiles you need for a floor or wall.',
  tags: ['tile', 'flooring', 'wall', 'coverage'],
  fields: [
    { id: 'floorLength', label: 'Floor Length (ft)', type: 'number', step: 0.25, min: 0.1, placeholder: 'e.g. 12', half: true },
    { id: 'floorWidth', label: 'Floor Width (ft)', type: 'number', step: 0.25, min: 0.1, placeholder: 'e.g. 10', half: true },
    { id: 'tileLength', label: 'Tile Length (inches)', type: 'number', step: 0.25, min: 0.5, placeholder: 'e.g. 12', half: true },
    { id: 'tileWidth', label: 'Tile Width (inches)', type: 'number', step: 0.25, min: 0.5, placeholder: 'e.g. 12', half: true },
    { id: 'waste', label: 'Waste Factor (%)', type: 'number', step: 1, min: 0, max: 30, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>Tiles = Floor Area / Tile Area × (1 + Waste%)</code></p>',
  background: '<p>Tile is sold by the piece, by the square foot or by the case, and the number of pieces per case varies with tile size. A waste allowance covers cuts at walls and corners, breakage in transit and the offcuts left when a pattern has to be aligned, with 10 percent a common figure and more for diagonal or herringbone layouts. Keeping a few spare tiles is also standard practice for later repairs, because dye lots change between production runs.</p>',
  calculate: function(v) {
    const floorArea = v.floorLength * v.floorWidth;
    const tileArea = (v.tileLength * v.tileWidth) / 144;
    const tiles = Math.ceil(floorArea / tileArea);
    const waste = v.waste || 10;
    const total = Math.ceil(tiles * (1 + waste / 100));
    var out = {};
    out['Floor Area'] = core.formatNumber(floorArea, 2) + ' sq ft';
    out['Tile Area'] = core.formatNumber(tileArea, 4) + ' sq ft';
    out['Tiles Needed (no waste)'] = tiles;
    out['Tiles with ' + waste + '% waste'] = total;
    return out;
  }
});

// === FLOORING ===

R('flooring-calculator', {
  title: 'Flooring Calculator',
  description: 'Calculate flooring material needed for a room.',
  tags: ['flooring', 'hardwood', 'laminate', 'area'],
  fields: [
    { id: 'length', label: 'Room Length (ft)', type: 'number', step: 0.25, min: 0.1, placeholder: 'e.g. 15', half: true },
    { id: 'width', label: 'Room Width (ft)', type: 'number', step: 0.25, min: 0.1, placeholder: 'e.g. 12', half: true },
    { id: 'waste', label: 'Waste Factor (%)', type: 'number', step: 1, min: 0, max: 30, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>Total Area = L × W × (1 + Waste%)</code></p>',
  background: '<p>Hardwood, laminate, vinyl plank and similar flooring is sold in cases priced by the square foot, and the coverage per case depends on the plank dimensions. A waste factor accounts for end cuts, boards with defects and pattern matching across seams; a straight lay usually needs about 10 percent, while diagonal or herringbone work needs more. Buying all material in one order also keeps colour and batch consistent across the room.</p>',
  calculate: function(v) {
    const area = v.length * v.width;
    const waste = v.waste || 10;
    const total = area * (1 + waste / 100);
    const sqM = total * 0.092903;
    return {
      'Room Area': core.formatNumber(area, 2) + ' sq ft',
      'Total with Waste': core.formatNumber(total, 2) + ' sq ft',
      'Total (sq meters)': core.formatNumber(sqM, 2),
    };
  }
});

// === DRYWALL ===

R('drywall-calculator', {
  title: 'Drywall Calculator',
  description: 'Calculate how many drywall sheets you need.',
  tags: ['drywall', 'sheetrock', 'gypsum', 'wall'],
  fields: [
    { id: 'wallLength', label: 'Total Wall Length (ft)', type: 'number', step: 0.5, min: 1, placeholder: 'e.g. 60', half: true },
    { id: 'wallHeight', label: 'Wall Height (ft)', type: 'number', step: 0.5, min: 1, placeholder: 'e.g. 8', half: true },
    { id: 'sheetW', label: 'Sheet Width (ft)', type: 'number', step: 0.5, min: 1, placeholder: 'e.g. 4', half: true },
    { id: 'sheetL', label: 'Sheet Length (ft)', type: 'number', step: 0.5, min: 1, placeholder: 'e.g. 8', half: true },
  ],
  formula: '<p><code>Sheets = Wall Area / Sheet Area</code></p>',
  background: '<p>Drywall, also called gypsum board or sheetrock, is sold in standard sheets such as 4 by 8 feet, so a job is planned around whole sheets rather than raw area. Sheets must be cut around doors, windows and outlets, and those offcuts are usually unusable, which is why the count is rounded up. Larger sheets mean fewer joints to finish but are harder to handle, so sheet size is a practical trade-off as well as a cost one.</p>',
  calculate: function(v) {
    const wallArea = v.wallLength * v.wallHeight;
    const sheetArea = v.sheetW * v.sheetL;
    const sheets = Math.ceil(wallArea / sheetArea);
    return {
      'Total Wall Area': core.formatNumber(wallArea, 1) + ' sq ft',
      'Sheet Area': core.formatNumber(sheetArea, 1) + ' sq ft',
      'Sheets Needed': sheets,
    };
  }
});

// === ROOFING ===

R('roofing-calculator', {
  title: 'Roofing Calculator',
  description: 'Calculate roofing material needed including pitch.',
  tags: ['roofing', 'shingles', 'pitch', 'roof area'],
  fields: [
    { id: 'length', label: 'House Length (ft)', type: 'number', step: 0.5, min: 1, placeholder: 'e.g. 40', half: true },
    { id: 'width', label: 'House Width (ft)', type: 'number', step: 0.5, min: 1, placeholder: 'e.g. 30', half: true },
    { id: 'pitch', label: 'Roof Pitch (rise per 12")', type: 'number', step: 0.5, min: 0.5, max: 12, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p><code>Pitch Factor = √(pitch² + 144) / 12. Roof Area = 2 × L × W × Pitch Factor</code></p>',
  background: '<p>Roofing material is ordered in squares, where one square covers 100 square feet of roof surface, and asphalt shingles come roughly three bundles to the square. A pitched roof has more surface area than the building footprint, so plan dimensions are adjusted by a pitch factor before the area is converted. Ridge caps, starter strips and valley flashing are usually counted separately, and most crews add a bundle or two for cuts and damage.</p>',
  calculate: function(v) {
    const pitchFactor = Math.sqrt(v.pitch * v.pitch + 144) / 12;
    const roofArea = 2 * v.length * v.width * pitchFactor;
    const bundles = Math.ceil(roofArea / 33.3);
    const squares = roofArea / 100;
    return {
      'Roof Area': core.formatNumber(roofArea, 1) + ' sq ft',
      'Pitch Factor': core.formatNumber(pitchFactor, 3),
      'Squares Needed': core.formatNumber(squares, 1),
      'Bundles Needed (approx)': bundles,
    };
  }
});

// === BRICK ===

R('brick-calculator', {
  title: 'Brick Calculator',
  description: 'Calculate how many bricks you need for a wall.',
  tags: ['brick', 'masonry', 'wall', 'mortar'],
  fields: [
    { id: 'wallLength', label: 'Wall Length (ft)', type: 'number', step: 0.5, min: 1, placeholder: 'e.g. 20', half: true },
    { id: 'wallHeight', label: 'Wall Height (ft)', type: 'number', step: 0.5, min: 1, placeholder: 'e.g. 6', half: true },
    { id: 'brickType', label: 'Brick Type', type: 'select', options: [
      { value: 'standard', label: 'Standard (8×3.75×2.25")' },
      { value: 'modular', label: 'Modular (7.625×3.625×2.125")' },
      { value: 'queen', label: 'Queen (7.625×3.625×3.625")' },
    ]},
  ],
  formula: '<p>Standard brick with mortar: ~7 bricks per sq ft for single wythe wall.</p>',
  background: '<p>Brick counts depend on the brick\'s nominal size plus the mortar joint, so a wall is estimated in bricks per square foot rather than by dividing bare face areas. A single wythe wall in standard brick works out to roughly seven bricks per square foot once joints are included. About five percent extra is normal for breakage, cutting at corners and openings, and for the occasional brick that is laid out of tolerance.</p>',
  calculate: function(v) {
    const area = v.wallLength * v.wallHeight;
    let bricksPerSqFt;
    if (v.brickType === 'modular') bricksPerSqFt = 7;
    else if (v.brickType === 'queen') bricksPerSqFt = 6;
    else bricksPerSqFt = 7;
    const bricks = Math.ceil(area * bricksPerSqFt * 1.05);
    const mortar = area * 0.03;
    return {
      'Wall Area': core.formatNumber(area, 1) + ' sq ft',
      'Bricks Needed': bricks,
      'Mortar Needed (cu ft)': core.formatNumber(mortar, 2),
    };
  }
});

// === LUMBER ===

R('lumber-calculator', {
  title: 'Lumber Calculator',
  description: 'Calculate board feet and lumber needed for a project.',
  tags: ['lumber', 'board feet', 'wood', 'framing'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.5, min: 0.5, placeholder: 'e.g. 8', half: true },
    { id: 'width', label: 'Width (inches)', type: 'number', step: 0.25, min: 0.5, placeholder: 'e.g. 6', half: true },
    { id: 'thickness', label: 'Thickness (inches)', type: 'number', step: 0.25, min: 0.25, placeholder: 'e.g. 1', half: true },
    { id: 'quantity', label: 'Quantity', type: 'number', step: 1, min: 1, max: 10000, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>Board Feet = (L × W × T) / 12</code> per piece.</p>',
  background: '<p>Board feet are the trade unit for hardwood and for lumber sold by volume: one board foot is 144 cubic inches, traditionally a piece one inch thick, twelve inches wide and twelve inches long. The convention survives because it lets boards of different cross-sections be compared and priced on a single scale. Dressed lumber is smaller than its nominal size, so a 2x4 measures about 1.5 by 3.5 inches, while board-foot pricing normally uses the nominal dimensions.</p>',
  calculate: function(v) {
    const bfPerPiece = (v.length * v.width * v.thickness) / 12;
    const totalBF = bfPerPiece * v.quantity;
    const totalLinFt = v.length * v.quantity;
    return {
      'Board Feet per Piece': core.formatNumber(bfPerPiece, 2),
      'Total Board Feet': core.formatNumber(totalBF, 2),
      'Total Linear Feet': core.formatNumber(totalLinFt, 1),
      'Quantity': v.quantity,
    };
  }
});

// === CUBIC FEET CALCULATOR (alias) ===

R('cubic-feet-calculator', {
  title: 'Cubic Feet Calculator',
  description: 'Calculate volume in cubic feet for storage, tanks, and containers.',
  tags: ['cubic feet', 'volume', 'storage', 'container'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'height', label: 'Height (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>Volume = L × W × H</code></p>',
  background: '<p>This is the same cubic-foot volume measure used for box, appliance and container capacity, which is why the answer is also given in yards, cubic metres and gallons. Shipping and storage businesses quote cubic feet because carriers charge by volume as well as by weight, and the two rarely agree. The conversions matter in practice because tank sizes are usually printed in gallons and architectural plans in cubic yards.</p>',
  calculate: function(v) {
    const cuFt = v.length * v.width * v.height;
    const cuYd = cuFt / 27;
    const cuM = cuFt * 0.0283168;
    const gal = cuFt * 7.48052;
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      'Volume (cubic meters)': core.formatNumber(cuM, 2),
      'Volume (gallons)': core.formatNumber(gal, 2),
    };
  }
});

// === CUBIC YARDS CALCULATOR (alias) ===

R('cubic-yards-calculator', {
  title: 'Cubic Yards Calculator',
  description: 'Calculate volume in cubic yards for landscaping, gravel, and fill.',
  tags: ['cubic yards', 'volume', 'landscaping', 'gravel'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 20', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'depth', label: 'Depth (inches)', type: 'number', step: 0.5, min: 0.25, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p><code>Cubic Yards = (L × W × D) / 324</code> where D is in inches.</p>',
  background: '<p>Cubic yards remain the standard unit for ordering bulk aggregates and soil in the United States and Canada, where a delivery is described as so many yards of material. Because plans specify depth in inches and suppliers sell by the yard, the conversion is the step that most often goes wrong on a takeoff. Estimated tonnage is included because weighbridge tickets, not volume, are how many plants actually bill.</p>',
  calculate: function(v) {
    const cuFt = v.length * v.width * (v.depth / 12);
    const cuYd = cuFt / 27;
    const tons = cuYd * 1.35;
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      'Estimated Weight (tons)': core.formatNumber(tons, 2),
    };
  }
});

// === FEET AND INCHES ===

R('feetandinches', {
  title: 'Feet and Inches Calculator',
  description: 'Add and subtract measurements in feet and inches.',
  tags: ['feet', 'inches', 'addition', 'subtraction', 'measurement'],
  fields: [
    { id: 'ft1', label: 'First value — Feet', type: 'number', step: 1, min: 0, placeholder: 'e.g. 5', half: true },
    { id: 'in1', label: 'First value — Inches', type: 'number', step: 0.25, min: 0, placeholder: 'e.g. 6', half: true },
    { id: 'op', label: 'Operation', type: 'select', options: [
      { value: '+', label: 'Add (+)' }, { value: '−', label: 'Subtract (−)' }
    ]},
    { id: 'ft2', label: 'Second value — Feet', type: 'number', step: 1, min: 0, placeholder: 'e.g. 3', half: true },
    { id: 'in2', label: 'Second value — Inches', type: 'number', step: 0.25, min: 0, placeholder: 'e.g. 8', half: true },
  ],
  formula: '<p>Converts both values to total inches, performs the operation, and converts back to feet and inches.</p>',
  background: '<p>Feet and inches are still the working units for construction, carpentry and plumbing in the United States, and measurements are commonly written with fractional inches down to a sixteenth. Arithmetic is awkward because the units are not decimal, so values are carried in inches and regrouped in twelves. A negative result simply means the second measurement is larger, which is useful when checking a cut against a plan dimension.</p>',
  calculate: function(v) {
    const total1 = v.ft1 * 12 + v.in1;
    const total2 = v.ft2 * 12 + v.in2;
    const result = v.op === '+' ? total1 + total2 : total1 - total2;
    const resultFt = Math.floor(Math.abs(result) / 12);
    const resultIn = Math.abs(result) % 12;
    const sign = result < 0 ? '−' : '';
    return {
      'Result': sign + resultFt + ' ft ' + resultIn.toFixed(2).replace(/\.?0+$/, '') + ' in',
      'Total Inches': core.formatNumber(Math.abs(result), 2),
    };
  }
});

// === GRAVEL CALCULATOR ===

R('gravel-calculator', {
  title: 'Gravel Calculator',
  description: 'Calculate how much gravel you need for a project and its weight.',
  tags: ['gravel', 'landscaping', 'weight', 'volume'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 20', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'depth', label: 'Depth (inches)', type: 'number', step: 0.5, min: 0.25, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>Cubic Yards = (L × W × D) / 324</code>. Gravel weighs ~1.35 tons per cubic yard.</p>',
  background: '<p>Gravel, crushed stone and driveway aggregate are sold by the cubic yard or by weight, and a cubic yard of typical gravel weighs around 1.35 tons depending on the stone and its moisture content. Coverage depends on compacted depth: a driveway base is usually four to six inches, while a decorative layer can be thinner. Bagged gravel is convenient for small patches but is priced far higher per yard than a bulk delivery.</p>',
  calculate: function(v) {
    const cuFt = v.length * v.width * (v.depth / 12);
    const cuYd = cuFt / 27;
    const tons = cuYd * 1.35;
    const lbs = tons * 2000;
    const bags = Math.ceil(cuFt / 0.667);
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      'Weight (tons)': core.formatNumber(tons, 2),
      'Weight (pounds)': core.formatNumber(lbs, 0),
      '50-lb Bags Needed': bags,
    };
  }
});

// === ROADWAY ===

R('roadway', {
  title: 'Road Base Fill Volume Calculator',
  description: 'Calculate the volume of material needed for road base and fill.',
  tags: ['roadway', 'road base', 'fill', 'volume', 'construction'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 100', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.5, min: 0.5, placeholder: 'e.g. 20', half: true },
    { id: 'depth', label: 'Depth (inches)', type: 'number', step: 0.5, min: 0.25, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p><code>Volume = L × W × D</code>. Results in cubic feet, cubic yards, and tons.</p>',
  background: '<p>Road base and structural fill are placed in lifts and compacted, so the loose volume delivered is always greater than the finished volume in place. That shrinkage is why an estimate for a roadway section should be treated as a minimum and rounded up to whole truckloads. The material itself is a graded aggregate mix chosen so it locks together under compaction and drains predictably.</p>',
  calculate: function(v) {
    const cuFt = v.length * v.width * (v.depth / 12);
    const cuYd = cuFt / 27;
    const tons = cuYd * 1.35;
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      'Estimated Weight (tons)': core.formatNumber(tons, 2),
    };
  }
});

// === SQUARE FOOTAGE CALCULATOR ===

R('square-footage-calculator', {
  title: 'Square Footage Calculator',
  description: 'Calculate square footage for buildings, gardens, carpets, and flooring.',
  tags: ['square footage', 'area', 'flooring', 'building'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 20', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 15', half: true },
  ],
  formula: '<p><code>Area = L × W</code></p>',
  background: '<p>Square footage is the standard measure for floor area in real estate listings, flooring and paint estimates, and property tax assessments in the United States. It is computed from exterior or interior plan dimensions depending on the standard being applied, which is why two figures for the same building can legitimately differ. Converting to square yards helps with carpet and landscaping, while square metres are used in most of the world.</p>',
  calculate: function(v) {
    const sqFt = v.length * v.width;
    const sqYd = sqFt / 9;
    const sqM = sqFt * 0.092903;
    return {
      'Area (sq ft)': core.formatNumber(sqFt, 2),
      'Area (sq yards)': core.formatNumber(sqYd, 2),
      'Area (sq meters)': core.formatNumber(sqM, 2),
    };
  }
});

// === TANK VOLUME ===

R('tank', {
  title: 'Tank Volume Calculator',
  description: 'Calculate the volume of a tank in various shapes.',
  tags: ['tank', 'volume', 'cylindrical', 'rectangular', 'spherical'],
  fields: [
    { id: 'shape', label: 'Tank Shape', type: 'select', options: [
      { value: 'rect', label: 'Rectangular' },
      { value: 'cylinder', label: 'Cylindrical (horizontal)' },
      { value: 'sphere', label: 'Spherical' },
    ]},
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'width', label: 'Width / Diameter (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'height', label: 'Height (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 4', half: true },
  ],
  formula: '<p>Rectangular: V = L×W×H. Cylinder: V = π×r²×L. Sphere: V = (4/3)×π×r³.</p>',
  background: '<p>Tank capacity is quoted in gallons or litres even when the tank is described by its dimensions, because those are the units on pumps, meters and shipping documents. Rectangular, cylindrical and spherical shapes need different geometry, and a horizontal cylinder holds less at a given depth than its nominal capacity suggests. One cubic foot holds about 7.48 US gallons, which is the bridge between the volume calculation and the capacity figure.</p>',
  calculate: function(v) {
    let cuFt;
    if (v.shape === 'cylinder') {
      const r = v.width / 2;
      cuFt = Math.PI * r * r * v.length;
    } else if (v.shape === 'sphere') {
      const r = v.width / 2;
      cuFt = (4 / 3) * Math.PI * r * r * r;
    } else {
      cuFt = v.length * v.width * v.height;
    }
    const gal = cuFt * 7.48052;
    const liters = cuFt * 28.3168;
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (gallons)': core.formatNumber(gal, 2),
      'Volume (liters)': core.formatNumber(liters, 2),
    };
  }
});

// === TOPSOIL CALCULATOR ===

R('topsoil-calculator', {
  title: 'Topsoil Calculator',
  description: 'Calculate how much topsoil you need for an area.',
  tags: ['topsoil', 'soil', 'landscaping', 'garden', 'volume'],
  fields: [
    { id: 'length', label: 'Length (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 30', half: true },
    { id: 'width', label: 'Width (ft)', type: 'number', step: 0.25, min: 0.01, placeholder: 'e.g. 20', half: true },
    { id: 'depth', label: 'Depth (inches)', type: 'number', step: 0.5, min: 0.25, placeholder: 'e.g. 4', half: true },
  ],
  formula: '<p><code>Cubic Yards = (L × W × D) / 324</code> where D is in inches.</p>',
  background: '<p>Topsoil is sold by the cubic yard in bulk or in 40-pound bags, and a lawn or garden bed is normally dressed four to six inches deep. Soil compacts and settles after watering, so the finished grade ends up lower than the loose depth that was spread. Bulk delivery is far cheaper per yard for anything beyond a small bed, but it arrives in whole yards and must be placed reasonably close to where it is needed.</p>',
  calculate: function(v) {
    const cuFt = v.length * v.width * (v.depth / 12);
    const cuYd = cuFt / 27;
    const tons = cuYd * 1.0;
    return {
      'Volume (cubic feet)': core.formatNumber(cuFt, 2),
      'Volume (cubic yards)': core.formatNumber(cuYd, 2),
      'Estimated Weight (tons)': core.formatNumber(tons, 2),
    };
  }
});

})(calculatorRegistry);
