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
  background: '<p>Aspect ratio compares width to height and is normally reduced to the smallest whole numbers, so 1920 by 1080 becomes 16:9. Reducing by the greatest common divisor preserves the proportion while making ratios easy to compare across displays, cameras and video formats. Common standards such as 4:3, 16:9 and 21:9 exist because content, sensors and screens are manufactured to matching shapes.</p>',
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
  background: '<p>Pixels per inch measures how densely a screen packs pixels, found by taking the pixel diagonal from the resolution and dividing by the physical diagonal. It differs from dots per inch, which describes printer output, although the two are often confused. Higher pixel density means individual pixels are harder to see at normal viewing distance, which is the idea behind high-density and retina displays.</p>',
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
  background: '<p>Resizing an image while preserving its aspect ratio keeps the proportions intact so the picture is not stretched or squashed. Only one new dimension needs to be chosen, because the other follows from the original ratio. Area changes with the square of the linear scale factor, so halving both dimensions leaves a quarter of the original pixels, which is why downscaling saves file size so quickly.</p>',
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
