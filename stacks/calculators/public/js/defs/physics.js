// Physics calculators
(function(reg) {
const R = reg.register.bind(reg, 'physics');

// === KINEMATICS ===

R('velocity_avg', {
  title: 'Average Velocity Calculator',
  description: 'Calculate average velocity from displacement and time.',
  tags: ['velocity', 'average', 'speed', 'kinematics'],
  fields: [
    { id: 'displacement', label: 'Displacement (m)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>v_avg = Δx / Δt</code> where Δx is displacement and Δt is time interval.</p>',
  calculate: function(v) {
    if (!v.displacement || !v.time) return { error: 'Enter valid values' };
    const v_avg = v.displacement / v.time;
    return {
      'Average Velocity': core.formatNumber(v_avg, 4) + ' m/s',
      'Displacement': core.formatNumber(v.displacement, 4) + ' m',
      'Time': core.formatNumber(v.time, 4) + ' s',
    };
  }
});

R('acceleration', {
  title: 'Acceleration Calculator',
  description: 'Calculate acceleration from change in velocity over time.',
  tags: ['acceleration', 'velocity', 'kinematics'],
  fields: [
    { id: 'vFinal', label: 'Final Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 30' },
    { id: 'vInitial', label: 'Initial Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 0', half: true },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>a = (v_f − v_i) / t</code> where v_f is final velocity, v_i is initial velocity, and t is time.</p>',
  calculate: function(v) {
    if (!v.time) return { error: 'Enter valid values' };
    const a = (v.vFinal - (v.vInitial || 0)) / v.time;
    return {
      'Acceleration': core.formatNumber(a, 4) + ' m/s²',
      'Change in Velocity': core.formatNumber(v.vFinal - (v.vInitial || 0), 4) + ' m/s',
      'Time': core.formatNumber(v.time, 4) + ' s',
    };
  }
});

R('displacement', {
  title: 'Displacement Calculator',
  description: 'Calculate displacement using velocity, acceleration, and time.',
  tags: ['displacement', 'kinematics', 'motion'],
  fields: [
    { id: 'vInitial', label: 'Initial Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
    { id: 'acceleration', label: 'Acceleration (m/s²)', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>s = v_i × t + ½ × a × t²</code> where v_i is initial velocity, a is acceleration, and t is time.</p>',
  calculate: function(v) {
    if (!v.time) return { error: 'Enter valid values' };
    const s = (v.vInitial || 0) * v.time + 0.5 * (v.acceleration || 0) * v.time * v.time;
    const vFinal = (v.vInitial || 0) + (v.acceleration || 0) * v.time;
    return {
      'Displacement': core.formatNumber(s, 4) + ' m',
      'Final Velocity': core.formatNumber(vFinal, 4) + ' m/s',
      'Average Velocity': core.formatNumber((vFinal + (v.vInitial || 0)) / 2, 4) + ' m/s',
    };
  }
});

// === DYNAMICS (FORCES) ===

R('force', {
  title: 'Force Calculator',
  description: 'Calculate force using Newton\'s Second Law, F = ma.',
  tags: ['force', 'mass', 'acceleration', 'newton'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10' },
    { id: 'acceleration', label: 'Acceleration (m/s²)', type: 'number', step: 0.01, placeholder: 'e.g. 9.8' },
  ],
  formula: '<p><code>F = m × a</code> where m is mass and a is acceleration.</p>',
  calculate: function(v) {
    if (!v.mass || !v.acceleration) return { error: 'Enter valid values' };
    const F = v.mass * v.acceleration;
    return {
      'Force': core.formatNumber(F, 4) + ' N',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Acceleration': core.formatNumber(v.acceleration, 4) + ' m/s²',
    };
  }
});

R('newton-second-law', {
  title: "Newton's Second Law Calculator",
  description: 'Solve for any variable in F = ma: force, mass, or acceleration.',
  tags: ['newton', 'second law', 'force', 'mass', 'acceleration'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50', half: true },
    { id: 'acceleration', label: 'Acceleration (m/s²)', type: 'number', step: 0.01, placeholder: 'e.g. 9.8', half: true },
  ],
  formula: '<p><code>F = m × a</code>. Enter mass and acceleration to find force, or leave one blank to solve for it given force.</p>',
  calculate: function(v) {
    const F = v.mass * (v.acceleration || 0);
    if (v.mass && v.acceleration) {
      return {
        'Force': core.formatNumber(F, 4) + ' N',
        'Mass': core.formatNumber(v.mass, 4) + ' kg',
        'Acceleration': core.formatNumber(v.acceleration, 4) + ' m/s²',
      };
    } else if (v.mass && !v.acceleration) {
      return {
        'Force': 'Enter acceleration to calculate force, or use the Force Calculator.',
        'Mass': core.formatNumber(v.mass, 4) + ' kg',
      };
    } else {
      return { error: 'Enter at least mass and acceleration' };
    }
  }
});

R('gravitational-force', {
  title: 'Gravitational Force Calculator',
  description: 'Calculate the gravitational force between two masses.',
  tags: ['gravity', 'gravitational force', 'universal', 'newton'],
  fields: [
    { id: 'mass1', label: 'Mass 1 (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5.972e24' },
    { id: 'mass2', label: 'Mass 2 (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7.348e22', half: true },
    { id: 'distance', label: 'Distance (m)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 3.844e8', half: true },
  ],
  formula: '<p><code>F = G × m₁ × m₂ / r²</code> where G = 6.674 × 10⁻¹¹ N·m²/kg².</p>',
  calculate: function(v) {
    if (!v.mass1 || !v.mass2 || !v.distance) return { error: 'Enter valid values' };
    const G = 6.674e-11;
    const F = G * v.mass1 * v.mass2 / (v.distance * v.distance);
    return {
      'Gravitational Force': F.toExponential(4) + ' N',
      'Force (decimal)': core.formatNumber(F, 6) + ' N',
      'Distance': v.distance.toExponential(4) + ' m',
    };
  }
});

// === ENERGY ===

R('kinetic-energy', {
  title: 'Kinetic Energy Calculator',
  description: 'Calculate kinetic energy from mass and velocity.',
  tags: ['kinetic', 'energy', 'KE', 'motion'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1000' },
    { id: 'velocity', label: 'Velocity (m/s)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 25' },
  ],
  formula: '<p><code>KE = ½ × m × v²</code> where m is mass and v is velocity.</p>',
  calculate: function(v) {
    if (!v.mass || !v.velocity) return { error: 'Enter valid values' };
    const KE = 0.5 * v.mass * v.velocity * v.velocity;
    return {
      'Kinetic Energy': core.formatNumber(KE, 4) + ' J',
      'Kinetic Energy (kJ)': core.formatNumber(KE / 1000, 4) + ' kJ',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Velocity': core.formatNumber(v.velocity, 4) + ' m/s',
    };
  }
});

R('potential-energy', {
  title: 'Potential Energy Calculator',
  description: 'Calculate gravitational potential energy from mass, gravity, and height.',
  tags: ['potential', 'energy', 'PE', 'gravitational'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10' },
    { id: 'gravity', label: 'Gravity (m/s²)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 9.81', half: true },
    { id: 'height', label: 'Height (m)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50', half: true },
  ],
  formula: '<p><code>PE = m × g × h</code> where m is mass, g is gravitational acceleration, and h is height.</p>',
  calculate: function(v) {
    if (!v.mass || !v.height) return { error: 'Enter valid values' };
    const g = v.gravity || 9.81;
    const PE = v.mass * g * v.height;
    return {
      'Potential Energy': core.formatNumber(PE, 4) + ' J',
      'Potential Energy (kJ)': core.formatNumber(PE / 1000, 4) + ' kJ',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Height': core.formatNumber(v.height, 4) + ' m',
    };
  }
});

// === POWER & WORK ===

R('power', {
  title: 'Power Calculator',
  description: 'Calculate power from work and time.',
  tags: ['power', 'work', 'watt', 'rate'],
  fields: [
    { id: 'work', label: 'Work (J)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5000' },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10' },
  ],
  formula: '<p><code>P = W / t</code> where W is work done and t is time.</p>',
  calculate: function(v) {
    if (!v.work || !v.time) return { error: 'Enter valid values' };
    const P = v.work / v.time;
    return {
      'Power': core.formatNumber(P, 4) + ' W',
      'Power (kW)': core.formatNumber(P / 1000, 4) + ' kW',
      'Work': core.formatNumber(v.work, 4) + ' J',
      'Time': core.formatNumber(v.time, 4) + ' s',
    };
  }
});

R('work', {
  title: 'Work Calculator',
  description: 'Calculate work done by a force over a displacement.',
  tags: ['work', 'force', 'displacement', 'energy'],
  fields: [
    { id: 'force', label: 'Force (N)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100' },
    { id: 'displacement', label: 'Displacement (m)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5', half: true },
    { id: 'angle', label: 'Angle (degrees)', type: 'number', step: 1, min: 0, max: 180, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p><code>W = F × d × cos(θ)</code> where F is force, d is displacement, and θ is the angle between them.</p>',
  calculate: function(v) {
    if (!v.force || !v.displacement) return { error: 'Enter valid values' };
    const angleRad = ((v.angle || 0) * Math.PI) / 180;
    const W = v.force * v.displacement * Math.cos(angleRad);
    return {
      'Work': core.formatNumber(W, 4) + ' J',
      'Force': core.formatNumber(v.force, 4) + ' N',
      'Displacement': core.formatNumber(v.displacement, 4) + ' m',
      'cos(θ)': core.formatNumber(Math.cos(angleRad), 4),
    };
  }
});

// === MATERIALS PROPERTIES ===

R('density', {
  title: 'Density Calculator',
  description: 'Calculate density from mass and volume.',
  tags: ['density', 'mass', 'volume'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 7.8' },
    { id: 'volume', label: 'Volume (m³)', type: 'number', step: 0.001, min: 0.001, placeholder: 'e.g. 0.001' },
  ],
  formula: '<p><code>ρ = m / V</code> where m is mass and V is volume.</p>',
  calculate: function(v) {
    if (!v.mass || !v.volume) return { error: 'Enter valid values' };
    const rho = v.mass / v.volume;
    return {
      'Density': core.formatNumber(rho, 4) + ' kg/m³',
      'Density (g/cm³)': core.formatNumber(rho / 1000, 4) + ' g/cm³',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Volume': core.formatNumber(v.volume, 6) + ' m³',
    };
  }
});

R('pressure', {
  title: 'Pressure Calculator',
  description: 'Calculate pressure from force and area.',
  tags: ['pressure', 'force', 'area', 'pascal'],
  fields: [
    { id: 'force', label: 'Force (N)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1000' },
    { id: 'area', label: 'Area (m²)', type: 'number', step: 0.001, min: 0.001, placeholder: 'e.g. 0.5' },
  ],
  formula: '<p><code>P = F / A</code> where F is force and A is area.</p>',
  calculate: function(v) {
    if (!v.force || !v.area) return { error: 'Enter valid values' };
    const P = v.force / v.area;
    return {
      'Pressure': core.formatNumber(P, 4) + ' Pa',
      'Pressure (kPa)': core.formatNumber(P / 1000, 4) + ' kPa',
      'Pressure (atm)': core.formatNumber(P / 101325, 4) + ' atm',
      'Force': core.formatNumber(v.force, 4) + ' N',
      'Area': core.formatNumber(v.area, 6) + ' m²',
    };
  }
});

// === MOMENTUM ===

R('momentum', {
  title: 'Momentum Calculator',
  description: 'Calculate momentum from mass and velocity.',
  tags: ['momentum', 'mass', 'velocity'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1500' },
    { id: 'velocity', label: 'Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 20' },
  ],
  formula: '<p><code>p = m × v</code> where m is mass and v is velocity.</p>',
  calculate: function(v) {
    if (!v.mass || v.velocity === undefined) return { error: 'Enter valid values' };
    const p = v.mass * v.velocity;
    return {
      'Momentum': core.formatNumber(p, 4) + ' kg·m/s',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Velocity': core.formatNumber(v.velocity, 4) + ' m/s',
    };
  }
});

// === ELECTRICITY ===

R('electric-charge', {
  title: 'Electric Charge Calculator',
  description: 'Calculate electric charge from current and time.',
  tags: ['charge', 'current', 'coulomb', 'electricity'],
  fields: [
    { id: 'current', label: 'Current (A)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 2' },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 60' },
  ],
  formula: '<p><code>Q = I × t</code> where I is current and t is time.</p>',
  calculate: function(v) {
    if (!v.current || !v.time) return { error: 'Enter valid values' };
    const Q = v.current * v.time;
    return {
      'Charge': core.formatNumber(Q, 4) + ' C',
      'Current': core.formatNumber(v.current, 4) + ' A',
      'Time': core.formatNumber(v.time, 4) + ' s',
    };
  }
});

R('ohms-law', {
  title: "Ohm's Law Calculator",
  description: 'Calculate voltage, current, or resistance using V = IR.',
  tags: ['ohm', 'voltage', 'current', 'resistance', 'electricity'],
  fields: [
    { id: 'current', label: 'Current (A)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 2', half: true },
    { id: 'resistance', label: 'Resistance (Ω)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100', half: true },
  ],
  formula: '<p><code>V = I × R</code> where V is voltage, I is current, and R is resistance.</p>',
  calculate: function(v) {
    if (!v.current || !v.resistance) return { error: 'Enter current and resistance' };
    const V = v.current * v.resistance;
    const P = V * v.current;
    return {
      'Voltage': core.formatNumber(V, 4) + ' V',
      'Power': core.formatNumber(P, 4) + ' W',
      'Current': core.formatNumber(v.current, 4) + ' A',
      'Resistance': core.formatNumber(v.resistance, 4) + ' Ω',
    };
  }
});

R('electric-power', {
  title: 'Electric Power Calculator',
  description: 'Calculate electric power from voltage and current.',
  tags: ['power', 'electric', 'voltage', 'current', 'watt'],
  fields: [
    { id: 'voltage', label: 'Voltage (V)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 120' },
    { id: 'current', label: 'Current (A)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>P = V × I</code> where V is voltage and I is current.</p>',
  calculate: function(v) {
    if (!v.voltage || !v.current) return { error: 'Enter valid values' };
    const P = v.voltage * v.current;
    return {
      'Power': core.formatNumber(P, 4) + ' W',
      'Power (kW)': core.formatNumber(P / 1000, 4) + ' kW',
      'Voltage': core.formatNumber(v.voltage, 4) + ' V',
      'Current': core.formatNumber(v.current, 4) + ' A',
    };
  }
});

// === WAVES & OPTICS ===

R('wavelength', {
  title: 'Wavelength Calculator',
  description: 'Calculate wavelength from wave velocity and frequency.',
  tags: ['wavelength', 'frequency', 'wave', 'velocity'],
  fields: [
    { id: 'velocity', label: 'Wave Velocity (m/s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 343' },
    { id: 'frequency', label: 'Frequency (Hz)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 440' },
  ],
  formula: '<p><code>λ = v / f</code> where v is wave velocity and f is frequency.</p>',
  calculate: function(v) {
    if (!v.velocity || !v.frequency) return { error: 'Enter valid values' };
    const lambda = v.velocity / v.frequency;
    const period = 1 / v.frequency;
    return {
      'Wavelength': core.formatNumber(lambda, 6) + ' m',
      'Period': core.formatNumber(period, 6) + ' s',
      'Velocity': core.formatNumber(v.velocity, 4) + ' m/s',
      'Frequency': core.formatNumber(v.frequency, 4) + ' Hz',
    };
  }
});

R('frequency', {
  title: 'Frequency Calculator',
  description: 'Calculate frequency from period or from velocity and wavelength.',
  tags: ['frequency', 'period', 'wave', 'hertz'],
  fields: [
    { id: 'period', label: 'Period (s)', type: 'number', step: 0.001, min: 0.001, placeholder: 'e.g. 0.02' },
  ],
  formula: '<p><code>f = 1 / T</code> where T is the period of one cycle.</p>',
  calculate: function(v) {
    if (!v.period) return { error: 'Enter a valid period' };
    const f = 1 / v.period;
    return {
      'Frequency': core.formatNumber(f, 4) + ' Hz',
      'Period': core.formatNumber(v.period, 6) + ' s',
      'Angular Frequency': core.formatNumber(2 * Math.PI * f, 4) + ' rad/s',
    };
  }
});

R('period', {
  title: 'Period Calculator',
  description: 'Calculate the period of a wave or oscillation from its frequency.',
  tags: ['period', 'frequency', 'oscillation', 'wave'],
  fields: [
    { id: 'frequency', label: 'Frequency (Hz)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 60' },
  ],
  formula: '<p><code>T = 1 / f</code> where f is frequency.</p>',
  calculate: function(v) {
    if (!v.frequency) return { error: 'Enter a valid frequency' };
    const T = 1 / v.frequency;
    return {
      'Period': core.formatNumber(T, 6) + ' s',
      'Frequency': core.formatNumber(v.frequency, 4) + ' Hz',
      'Angular Frequency': core.formatNumber(2 * Math.PI * v.frequency, 4) + ' rad/s',
    };
  }
});

// === SPRINGS & ELASTICITY ===

R('hooke-law', {
  title: "Hooke's Law Calculator",
  description: 'Calculate spring force or displacement using F = kx.',
  tags: ['hooke', 'spring', 'force', 'displacement', 'elasticity'],
  fields: [
    { id: 'springConstant', label: 'Spring Constant (N/m)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 200' },
    { id: 'displacement', label: 'Displacement (m)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 0.1' },
  ],
  formula: '<p><code>F = k × x</code> where k is the spring constant and x is displacement from equilibrium.</p>',
  calculate: function(v) {
    if (!v.springConstant || !v.displacement) return { error: 'Enter valid values' };
    const F = v.springConstant * v.displacement;
    const PE = 0.5 * v.springConstant * v.displacement * v.displacement;
    return {
      'Spring Force': core.formatNumber(F, 4) + ' N',
      'Elastic Potential Energy': core.formatNumber(PE, 4) + ' J',
      'Spring Constant': core.formatNumber(v.springConstant, 4) + ' N/m',
      'Displacement': core.formatNumber(v.displacement, 4) + ' m',
    };
  }
});

// === THERMODYNAMICS ===

R('ideal-gas-law', {
  title: 'Ideal Gas Law Calculator',
  description: 'Calculate pressure, volume, temperature, or moles using PV = nRT.',
  tags: ['ideal gas', 'PV=nRT', 'thermodynamics', 'pressure'],
  fields: [
    { id: 'pressure', label: 'Pressure (Pa)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 101325' },
    { id: 'volume', label: 'Volume (m³)', type: 'number', step: 0.001, min: 0.001, placeholder: 'e.g. 0.0224', half: true },
    { id: 'moles', label: 'Moles (mol)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1', half: true },
    { id: 'temperature', label: 'Temperature (K)', type: 'number', step: 0.1, min: 0.1, placeholder: 'e.g. 273.15', half: true },
  ],
  formula: '<p><code>PV = nRT</code> where R = 8.314 J/(mol·K). Solve for the missing variable.</p>',
  calculate: function(v) {
    const R = 8.314;
    const fields = [v.pressure, v.volume, v.moles, v.temperature];
    const blanks = fields.filter(f => f === undefined || f === null || f === 0 || f === '').length;
    if (blanks > 1) return { error: 'Provide at least 3 of 4 variables to solve for the missing one' };

    let result = {};
    if (!v.pressure && v.volume && v.moles && v.temperature) {
      const P = v.moles * R * v.temperature / v.volume;
      result = { 'Pressure': core.formatNumber(P, 4) + ' Pa', 'Pressure (atm)': core.formatNumber(P / 101325, 4) + ' atm' };
    } else if (!v.volume && v.pressure && v.moles && v.temperature) {
      const V = v.moles * R * v.temperature / v.pressure;
      result = { 'Volume': core.formatNumber(V, 6) + ' m³', 'Volume (L)': core.formatNumber(V * 1000, 4) + ' L' };
    } else if (!v.moles && v.pressure && v.volume && v.temperature) {
      const n = v.pressure * v.volume / (R * v.temperature);
      result = { 'Moles': core.formatNumber(n, 4) + ' mol' };
    } else if (!v.temperature && v.pressure && v.volume && v.moles) {
      const T = v.pressure * v.volume / (v.moles * R);
      result = { 'Temperature': core.formatNumber(T, 4) + ' K', 'Temperature (°C)': core.formatNumber(T - 273.15, 4) + ' °C' };
    }
    return result;
  }
});

R('thermal-expansion', {
  title: 'Thermal Expansion Calculator',
  description: 'Calculate the change in length due to temperature change.',
  tags: ['thermal', 'expansion', 'temperature', 'linear'],
  fields: [
    { id: 'length', label: 'Original Length (m)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10' },
    { id: 'coeff', label: 'Coefficient of Linear Expansion (/°C)', type: 'number', step: 0.000001, min: 0, placeholder: 'e.g. 0.000012', half: true },
    { id: 'deltaT', label: 'Temperature Change (°C)', type: 'number', step: 0.1, placeholder: 'e.g. 50', half: true },
  ],
  formula: '<p><code>ΔL = α × L₀ × ΔT</code> where α is the coefficient of linear expansion, L₀ is original length, and ΔT is temperature change.</p>',
  calculate: function(v) {
    if (!v.length || !v.coeff || !v.deltaT) return { error: 'Enter valid values' };
    const deltaL = v.coeff * v.length * v.deltaT;
    const newLength = v.length + deltaL;
    return {
      'Change in Length': core.formatNumber(deltaL, 6) + ' m',
      'New Length': core.formatNumber(newLength, 6) + ' m',
      'Original Length': core.formatNumber(v.length, 4) + ' m',
      'Temperature Change': core.formatNumber(v.deltaT, 2) + ' °C',
    };
  }
});

R('heat-transfer', {
  title: 'Heat Transfer Calculator',
  description: 'Calculate heat energy required to change temperature of a substance.',
  tags: ['heat', 'transfer', 'energy', 'specific heat', 'thermodynamics'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1' },
    { id: 'specificHeat', label: 'Specific Heat Capacity (J/kg·°C)', type: 'number', step: 0.1, min: 0.01, placeholder: 'e.g. 4186', half: true },
    { id: 'deltaT', label: 'Temperature Change (°C)', type: 'number', step: 0.1, placeholder: 'e.g. 100', half: true },
  ],
  formula: '<p><code>Q = m × c × ΔT</code> where m is mass, c is specific heat capacity, and ΔT is temperature change.</p>',
  calculate: function(v) {
    if (!v.mass || !v.specificHeat || !v.deltaT) return { error: 'Enter valid values' };
    const Q = v.mass * v.specificHeat * v.deltaT;
    return {
      'Heat Energy': core.formatNumber(Q, 4) + ' J',
      'Heat Energy (kJ)': core.formatNumber(Q / 1000, 4) + ' kJ',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Temperature Change': core.formatNumber(v.deltaT, 2) + ' °C',
    };
  }
});

// === ALIASES ===

R('displacement-calculator-svt', {
  title: 'Displacement Calculator (Average Velocity)',
  description: 'Calculate displacement from average velocity and time.',
  tags: ['displacement', 'average velocity', 'kinematics', 'SVT'],
  fields: [
    { id: 'avgVelocity', label: 'Average Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>Δx = v_avg × t</code> where v_avg is average velocity and t is time.</p>',
  calculate: function(v) {
    if (!v.avgVelocity || !v.time) return { error: 'Enter valid values' };
    const dx = v.avgVelocity * v.time;
    return {
      'Displacement': core.formatNumber(dx, 4) + ' m',
      'Average Velocity': core.formatNumber(v.avgVelocity, 4) + ' m/s',
      'Time': core.formatNumber(v.time, 4) + ' s',
    };
  }
});

R('displacement_v_a_t', {
  title: 'Displacement Calculator (v₀, a, t)',
  description: 'Calculate displacement from initial velocity, acceleration, and time.',
  tags: ['displacement', 'kinematics', 'acceleration', 'motion'],
  fields: [
    { id: 'vInitial', label: 'Initial Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
    { id: 'acceleration', label: 'Acceleration (m/s²)', type: 'number', step: 0.01, placeholder: 'e.g. 2', half: true },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>s = v₀t + ½at²</code></p>',
  calculate: function(v) {
    if (!v.time) return { error: 'Enter valid values' };
    const s = (v.vInitial || 0) * v.time + 0.5 * (v.acceleration || 0) * v.time * v.time;
    const vFinal = (v.vInitial || 0) + (v.acceleration || 0) * v.time;
    return {
      'Displacement': core.formatNumber(s, 4) + ' m',
      'Final Velocity': core.formatNumber(vFinal, 4) + ' m/s',
      'Average Velocity': core.formatNumber((vFinal + (v.vInitial || 0)) / 2, 4) + ' m/s',
    };
  }
});

R('displacement_v_t', {
  title: 'Displacement Calculator (v × t)',
  description: 'Calculate displacement from constant velocity and time.',
  tags: ['displacement', 'velocity', 'time', 'constant'],
  fields: [
    { id: 'velocity', label: 'Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 10' },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5' },
  ],
  formula: '<p><code>s = v × t</code> for constant velocity.</p>',
  calculate: function(v) {
    if (!v.velocity || !v.time) return { error: 'Enter valid values' };
    const s = v.velocity * v.time;
    return {
      'Displacement': core.formatNumber(s, 4) + ' m',
      'Velocity': core.formatNumber(v.velocity, 4) + ' m/s',
      'Time': core.formatNumber(v.time, 4) + ' s',
    };
  }
});

R('elastic-potential', {
  title: 'Elastic Potential Energy Calculator',
  description: 'Calculate elastic potential energy stored in a spring.',
  tags: ['elastic', 'potential', 'energy', 'spring', 'Hooke'],
  fields: [
    { id: 'springConstant', label: 'Spring Constant (N/m)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 200' },
    { id: 'displacement', label: 'Displacement (m)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 0.1' },
  ],
  formula: '<p><code>PE = ½kx²</code> where k is the spring constant and x is displacement.</p>',
  calculate: function(v) {
    if (!v.springConstant || !v.displacement) return { error: 'Enter valid values' };
    const PE = 0.5 * v.springConstant * v.displacement * v.displacement;
    const F = v.springConstant * v.displacement;
    return {
      'Elastic PE': core.formatNumber(PE, 4) + ' J',
      'Spring Force': core.formatNumber(F, 4) + ' N',
      'Spring Constant': core.formatNumber(v.springConstant, 4) + ' N/m',
      'Displacement': core.formatNumber(v.displacement, 4) + ' m',
    };
  }
});

R('emc2', {
  title: 'E=mc² Calculator',
  description: 'Calculate energy equivalent of mass using Einstein\'s equation.',
  tags: ['E=mc2', 'Einstein', 'mass-energy', 'relativity'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1' },
  ],
  formula: '<p><code>E = mc²</code> where c = 299,792,458 m/s (speed of light).</p>',
  calculate: function(v) {
    if (!v.mass) return { error: 'Enter a mass' };
    const c = 299792458;
    const E = v.mass * c * c;
    return {
      'Energy (J)': E.toExponential(4) + ' J',
      'Energy (kWh)': core.formatNumber(E / 3600000, 4) + ' kWh',
      'Energy (TNT equivalent, tons)': core.formatNumber(E / 4.184e9, 4) + ' tons',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
    };
  }
});

R('friction', {
  title: 'Friction Force Calculator',
  description: 'Calculate the friction force between two surfaces.',
  tags: ['friction', 'force', 'coefficient', 'normal'],
  fields: [
    { id: 'mu', label: 'Coefficient of Friction (μ)', type: 'number', step: 0.01, min: 0, max: 5, placeholder: 'e.g. 0.5' },
    { id: 'normalForce', label: 'Normal Force (N)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 100', half: true },
    { id: 'mass', label: 'Mass (kg) (alternative to normal force)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10', half: true },
  ],
  formula: '<p><code>F_f = μ × N</code> where μ is the coefficient of friction and N is the normal force.</p>',
  calculate: function(v) {
    if (!v.mu) return { error: 'Enter the coefficient of friction' };
    const N = v.normalForce || (v.mass ? v.mass * 9.81 : null);
    if (!N) return { error: 'Enter normal force or mass' };
    const Ff = v.mu * N;
    return {
      'Friction Force': core.formatNumber(Ff, 4) + ' N',
      'Normal Force': core.formatNumber(N, 4) + ' N',
      'Coefficient of Friction': v.mu,
    };
  }
});

R('gravitational-potential', {
  title: 'Gravitational Potential Energy Calculator',
  description: 'Calculate gravitational potential energy from mass, gravity, and height.',
  tags: ['gravitational', 'potential', 'energy', 'PE', 'mgh'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 10' },
    { id: 'gravity', label: 'Gravity (m/s²)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 9.81', half: true },
    { id: 'height', label: 'Height (m)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 50', half: true },
  ],
  formula: '<p><code>PE = mgh</code> where m is mass, g is gravity, and h is height.</p>',
  calculate: function(v) {
    if (!v.mass || !v.height) return { error: 'Enter valid values' };
    const g = v.gravity || 9.81;
    const PE = v.mass * g * v.height;
    return {
      'Potential Energy': core.formatNumber(PE, 4) + ' J',
      'Potential Energy (kJ)': core.formatNumber(PE / 1000, 4) + ' kJ',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Height': core.formatNumber(v.height, 4) + ' m',
    };
  }
});

R('hookes-law', {
  title: "Hooke's Law Calculator",
  description: 'Calculate spring force or displacement using F = kx.',
  tags: ['hooke', 'spring', 'force', 'displacement', 'elasticity'],
  fields: [
    { id: 'springConstant', label: 'Spring Constant (N/m)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 200' },
    { id: 'displacement', label: 'Displacement (m)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 0.1' },
  ],
  formula: '<p><code>F = kx</code> where k is the spring constant and x is displacement.</p>',
  calculate: function(v) {
    if (!v.springConstant || !v.displacement) return { error: 'Enter valid values' };
    const F = v.springConstant * v.displacement;
    const PE = 0.5 * v.springConstant * v.displacement * v.displacement;
    return {
      'Spring Force': core.formatNumber(F, 4) + ' N',
      'Elastic PE': core.formatNumber(PE, 4) + ' J',
      'Spring Constant': core.formatNumber(v.springConstant, 4) + ' N/m',
      'Displacement': core.formatNumber(v.displacement, 4) + ' m',
    };
  }
});

R('impulse', {
  title: 'Impulse Calculator',
  description: 'Calculate impulse from force and time.',
  tags: ['impulse', 'force', 'time', 'momentum'],
  fields: [
    { id: 'force', label: 'Force (N)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 100' },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 0.5' },
  ],
  formula: '<p><code>J = F × Δt</code> where F is force and Δt is the time interval.</p>',
  calculate: function(v) {
    if (!v.force || !v.time) return { error: 'Enter valid values' };
    const J = v.force * v.time;
    return {
      'Impulse': core.formatNumber(J, 4) + ' N·s',
      'Force': core.formatNumber(v.force, 4) + ' N',
      'Time': core.formatNumber(v.time, 4) + ' s',
      'Change in Momentum': core.formatNumber(J, 4) + ' kg·m/s',
    };
  }
});

R('impulse-momentum', {
  title: 'Impulse-Momentum Theorem Calculator',
  description: 'Calculate impulse from change in momentum.',
  tags: ['impulse', 'momentum', 'theorem', 'change'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1000' },
    { id: 'vInitial', label: 'Initial Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 20', half: true },
    { id: 'vFinal', label: 'Final Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p><code>J = Δp = m(v_f − v_i)</code></p>',
  calculate: function(v) {
    if (!v.mass || v.vInitial === undefined || v.vFinal === undefined) return { error: 'Enter all values' };
    const dp = v.mass * (v.vFinal - v.vInitial);
    return {
      'Impulse': core.formatNumber(dp, 4) + ' N·s',
      'Change in Momentum': core.formatNumber(dp, 4) + ' kg·m/s',
      'Initial Momentum': core.formatNumber(v.mass * v.vInitial, 4) + ' kg·m/s',
      'Final Momentum': core.formatNumber(v.mass * v.vFinal, 4) + ' kg·m/s',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
    };
  }
});

R('kinetic', {
  title: 'Kinetic Energy Calculator',
  description: 'Calculate kinetic energy from mass and velocity.',
  tags: ['kinetic', 'energy', 'KE', 'motion'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 1000' },
    { id: 'velocity', label: 'Velocity (m/s)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 25' },
  ],
  formula: '<p><code>KE = ½mv²</code></p>',
  calculate: function(v) {
    if (!v.mass || !v.velocity) return { error: 'Enter valid values' };
    const KE = 0.5 * v.mass * v.velocity * v.velocity;
    return {
      'Kinetic Energy': core.formatNumber(KE, 4) + ' J',
      'Kinetic Energy (kJ)': core.formatNumber(KE / 1000, 4) + ' kJ',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Velocity': core.formatNumber(v.velocity, 4) + ' m/s',
    };
  }
});

R('uniformly-accelerated-motion-calculator', {
  title: 'Uniformly Accelerated Motion Calculator',
  description: 'Solve kinematics equations for uniformly accelerated motion.',
  tags: ['kinematics', 'acceleration', 'motion', 'equations'],
  fields: [
    { id: 'vInitial', label: 'Initial Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 0', half: true },
    { id: 'acceleration', label: 'Acceleration (m/s²)', type: 'number', step: 0.01, placeholder: 'e.g. 9.8', half: true },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p>Uses the kinematic equations: v = v₀ + at, s = v₀t + ½at², v² = v₀² + 2as</p>',
  calculate: function(v) {
    if (!v.time) return { error: 'Enter at least the time' };
    const v0 = v.vInitial || 0;
    const a = v.acceleration || 0;
    const t = v.time;
    const vFinal = v0 + a * t;
    const s = v0 * t + 0.5 * a * t * t;
    const v2 = v0 * v0 + 2 * a * s;
    return {
      'Final Velocity': core.formatNumber(vFinal, 4) + ' m/s',
      'Displacement': core.formatNumber(s, 4) + ' m',
      'v² (check)': core.formatNumber(v2, 4) + ' (m/s)²',
      'Average Velocity': core.formatNumber((vFinal + v0) / 2, 4) + ' m/s',
    };
  }
});

R('velocity-calculator-vuas', {
  title: 'Velocity Calculator (v² = v₀² + 2aΔs)',
  description: 'Calculate final velocity from initial velocity, acceleration, and displacement.',
  tags: ['velocity', 'kinematics', 'acceleration', 'displacement'],
  fields: [
    { id: 'vInitial', label: 'Initial Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 0', half: true },
    { id: 'acceleration', label: 'Acceleration (m/s²)', type: 'number', step: 0.01, placeholder: 'e.g. 9.8', half: true },
    { id: 'displacement', label: 'Displacement (m)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 100', half: true },
  ],
  formula: '<p><code>v² = v₀² + 2aΔs</code></p>',
  calculate: function(v) {
    if (!v.acceleration || !v.displacement) return { error: 'Enter acceleration and displacement' };
    const v0 = v.vInitial || 0;
    const v2 = v0 * v0 + 2 * v.acceleration * v.displacement;
    if (v2 < 0) return { error: 'Result would be imaginary; check your inputs' };
    const vFinal = Math.sqrt(v2);
    return {
      'Final Velocity': core.formatNumber(vFinal, 4) + ' m/s',
      'v²': core.formatNumber(v2, 4) + ' (m/s)²',
      'Initial Velocity': core.formatNumber(v0, 4) + ' m/s',
      'Acceleration': core.formatNumber(v.acceleration, 4) + ' m/s²',
      'Displacement': core.formatNumber(v.displacement, 4) + ' m',
    };
  }
});

R('velocity_a_t', {
  title: 'Velocity Calculator (v = v₀ + at)',
  description: 'Calculate final velocity from initial velocity, acceleration, and time.',
  tags: ['velocity', 'kinematics', 'acceleration', 'time'],
  fields: [
    { id: 'vInitial', label: 'Initial Velocity (m/s)', type: 'number', step: 0.01, placeholder: 'e.g. 0', half: true },
    { id: 'acceleration', label: 'Acceleration (m/s²)', type: 'number', step: 0.01, placeholder: 'e.g. 9.8', half: true },
    { id: 'time', label: 'Time (s)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 5', half: true },
  ],
  formula: '<p><code>v = v₀ + at</code></p>',
  calculate: function(v) {
    if (!v.time) return { error: 'Enter valid values' };
    const v0 = v.vInitial || 0;
    const a = v.acceleration || 0;
    const vFinal = v0 + a * v.time;
    return {
      'Final Velocity': core.formatNumber(vFinal, 4) + ' m/s',
      'Initial Velocity': core.formatNumber(v0, 4) + ' m/s',
      'Acceleration': core.formatNumber(a, 4) + ' m/s²',
      'Time': core.formatNumber(v.time, 4) + ' s',
      'Change in Velocity': core.formatNumber(vFinal - v0, 4) + ' m/s',
    };
  }
});

R('weight', {
  title: 'Weight Calculator',
  description: 'Calculate weight from mass and gravitational acceleration.',
  tags: ['weight', 'mass', 'gravity', 'force'],
  fields: [
    { id: 'mass', label: 'Mass (kg)', type: 'number', step: 0.01, min: 0.01, placeholder: 'e.g. 70' },
    { id: 'gravity', label: 'Gravity (m/s²)', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 9.81', half: true },
  ],
  formula: '<p><code>W = mg</code> where m is mass and g is gravitational acceleration (default 9.81 m/s² for Earth).</p>',
  calculate: function(v) {
    if (!v.mass) return { error: 'Enter a mass' };
    const g = v.gravity || 9.81;
    const W = v.mass * g;
    return {
      'Weight': core.formatNumber(W, 4) + ' N',
      'Mass': core.formatNumber(v.mass, 4) + ' kg',
      'Gravity': core.formatNumber(g, 4) + ' m/s²',
      'Weight (kgf)': core.formatNumber(W / 9.80665, 4) + ' kgf',
      'Weight (lbf)': core.formatNumber(W * 0.224809, 4) + ' lbf',
    };
  }
});

})(calculatorRegistry);
