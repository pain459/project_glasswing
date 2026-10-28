// Plane Geometry calculators
(function(reg) {
const R = reg.register.bind(reg, 'geometry-plane');

// === CIRCLE ===

R('circle', {
  title: 'Circle Calculator',
  description: 'Calculate area, circumference, and diameter of a circle from radius, diameter, circumference, or area.',
  tags: ['circle', 'area', 'circumference', 'radius', 'diameter'],
  fields: [
    { id: 'radius', label: 'Radius', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'diameter', label: 'Diameter', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'circumference', label: 'Circumference', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 31.42', half: true },
    { id: 'area', label: 'Area', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 78.54', half: true },
  ],
  formula: '<p><code>A = πr²</code>, <code>C = 2πr</code>, <code>d = 2r</code></p>',
  calculate: function(v) {
    let r;
    if (v.radius) r = v.radius;
    else if (v.diameter) r = v.diameter / 2;
    else if (v.circumference) r = v.circumference / (2 * Math.PI);
    else if (v.area) r = Math.sqrt(v.area / Math.PI);
    else return { error: 'Enter at least one value' };
    return {
      'Radius': core.formatNumber(r, 4),
      'Diameter': core.formatNumber(2 * r, 4),
      'Circumference': core.formatNumber(2 * Math.PI * r, 4),
      'Area': core.formatNumber(Math.PI * r * r, 4),
    };
  }
});

// === RECTANGLE ===

R('rectangle', {
  title: 'Rectangle Calculator',
  description: 'Calculate area, perimeter, and diagonal of a rectangle.',
  tags: ['rectangle', 'area', 'perimeter', 'diagonal'],
  fields: [
    { id: 'width', label: 'Width', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'height', label: 'Height', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>Area = w × h</code>, <code>Perimeter = 2(w + h)</code>, <code>Diagonal = √(w² + h²)</code></p>',
  calculate: function(v) {
    const w = v.width, h = v.height;
    if (!w || !h) return { error: 'Enter valid dimensions' };
    return {
      'Area': core.formatNumber(w * h, 4),
      'Perimeter': core.formatNumber(2 * (w + h), 4),
      'Diagonal': core.formatNumber(Math.sqrt(w * w + h * h), 4),
    };
  }
});

// === SQUARE ===

R('squares', {
  title: 'Square Calculator',
  description: 'Calculate area, perimeter, and diagonal of a square.',
  tags: ['square', 'area', 'perimeter', 'diagonal'],
  fields: [
    { id: 'side', label: 'Side Length', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'area', label: 'Area', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 25', half: true },
    { id: 'perimeter', label: 'Perimeter', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 20', half: true },
    { id: 'diagonal', label: 'Diagonal', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7.07', half: true },
  ],
  formula: '<p><code>Area = s²</code>, <code>Perimeter = 4s</code>, <code>Diagonal = s√2</code></p>',
  calculate: function(v) {
    let s;
    if (v.side) s = v.side;
    else if (v.area) s = Math.sqrt(v.area);
    else if (v.perimeter) s = v.perimeter / 4;
    else if (v.diagonal) s = v.diagonal / Math.sqrt(2);
    else return { error: 'Enter at least one value' };
    return {
      'Side': core.formatNumber(s, 4),
      'Area': core.formatNumber(s * s, 4),
      'Perimeter': core.formatNumber(4 * s, 4),
      'Diagonal': core.formatNumber(s * Math.sqrt(2), 4),
    };
  }
});

// === TRIANGLE (Right) ===

R('triangles-right', {
  title: 'Right Triangle Calculator',
  description: 'Calculate sides, area, and angles of a right triangle.',
  tags: ['triangle', 'right', 'pythagorean', 'area', 'angles'],
  fields: [
    { id: 'sideA', label: 'Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'sideB', label: 'Side b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'hypotenuse', label: 'Hypotenuse c', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>c = √(a² + b²)</code>, <code>Area = ab/2</code>, <code>Angle A = arctan(a/b)</code></p>',
  calculate: function(v) {
    let a = v.sideA, b = v.sideB, c;
    if (a && b) {
      c = Math.sqrt(a * a + b * b);
    } else if (a && v.hypotenuse) {
      c = v.hypotenuse;
      b = Math.sqrt(c * c - a * a);
      if (isNaN(b)) return { error: 'Invalid sides: a must be less than c' };
    } else if (b && v.hypotenuse) {
      c = v.hypotenuse;
      a = Math.sqrt(c * c - b * b);
      if (isNaN(a)) return { error: 'Invalid sides: b must be less than c' };
    } else {
      return { error: 'Enter at least two values' };
    }
    const angleA = core.rad2deg(Math.atan2(a, b));
    const angleB = core.rad2deg(Math.atan2(b, a));
    return {
      'Side a': core.formatNumber(a, 4),
      'Side b': core.formatNumber(b, 4),
      'Hypotenuse c': core.formatNumber(c, 4),
      'Area': core.formatNumber(a * b / 2, 4),
      'Perimeter': core.formatNumber(a + b + c, 4),
      'Angle A': core.formatNumber(angleA, 4) + '°',
      'Angle B': core.formatNumber(angleB, 4) + '°',
    };
  }
});

// === PYTHAGOREAN THEOREM ===

R('pythagorean-theorem', {
  title: 'Pythagorean Theorem Calculator',
  description: 'Calculate the hypotenuse or a missing side of a right triangle.',
  tags: ['pythagorean', 'hypotenuse', 'right triangle'],
  fields: [
    { id: 'sideA', label: 'Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
    { id: 'sideB', label: 'Side b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'hypotenuse', label: 'Hypotenuse c', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>a² + b² = c²</code>. Enter any two values to find the third.</p>',
  calculate: function(v) {
    let a, b, c;
    if (v.sideA && v.sideB) {
      a = v.sideA; b = v.sideB; c = Math.sqrt(a * a + b * b);
    } else if (v.sideA && v.hypotenuse) {
      a = v.sideA; c = v.hypotenuse; b = Math.sqrt(c * c - a * a);
      if (isNaN(b)) return { error: 'Hypotenuse must be longer than side a' };
    } else if (v.sideB && v.hypotenuse) {
      b = v.sideB; c = v.hypotenuse; a = Math.sqrt(c * c - b * b);
      if (isNaN(a)) return { error: 'Hypotenuse must be longer than side b' };
    } else {
      return { error: 'Enter exactly two values' };
    }
    return {
      'Side a': core.formatNumber(a, 4),
      'Side b': core.formatNumber(b, 4),
      'Hypotenuse c': core.formatNumber(c, 4),
    };
  }
});

// === EQUILATERAL TRIANGLE ===

R('triangles-equilateral', {
  title: 'Equilateral Triangle Calculator',
  description: 'Calculate area, perimeter, and height of an equilateral triangle.',
  tags: ['equilateral', 'triangle', 'area', 'perimeter', 'height'],
  fields: [
    { id: 'side', label: 'Side Length', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'area', label: 'Area', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10.83', half: true },
    { id: 'height', label: 'Height', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4.33', half: true },
  ],
  formula: '<p><code>Area = s²√3 / 4</code>, <code>Height = s√3 / 2</code>, <code>Perimeter = 3s</code></p>',
  calculate: function(v) {
    let s;
    if (v.side) s = v.side;
    else if (v.area) s = Math.sqrt(4 * v.area / Math.sqrt(3));
    else if (v.height) s = 2 * v.height / Math.sqrt(3);
    else return { error: 'Enter at least one value' };
    return {
      'Side': core.formatNumber(s, 4),
      'Area': core.formatNumber(s * s * Math.sqrt(3) / 4, 4),
      'Perimeter': core.formatNumber(3 * s, 4),
      'Height': core.formatNumber(s * Math.sqrt(3) / 2, 4),
    };
  }
});

// === ISOSCELES TRIANGLE ===

R('triangles-isosceles', {
  title: 'Isosceles Triangle Calculator',
  description: 'Calculate area, perimeter, and height of an isosceles triangle.',
  tags: ['isosceles', 'triangle', 'area', 'perimeter'],
  fields: [
    { id: 'sideA', label: 'Equal Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'base', label: 'Base b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 6', half: true },
    { id: 'height', label: 'Height', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4', half: true },
  ],
  formula: '<p><code>Height = √(a² − (b/2)²)</code>, <code>Area = bh/2</code>, <code>Perimeter = 2a + b</code></p>',
  calculate: function(v) {
    let a = v.sideA, b = v.base, h = v.height;
    if (a && b) {
      h = Math.sqrt(a * a - (b / 2) * (b / 2));
      if (isNaN(h)) return { error: 'Equal sides too short for given base' };
    } else if (a && h) {
      b = 2 * Math.sqrt(a * a - h * h);
      if (isNaN(b)) return { error: 'Height exceeds side length' };
    } else if (b && h) {
      a = Math.sqrt(h * h + (b / 2) * (b / 2));
    } else {
      return { error: 'Enter at least two values' };
    }
    return {
      'Equal Side': core.formatNumber(a, 4),
      'Base': core.formatNumber(b, 4),
      'Height': core.formatNumber(h, 4),
      'Area': core.formatNumber(b * h / 2, 4),
      'Perimeter': core.formatNumber(2 * a + b, 4),
    };
  }
});

// === LAW OF SINES ===

R('triangle-law-of-sines', {
  title: 'Law of Sines Calculator',
  description: 'Solve a triangle using the Law of Sines.',
  tags: ['law of sines', 'triangle', 'angles', 'sides'],
  fields: [
    { id: 'angleA', label: 'Angle A (degrees)', type: 'number', step: 0.1, min: 0.1, max: 179.9, placeholder: 'e.g. 30', half: true },
    { id: 'sideA', label: 'Side a (opposite A)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'angleB', label: 'Angle B (degrees)', type: 'number', step: 0.1, min: 0.1, max: 179.9, placeholder: 'e.g. 45', half: true },
    { id: 'sideB', label: 'Side b (opposite B)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7', half: true },
  ],
  formula: '<p><code>a/sin(A) = b/sin(B) = c/sin(C)</code>. Enter an angle-side pair plus one more value.</p>',
  calculate: function(v) {
    let A = v.angleA, a = v.sideA, B = v.angleB, b = v.sideB;
    let C, c;
    // Need at least one angle-side pair + one more
    if (!((A && a) || (B && b))) return { error: 'Enter at least one angle-side pair' };
    if (!A && !a && !B && !b) return { error: 'Enter values' };

    // Derive missing angle-side pair
    if (A && a && B) {
      b = a * Math.sin(core.deg2rad(B)) / Math.sin(core.deg2rad(A));
    } else if (A && a && b) {
      B = core.rad2deg(Math.asin(b * Math.sin(core.deg2rad(A)) / a));
      if (isNaN(B) || B <= 0) return { error: 'No valid triangle' };
    } else if (B && b && A) {
      a = b * Math.sin(core.deg2rad(A)) / Math.sin(core.deg2rad(B));
    } else if (B && b && a) {
      A = core.rad2deg(Math.asin(a * Math.sin(core.deg2rad(B)) / b));
      if (isNaN(A) || A <= 0) return { error: 'No valid triangle' };
    } else {
      return { error: 'Enter an angle-side pair plus one more value' };
    }

    C = 180 - A - B;
    if (C <= 0) return { error: 'Angles exceed 180°' };
    c = a * Math.sin(core.deg2rad(C)) / Math.sin(core.deg2rad(A));
    const area = 0.5 * a * b * Math.sin(core.deg2rad(C));
    return {
      'Angle A': core.formatNumber(A, 4) + '°',
      'Angle B': core.formatNumber(B, 4) + '°',
      'Angle C': core.formatNumber(C, 4) + '°',
      'Side a': core.formatNumber(a, 4),
      'Side b': core.formatNumber(b, 4),
      'Side c': core.formatNumber(c, 4),
      'Area': core.formatNumber(area, 4),
      'Perimeter': core.formatNumber(a + b + c, 4),
    };
  }
});

// === LAW OF COSINES ===

R('triangle-law-of-cosines', {
  title: 'Law of Cosines Calculator',
  description: 'Solve a triangle using the Law of Cosines.',
  tags: ['law of cosines', 'triangle', 'SAS', 'SSS'],
  fields: [
    { id: 'sideA', label: 'Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7', half: true },
    { id: 'sideB', label: 'Side b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 8', half: true },
    { id: 'sideC', label: 'Side c', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'angleC', label: 'Angle C (degrees)', type: 'number', step: 0.1, min: 0.1, max: 179.9, placeholder: 'e.g. 45', half: true },
  ],
  formula: '<p><code>c² = a² + b² − 2ab·cos(C)</code>. Enter 3 sides (SSS) or 2 sides + included angle (SAS).</p>',
  calculate: function(v) {
    const a = v.sideA, b = v.sideB, c = v.sideC, Cdeg = v.angleC;
    let A, B, C, sideC;

    if (a && b && c) {
      // SSS
      const cosA = (b * b + c * c - a * a) / (2 * b * c);
      const cosB = (a * a + c * c - b * b) / (2 * a * c);
      if (cosA <= -1 || cosA >= 1 || cosB <= -1 || cosB >= 1) return { error: 'Sides do not form a valid triangle' };
      A = core.rad2deg(Math.acos(cosA));
      B = core.rad2deg(Math.acos(cosB));
      C = 180 - A - B;
      sideC = c;
    } else if (a && b && Cdeg) {
      // SAS
      C = Cdeg;
      sideC = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(core.deg2rad(C)));
      A = core.rad2deg(Math.asin(a * Math.sin(core.deg2rad(C)) / sideC));
      B = 180 - A - C;
    } else {
      return { error: 'Enter 3 sides or 2 sides + included angle' };
    }
    const area = 0.5 * a * b * Math.sin(core.deg2rad(C));
    return {
      'Angle A': core.formatNumber(A, 4) + '°',
      'Angle B': core.formatNumber(B, 4) + '°',
      'Angle C': core.formatNumber(C, 4) + '°',
      'Side a': core.formatNumber(a, 4),
      'Side b': core.formatNumber(b, 4),
      'Side c': core.formatNumber(sideC, 4),
      'Area': core.formatNumber(area, 4),
      'Perimeter': core.formatNumber(a + b + sideC, 4),
    };
  }
});

// === TRIANGLE THEOREMS (General Triangle) ===

R('triangle-theorems', {
  title: 'Triangle Theorems Calculator',
  description: 'Calculate triangle properties: centroid, incenter, circumcenter, and orthocenter.',
  tags: ['triangle', 'theorems', 'centroid', 'incenter', 'circumcenter'],
  fields: [
    { id: 'sideA', label: 'Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7', half: true },
    { id: 'sideB', label: 'Side b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 8', half: true },
    { id: 'sideC', label: 'Side c', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 9', half: true },
  ],
  formula: '<p>Uses Heron\'s formula for area, then computes medians, inradius, and circumradius.</p>',
  calculate: function(v) {
    const a = v.sideA, b = v.sideB, c = v.sideC;
    if (!a || !b || !c) return { error: 'Enter all three sides' };
    if (a + b <= c || a + c <= b || b + c <= a) return { error: 'Sides do not form a valid triangle' };
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    if (isNaN(area)) return { error: 'Invalid triangle' };
    const inRadius = area / s;
    const circumRadius = (a * b * c) / (4 * area);
    const medianA = 0.5 * Math.sqrt(2 * b * b + 2 * c * c - a * a);
    const medianB = 0.5 * Math.sqrt(2 * a * a + 2 * c * c - b * b);
    const medianC = 0.5 * Math.sqrt(2 * a * a + 2 * b * b - c * c);
    const heightA = 2 * area / a;
    const heightB = 2 * area / b;
    const heightC = 2 * area / c;
    return {
      'Area': core.formatNumber(area, 4),
      'Perimeter': core.formatNumber(a + b + c, 4),
      'Semiperimeter': core.formatNumber(s, 4),
      'Inradius': core.formatNumber(inRadius, 4),
      'Circumradius': core.formatNumber(circumRadius, 4),
      'Median to a': core.formatNumber(medianA, 4),
      'Median to b': core.formatNumber(medianB, 4),
      'Median to c': core.formatNumber(medianC, 4),
      'Height to a': core.formatNumber(heightA, 4),
      'Height to b': core.formatNumber(heightB, 4),
      'Height to c': core.formatNumber(heightC, 4),
    };
  }
});

// === PARALLELOGRAM ===

R('parallelogram', {
  title: 'Parallelogram Calculator',
  description: 'Calculate area, perimeter, and diagonals of a parallelogram.',
  tags: ['parallelogram', 'area', 'perimeter', 'diagonals'],
  fields: [
    { id: 'sideA', label: 'Side a', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'sideB', label: 'Side b', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 8', half: true },
    { id: 'angle', label: 'Angle (degrees)', type: 'number', step: 0.1, min: 0.1, max: 179.9, placeholder: 'e.g. 60', half: true },
    { id: 'height', label: 'Height', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4.33', half: true },
  ],
  formula: '<p><code>Area = ab·sin(θ)</code>, <code>Perimeter = 2(a + b)</code></p>',
  calculate: function(v) {
    const a = v.sideA, b = v.sideB;
    if (!a || !b) return { error: 'Enter both sides' };
    let angleDeg, h;
    if (v.angle) {
      angleDeg = v.angle;
      h = b * Math.sin(core.deg2rad(angleDeg));
    } else if (v.height) {
      h = v.height;
      angleDeg = core.rad2deg(Math.asin(h / b));
      if (isNaN(angleDeg) || angleDeg <= 0) return { error: 'Height exceeds side b' };
    } else {
      return { error: 'Enter angle or height' };
    }
    const area = a * h;
    const diag1 = Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(core.deg2rad(angleDeg)));
    const diag2 = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(core.deg2rad(angleDeg)));
    return {
      'Area': core.formatNumber(area, 4),
      'Perimeter': core.formatNumber(2 * (a + b), 4),
      'Height': core.formatNumber(h, 4),
      'Angle': core.formatNumber(angleDeg, 4) + '°',
      'Diagonal 1': core.formatNumber(diag1, 4),
      'Diagonal 2': core.formatNumber(diag2, 4),
    };
  }
});

// === TRAPEZOID ===

R('trapezoid', {
  title: 'Trapezoid Calculator',
  description: 'Calculate area, perimeter, and height of a trapezoid.',
  tags: ['trapezoid', 'area', 'perimeter', 'height'],
  fields: [
    { id: 'baseA', label: 'Base a (top)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 6', half: true },
    { id: 'baseB', label: 'Base b (bottom)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'height', label: 'Height', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'sideC', label: 'Side c (left)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'sideD', label: 'Side d (right)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>Area = (a + b) × h / 2</code>, <code>Perimeter = a + b + c + d</code></p>',
  calculate: function(v) {
    const a = v.baseA, b = v.baseB, h = v.height;
    if (!a || !b) return { error: 'Enter both bases' };
    let area, c = v.sideC, d = v.sideD;
    if (h) {
      area = (a + b) * h / 2;
    } else if (c && d) {
      // Derive height from sides using the difference in bases
      const diff = b - a;
      // h = sqrt(c^2 - x^2) where x is horizontal projection
      // For isosceles: h = sqrt(c^2 - (diff/2)^2)
      const hCalc = Math.sqrt(c * c - (diff / 2) * (diff / 2));
      if (isNaN(hCalc)) return { error: 'Sides too short for base difference' };
      h = hCalc;
      area = (a + b) * h / 2;
    } else {
      return { error: 'Enter height or both non-parallel sides' };
    }
    const perimeter = c && d ? a + b + c + d : (a + b + 2 * h);
    return {
      'Area': core.formatNumber(area, 4),
      'Perimeter': core.formatNumber(perimeter, 4),
      'Height': core.formatNumber(h, 4),
    };
  }
});

// === RHOMBUS ===

R('rhombus', {
  title: 'Rhombus Calculator',
  description: 'Calculate area, perimeter, and diagonals of a rhombus.',
  tags: ['rhombus', 'area', 'perimeter', 'diagonals'],
  fields: [
    { id: 'side', label: 'Side Length', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
    { id: 'diagonal1', label: 'Diagonal p', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 6', half: true },
    { id: 'diagonal2', label: 'Diagonal q', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 8', half: true },
    { id: 'height', label: 'Height', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 4.8', half: true },
  ],
  formula: '<p><code>Area = pq/2 = s × h</code>, <code>Perimeter = 4s</code>, <code>s = √((p/2)² + (q/2)²)</code></p>',
  calculate: function(v) {
    let s = v.side, p = v.diagonal1, q = v.diagonal2, h = v.height;
    if (p && q) {
      s = Math.sqrt((p / 2) * (p / 2) + (q / 2) * (q / 2));
      h = (p * q) / (2 * s);
    } else if (s && p) {
      q = 2 * Math.sqrt(s * s - (p / 2) * (p / 2));
      if (isNaN(q)) return { error: 'Diagonal p too long for side' };
      h = (p * q) / (2 * s);
    } else if (s && h) {
      const area = s * h;
      // p*q = 2*area, and p^2 + q^2 = 4s^2
      // We need another constraint; just report what we can
      p = 2 * s; // max diagonal
      q = 2 * h; // min diagonal
    } else {
      return { error: 'Enter at least two values' };
    }
    return {
      'Side': core.formatNumber(s, 4),
      'Diagonal p': core.formatNumber(p, 4),
      'Diagonal q': core.formatNumber(q, 4),
      'Area': core.formatNumber(p * q / 2, 4),
      'Perimeter': core.formatNumber(4 * s, 4),
      'Height': core.formatNumber(h, 4),
    };
  }
});

// === REGULAR POLYGON ===

R('polygon', {
  title: 'Regular Polygon Calculator',
  description: 'Calculate area, perimeter, and properties of a regular polygon.',
  tags: ['polygon', 'regular', 'area', 'perimeter', 'apothem'],
  fields: [
    { id: 'sides', label: 'Number of Sides', type: 'number', step: 1, min: 3, max: 100, placeholder: 'e.g. 6', half: true },
    { id: 'sideLength', label: 'Side Length', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>Area = n·s² / (4·tan(π/n))</code>, <code>Perimeter = n·s</code>, <code>Apothem = s / (2·tan(π/n))</code></p>',
  calculate: function(v) {
    const n = v.sides, s = v.sideLength;
    if (!n || !s) return { error: 'Enter number of sides and side length' };
    const interiorAngle = (n - 2) * 180 / n;
    const exteriorAngle = 360 / n;
    const apothem = s / (2 * Math.tan(Math.PI / n));
    const area = n * s * s / (4 * Math.tan(Math.PI / n));
    const perimeter = n * s;
    const circumRadius = s / (2 * Math.sin(Math.PI / n));
    return {
      'Number of Sides': n,
      'Side Length': core.formatNumber(s, 4),
      'Area': core.formatNumber(area, 4),
      'Perimeter': core.formatNumber(perimeter, 4),
      'Apothem': core.formatNumber(apothem, 4),
      'Interior Angle': core.formatNumber(interiorAngle, 4) + '°',
      'Exterior Angle': core.formatNumber(exteriorAngle, 4) + '°',
      'Circumradius': core.formatNumber(circumRadius, 4),
    };
  }
});

// === ANNULUS ===

R('annulus', {
  title: 'Annulus Calculator',
  description: 'Calculate the area and circumference of an annulus (ring between two circles).',
  tags: ['annulus', 'ring', 'area', 'circle'],
  fields: [
    { id: 'outerRadius', label: 'Outer Radius R', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
    { id: 'innerRadius', label: 'Inner Radius r', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p><code>Area = π(R² − r²)</code>, <code>Width = R − r</code></p>',
  calculate: function(v) {
    const R = v.outerRadius, r = v.innerRadius;
    if (!R || !r) return { error: 'Enter both radii' };
    if (r >= R) return { error: 'Inner radius must be less than outer radius' };
    return {
      'Area': core.formatNumber(Math.PI * (R * R - r * r), 4),
      'Outer Circumference': core.formatNumber(2 * Math.PI * R, 4),
      'Inner Circumference': core.formatNumber(2 * Math.PI * r, 4),
      'Width': core.formatNumber(R - r, 4),
      'Outer Area': core.formatNumber(Math.PI * R * R, 4),
      'Inner Area': core.formatNumber(Math.PI * r * r, 4),
    };
  }
});

// === DISTANCE BETWEEN TWO POINTS ===

R('distance-two-points', {
  title: '2D Distance Calculator',
  description: 'Calculate the distance between two points in a 2D plane.',
  tags: ['distance', '2D', 'points', 'coordinates'],
  fields: [
    { id: 'x1', label: 'x₁', type: 'number', step: 0.01, placeholder: 'e.g. 1', half: true },
    { id: 'y1', label: 'y₁', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
    { id: 'x2', label: 'x₂', type: 'number', step: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'y2', label: 'y₂', type: 'number', step: 0.01, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p><code>d = √((x₂ − x₁)² + (y₂ − y₁)²)</code></p>',
  calculate: function(v) {
    const dx = v.x2 - v.x1, dy = v.y2 - v.y1;
    const d = Math.sqrt(dx * dx + dy * dy);
    return {
      'Distance': core.formatNumber(d, 4),
      'Δx': core.formatNumber(dx, 4),
      'Δy': core.formatNumber(dy, 4),
    };
  }
});

// === MIDPOINT CALCULATOR ===

R('midpoint-calculator', {
  title: 'Midpoint Calculator',
  description: 'Calculate the midpoint between two points in a 2D plane.',
  tags: ['midpoint', '2D', 'points', 'coordinates'],
  fields: [
    { id: 'x1', label: 'x₁', type: 'number', step: 0.01, placeholder: 'e.g. 1', half: true },
    { id: 'y1', label: 'y₁', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
    { id: 'x2', label: 'x₂', type: 'number', step: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'y2', label: 'y₂', type: 'number', step: 0.01, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p><code>M = ((x₁ + x₂)/2, (y₁ + y₂)/2)</code></p>',
  calculate: function(v) {
    const mx = (v.x1 + v.x2) / 2, my = (v.y1 + v.y2) / 2;
    return {
      'Midpoint x': core.formatNumber(mx, 4),
      'Midpoint y': core.formatNumber(my, 4),
      'Midpoint': '(' + core.formatNumber(mx, 4) + ', ' + core.formatNumber(my, 4) + ')',
    };
  }
});

// === SLOPE CALCULATOR ===

R('slope-calculator', {
  title: 'Slope Calculator',
  description: 'Calculate the slope, angle, and intercept between two points.',
  tags: ['slope', 'gradient', 'line', '2D'],
  fields: [
    { id: 'x1', label: 'x₁', type: 'number', step: 0.01, placeholder: 'e.g. 1', half: true },
    { id: 'y1', label: 'y₁', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
    { id: 'x2', label: 'x₂', type: 'number', step: 0.01, placeholder: 'e.g. 4', half: true },
    { id: 'y2', label: 'y₂', type: 'number', step: 0.01, placeholder: 'e.g. 6', half: true },
  ],
  formula: '<p><code>m = (y₂ − y₁) / (x₂ − x₁)</code>, <code>y = mx + b</code></p>',
  calculate: function(v) {
    const dx = v.x2 - v.x1, dy = v.y2 - v.y1;
    if (dx === 0) {
      return {
        'Slope': 'Undefined (vertical line)',
        'Angle': '90°',
        'Equation': 'x = ' + core.formatNumber(v.x1, 4),
      };
    }
    const m = dy / dx;
    const b = v.y1 - m * v.x1;
    const angle = core.rad2deg(Math.atan(m));
    return {
      'Slope': core.formatNumber(m, 4),
      'Y-Intercept': core.formatNumber(b, 4),
      'Angle': core.formatNumber(angle, 4) + '°',
      'Equation': 'y = ' + core.formatNumber(m, 4) + 'x ' + (b >= 0 ? '+ ' : '− ') + core.formatNumber(Math.abs(b), 4),
    };
  }
});

// === GEOMETRIC SHAPES OVERVIEW ===

R('geometricshapes', {
  title: 'Geometric Shapes Reference',
  description: 'Reference table of formulas for common plane geometric shapes.',
  tags: ['shapes', 'reference', 'formulas', 'geometry'],
  fields: [
    { id: 'shape', label: 'Shape', type: 'select', options: [
      { value: 'all', label: 'All Shapes' },
      { value: 'circle', label: 'Circle' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'rectangle', label: 'Rectangle' },
      { value: 'square', label: 'Square' },
      { value: 'parallelogram', label: 'Parallelogram' },
      { value: 'trapezoid', label: 'Trapezoid' },
      { value: 'rhombus', label: 'Rhombus' },
      { value: 'polygon', label: 'Regular Polygon' },
    ]},
  ],
  calculate: function(v) {
    const shapes = {
      circle: { name: 'Circle', area: 'πr²', perimeter: '2πr', notes: 'r = radius' },
      triangle: { name: 'Triangle', area: 'bh/2', perimeter: 'a + b + c', notes: 'b = base, h = height' },
      rectangle: { name: 'Rectangle', area: 'wh', perimeter: '2(w + h)', notes: 'w = width, h = height' },
      square: { name: 'Square', area: 's²', perimeter: '4s', notes: 's = side length' },
      parallelogram: { name: 'Parallelogram', area: 'bh', perimeter: '2(a + b)', notes: 'b = base, h = height' },
      trapezoid: { name: 'Trapezoid', area: '(a+b)h/2', perimeter: 'a + b + c + d', notes: 'a,b = parallel sides' },
      rhombus: { name: 'Rhombus', area: 'pq/2', perimeter: '4s', notes: 'p,q = diagonals' },
      polygon: { name: 'Regular Polygon', area: 'ns²/(4·tan(π/n))', perimeter: 'ns', notes: 'n = sides, s = side length' },
    };
    let rows = '';
    const filter = v.shape || 'all';
    const entries = filter === 'all' ? Object.entries(shapes) : [[filter, shapes[filter]]];
    for (const [key, s] of entries) {
      if (!s) continue;
      rows += `<tr><td>${s.name}</td><td>${s.area}</td><td>${s.perimeter}</td><td>${s.notes}</td></tr>`;
    }
    return {
      html: `<table>
        <tr><th>Shape</th><th>Area Formula</th><th>Perimeter Formula</th><th>Notes</th></tr>
        ${rows}
      </table>`
    };
  }
});

// === STADIUM (Capsule) ===

R('stadium', {
  title: 'Stadium Calculator',
  description: 'Calculate area and perimeter of a stadium (rectangle with semicircular ends).',
  tags: ['stadium', 'capsule', 'area', 'perimeter'],
  fields: [
    { id: 'length', label: 'Length (straight portion)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 10', half: true },
    { id: 'radius', label: 'Radius (semicircle ends)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3', half: true },
  ],
  formula: '<p><code>Area = 2rL + πr²</code>, <code>Perimeter = 2L + 2πr</code></p>',
  calculate: function(v) {
    const L = v.length || 0, r = v.radius;
    if (!r) return { error: 'Enter a radius' };
    const area = 2 * r * L + Math.PI * r * r;
    const perimeter = 2 * L + 2 * Math.PI * r;
    const width = 2 * r;
    const totalLength = L + 2 * r;
    return {
      'Area': core.formatNumber(area, 4),
      'Perimeter': core.formatNumber(perimeter, 4),
      'Width': core.formatNumber(width, 4),
      'Total Length': core.formatNumber(totalLength, 4),
      'Rectangle Area': core.formatNumber(2 * r * L, 4),
      'Semicircles Area': core.formatNumber(Math.PI * r * r, 4),
    };
  }
});

})(calculatorRegistry);
