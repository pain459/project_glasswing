// Technology calculators
(function(reg) {
const R = reg.register.bind(reg, 'technology');

// === ASPECT RATIO ===

R('aspect-ratio', {
  title: 'Aspect Ratio Calculator',
  description: 'Calculate aspect ratio, width, or height for displays and images.',
  tags: ['aspect ratio', 'display', 'image', 'resolution'],
  fields: [
    { id: 'width', label: 'Width (pixels)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1920', half: true },
    { id: 'height', label: 'Height (pixels)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1080', half: true },
  ],
  formula: '<p><code>Aspect Ratio = Width : Height</code> simplified by dividing by GCD.</p>',
  calculate: function(v) {
    const g = core.gcd(v.width, v.height);
    const rw = v.width / g, rh = v.height / g;
    const ratio = rw / rh;
    return {
      'Aspect Ratio': rw + ':' + rh,
      'Decimal Ratio': core.formatNumber(ratio, 4),
      'Width': v.width + ' px',
      'Height': v.height + ' px',
      'Total Pixels': core.formatNumber(v.width * v.height, 0),
      'Megapixels': core.formatNumber(v.width * v.height / 1e6, 2),
    };
  }
});

// === PPI ===

R('ppi', {
  title: 'PPI (Pixels Per Inch) Calculator',
  description: 'Calculate pixel density from screen size and resolution.',
  tags: ['PPI', 'pixel density', 'screen', 'display', 'resolution'],
  fields: [
    { id: 'width', label: 'Width (pixels)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1920', half: true },
    { id: 'height', label: 'Height (pixels)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1080', half: true },
    { id: 'diagonal', label: 'Diagonal Size (inches)', type: 'number', step: 0.1, min: 0.1, placeholder: 'e.g. 24', half: true },
  ],
  formula: '<p><code>PPI = √(W² + H²) / Diagonal</code></p>',
  calculate: function(v) {
    const diagPx = Math.sqrt(v.width * v.width + v.height * v.height);
    const ppi = diagPx / v.diagonal;
    const totalPx = v.width * v.height;
    return {
      'PPI': core.formatNumber(ppi, 2),
      'Diagonal (pixels)': core.formatNumber(diagPx, 1),
      'Total Pixels': core.formatNumber(totalPx, 0),
      'Megapixels': core.formatNumber(totalPx / 1e6, 2),
    };
  }
});

// === IMAGE RESIZE ===

R('image-resize', {
  title: 'Image Resize Calculator',
  description: 'Calculate new image dimensions while maintaining aspect ratio.',
  tags: ['resize', 'image', 'dimensions', 'aspect ratio', 'scale'],
  fields: [
    { id: 'origW', label: 'Original Width (px)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1920', half: true },
    { id: 'origH', label: 'Original Height (px)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1080', half: true },
    { id: 'newW', label: 'New Width (px)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 960', half: true },
    { id: 'newH', label: 'New Height (px)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 540', half: true },
  ],
  formula: '<p>Enter original dimensions and either the new width or new height. The other is calculated to maintain the aspect ratio.</p>',
  calculate: function(v) {
    const ratio = v.origW / v.origH;
    let newW, newH;
    if (v.newW && !v.newH) {
      newW = v.newW;
      newH = Math.round(v.newW / ratio);
    } else if (v.newH && !v.newW) {
      newH = v.newH;
      newW = Math.round(v.newH * ratio);
    } else if (v.newW && v.newH) {
      newW = v.newW;
      newH = v.newH;
    } else {
      return { error: 'Enter either new width or new height.' };
    }
    const scale = newW / v.origW;
    const areaRatio = (newW * newH) / (v.origW * v.origH);
    return {
      'New Dimensions': newW + ' × ' + newH + ' px',
      'Scale Factor': core.formatNumber(scale, 4) + 'x',
      'Original Area': core.formatNumber(v.origW * v.origH, 0) + ' px²',
      'New Area': core.formatNumber(newW * newH, 0) + ' px²',
      'Area Change': core.formatPercent((areaRatio - 1) * 100),
    };
  }
});

// === ASPECT RATIO CALCULATOR (alias) ===

R('aspect-ratio-calculator', {
  title: 'Aspect Ratio Calculator',
  description: 'Calculate aspect ratio, width, or height for displays and images.',
  tags: ['aspect ratio', 'display', 'image', 'resolution'],
  fields: [
    { id: 'width', label: 'Width (pixels)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1920', half: true },
    { id: 'height', label: 'Height (pixels)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1080', half: true },
  ],
  formula: '<p><code>Aspect Ratio = Width : Height</code> simplified by dividing by GCD.</p>',
  calculate: function(v) {
    const g = core.gcd(v.width, v.height);
    const rw = v.width / g, rh = v.height / g;
    const ratio = rw / rh;
    return {
      'Aspect Ratio': rw + ':' + rh,
      'Decimal Ratio': core.formatNumber(ratio, 4),
      'Width': v.width + ' px',
      'Height': v.height + ' px',
      'Total Pixels': core.formatNumber(v.width * v.height, 0),
      'Megapixels': core.formatNumber(v.width * v.height / 1e6, 2),
    };
  }
});

// === PPI CALCULATOR (alias) ===

R('ppi-calculator', {
  title: 'PPI (Pixels Per Inch) Calculator',
  description: 'Calculate pixel density from screen size and resolution.',
  tags: ['PPI', 'pixel density', 'screen', 'display', 'resolution'],
  fields: [
    { id: 'width', label: 'Width (pixels)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1920', half: true },
    { id: 'height', label: 'Height (pixels)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1080', half: true },
    { id: 'diagonal', label: 'Diagonal Size (inches)', type: 'number', step: 0.1, min: 0.1, placeholder: 'e.g. 24', half: true },
  ],
  formula: '<p><code>PPI = √(W² + H²) / Diagonal</code></p>',
  calculate: function(v) {
    const diagPx = Math.sqrt(v.width * v.width + v.height * v.height);
    const ppi = diagPx / v.diagonal;
    const totalPx = v.width * v.height;
    return {
      'PPI': core.formatNumber(ppi, 2),
      'Diagonal (pixels)': core.formatNumber(diagPx, 1),
      'Total Pixels': core.formatNumber(totalPx, 0),
      'Megapixels': core.formatNumber(totalPx / 1e6, 2),
    };
  }
});

// === RESIZE CALCULATOR (alias) ===

R('resize-calculator', {
  title: 'Image Resize Calculator',
  description: 'Calculate new image dimensions while maintaining aspect ratio.',
  tags: ['resize', 'image', 'dimensions', 'aspect ratio', 'scale'],
  fields: [
    { id: 'origW', label: 'Original Width (px)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1920', half: true },
    { id: 'origH', label: 'Original Height (px)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 1080', half: true },
    { id: 'newW', label: 'New Width (px)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 960', half: true },
    { id: 'newH', label: 'New Height (px)', type: 'number', step: 1, min: 1, placeholder: 'e.g. 540', half: true },
  ],
  formula: '<p>Enter original dimensions and either the new width or new height. The other is calculated to maintain the aspect ratio.</p>',
  calculate: function(v) {
    const ratio = v.origW / v.origH;
    let newW, newH;
    if (v.newW && !v.newH) {
      newW = v.newW;
      newH = Math.round(v.newW / ratio);
    } else if (v.newH && !v.newW) {
      newH = v.newH;
      newW = Math.round(v.newH * ratio);
    } else if (v.newW && v.newH) {
      newW = v.newW;
      newH = v.newH;
    } else {
      return { error: 'Enter either new width or new height.' };
    }
    const scale = newW / v.origW;
    const areaRatio = (newW * newH) / (v.origW * v.origH);
    return {
      'New Dimensions': newW + ' × ' + newH + ' px',
      'Scale Factor': core.formatNumber(scale, 4) + 'x',
      'Original Area': core.formatNumber(v.origW * v.origH, 0) + ' px²',
      'New Area': core.formatNumber(newW * newH, 0) + ' px²',
      'Area Change': core.formatPercent((areaRatio - 1) * 100),
    };
  }
});

})(calculatorRegistry);
