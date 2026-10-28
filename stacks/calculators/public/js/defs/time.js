// Time calculators
(function(reg) {
const R = reg.register.bind(reg, 'time');

// === AGE CALCULATORS ===

R('age-calculator', {
  title: 'Age Calculator',
  description: 'Calculate your exact age from your birthdate.',
  tags: ['age', 'birthdate', 'years old', 'how old'],
  fields: [
    { id: 'birthdate', label: 'Birth Date', type: 'date', placeholder: 'e.g. 1990-01-15' },
    { id: 'asOf', label: 'Calculate Age As Of (leave blank for today)', type: 'date' },
  ],
  formula: '<p>Calculates the exact age in years, months, and days between two dates.</p>',
  calculate: function(v) {
    if (!v.birthdate) return { error: 'Enter a birth date' };
    const asOf = v.asOf || new Date().toISOString().slice(0, 10);
    const comp = core.ageComponents(v.birthdate, asOf);
    return {
      'Age': comp.years + ' years, ' + comp.months + ' months, ' + comp.days + ' days',
      'Total Years': core.formatNumber(comp.totalDays / 365.25, 4),
      'Total Months': core.formatNumber(comp.totalDays / 30.44, 2),
      'Total Weeks': core.formatNumber(comp.totalDays / 7, 2),
      'Total Days': comp.totalDays,
      'Total Hours': core.formatNumber(comp.totalDays * 24),
      'Day of Birth': core.dayName(v.birthdate),
    };
  }
});

R('age-checker', {
  title: 'Age on Date Calculator',
  description: 'Find out how old someone was or will be on a specific date.',
  tags: ['age', 'date', 'check', 'specific date'],
  fields: [
    { id: 'birthdate', label: 'Birth Date', type: 'date', placeholder: 'e.g. 1990-06-15' },
    { id: 'targetDate', label: 'Target Date', type: 'date', placeholder: 'e.g. 2025-12-31' },
  ],
  formula: '<p>Calculates the exact age between a birth date and any target date.</p>',
  calculate: function(v) {
    if (!v.birthdate || !v.targetDate) return { error: 'Enter both dates' };
    const comp = core.ageComponents(v.birthdate, v.targetDate);
    return {
      'Age on Target Date': comp.years + ' years, ' + comp.months + ' months, ' + comp.days + ' days',
      'Total Days': comp.totalDays,
      'Day of Week': core.dayName(v.targetDate),
    };
  }
});

R('how-old-am-i', {
  title: 'Exact Age Calculator',
  description: 'Find your age in exact time down to the second.',
  tags: ['age', 'exact', 'seconds', 'precise'],
  fields: [
    { id: 'birthdate', label: 'Birth Date', type: 'date', placeholder: 'e.g. 1990-01-15' },
    { id: 'birthTime', label: 'Birth Time (HH:MM)', type: 'time', placeholder: 'e.g. 14:30' },
  ],
  formula: '<p>Calculates your precise age including hours, minutes, and seconds from birth to now.</p>',
  calculate: function(v) {
    if (!v.birthdate) return { error: 'Enter a birth date' };
    let birthStr = v.birthdate;
    if (v.birthTime) {
      birthStr = v.birthdate + 'T' + v.birthTime + ':00';
    } else {
      birthStr = v.birthdate + 'T00:00:00';
    }
    const birth = new Date(birthStr).getTime();
    const now = Date.now();
    const diff = now - birth;
    if (diff < 0) return { error: 'Birth date is in the future' };
    const totalSeconds = Math.floor(diff / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const comp = core.ageComponents(v.birthdate, new Date().toISOString().slice(0, 10));
    return {
      'Age': comp.years + ' years, ' + comp.months + ' months, ' + comp.days + ' days',
      'Total Days': totalDays,
      'Total Hours': core.formatNumber(totalHours),
      'Total Minutes': core.formatNumber(totalMinutes),
      'Total Seconds': core.formatNumber(totalSeconds),
    };
  }
});

// === DATE DIFFERENCE CALCULATORS ===

R('date-difference-calculator', {
  title: 'Date Difference Calculator',
  description: 'Calculate the difference between two dates in days, weeks, months, and years.',
  tags: ['date', 'difference', 'between', 'days', 'months', 'years'],
  fields: [
    { id: 'date1', label: 'Start Date', type: 'date', placeholder: 'e.g. 2024-01-01' },
    { id: 'date2', label: 'End Date', type: 'date', placeholder: 'e.g. 2025-06-15' },
  ],
  formula: '<p>Calculates the elapsed time between two dates in various units.</p>',
  calculate: function(v) {
    if (!v.date1 || !v.date2) return { error: 'Enter both dates' };
    const days = core.daysBetween(v.date1, v.date2);
    const weeks = Math.floor(days / 7);
    const remDays = days % 7;
    const comp = core.ageComponents(v.date1, v.date2);
    return {
      'Days': days,
      'Weeks': weeks + ' weeks and ' + remDays + ' days',
      'Months': comp.months,
      'Years': core.formatNumber(days / 365.25, 4),
      'Business Days (approx)': core.formatNumber(Math.round(days * 5 / 7)),
      'Start Day': core.dayName(v.date1),
      'End Day': core.dayName(v.date2),
    };
  }
});

R('days-between-dates', {
  title: 'Days Between Dates',
  description: 'Find the number of days between two dates.',
  tags: ['days', 'between', 'dates', 'simple'],
  fields: [
    { id: 'date1', label: 'Start Date', type: 'date', placeholder: 'e.g. 2024-01-01' },
    { id: 'date2', label: 'End Date', type: 'date', placeholder: 'e.g. 2024-12-31' },
  ],
  formula: '<p>Simple calculation of the total number of calendar days between two dates.</p>',
  calculate: function(v) {
    if (!v.date1 || !v.date2) return { error: 'Enter both dates' };
    const days = core.daysBetween(v.date1, v.date2);
    return {
      'Days Between': days,
      'Weeks': core.formatNumber(days / 7, 2),
      'Start': core.formatDate(v.date1) + ' (' + core.dayName(v.date1) + ')',
      'End': core.formatDate(v.date2) + ' (' + core.dayName(v.date2) + ')',
    };
  }
});

R('months-between-dates', {
  title: 'Months Between Dates',
  description: 'Calculate the number of months between two dates.',
  tags: ['months', 'between', 'dates'],
  fields: [
    { id: 'date1', label: 'Start Date', type: 'date', placeholder: 'e.g. 2024-01-15' },
    { id: 'date2', label: 'End Date', type: 'date', placeholder: 'e.g. 2025-06-15' },
  ],
  formula: '<p>Calculates the difference in months between two dates, including partial months.</p>',
  calculate: function(v) {
    if (!v.date1 || !v.date2) return { error: 'Enter both dates' };
    const d1 = new Date(v.date1), d2 = new Date(v.date2);
    const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    const days = core.daysBetween(v.date1, v.date2);
    const partialDays = d2.getDate() - d1.getDate();
    return {
      'Full Months': Math.abs(months),
      'Months (decimal)': core.formatNumber(days / 30.44, 4),
      'Total Days': days,
      'Partial Month': partialDays + ' days',
    };
  }
});

R('years-between-dates', {
  title: 'Years Between Dates',
  description: 'Calculate the number of years between two dates.',
  tags: ['years', 'between', 'dates'],
  fields: [
    { id: 'date1', label: 'Start Date', type: 'date', placeholder: 'e.g. 2000-06-15' },
    { id: 'date2', label: 'End Date', type: 'date', placeholder: 'e.g. 2025-06-15' },
  ],
  formula: '<p>Calculates the difference in years between two dates, including fractional years.</p>',
  calculate: function(v) {
    if (!v.date1 || !v.date2) return { error: 'Enter both dates' };
    const d1 = new Date(v.date1), d2 = new Date(v.date2);
    const days = core.daysBetween(v.date1, v.date2);
    const years = days / 365.25;
    const wholeYears = Math.floor(years);
    const remDays = Math.round(days - wholeYears * 365.25);
    return {
      'Years (decimal)': core.formatNumber(years, 4),
      'Full Years': wholeYears,
      'Remaining Days': remDays,
      'Total Days': days,
    };
  }
});

R('time-date-difference-calculator', {
  title: 'Time and Date Difference Calculator',
  description: 'Calculate the difference between two date-time values.',
  tags: ['time', 'date', 'difference', 'datetime'],
  fields: [
    { id: 'date1', label: 'Start Date', type: 'date', placeholder: 'e.g. 2024-06-15', half: true },
    { id: 'time1', label: 'Start Time', type: 'time', placeholder: 'e.g. 09:00', half: true },
    { id: 'date2', label: 'End Date', type: 'date', placeholder: 'e.g. 2024-06-16', half: true },
    { id: 'time2', label: 'End Time', type: 'time', placeholder: 'e.g. 17:30', half: true },
  ],
  formula: '<p>Calculates the exact difference between two date-time pairs including hours and minutes.</p>',
  calculate: function(v) {
    if (!v.date1 || !v.date2) return { error: 'Enter both dates' };
    const t1 = v.time1 || '00:00';
    const t2 = v.time2 || '00:00';
    const dt1 = new Date(v.date1 + 'T' + t1 + ':00');
    const dt2 = new Date(v.date2 + 'T' + t2 + ':00');
    const diffMs = Math.abs(dt2 - dt1);
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hrs = totalHours % 24;
    const mins = totalMinutes % 60;
    const secs = totalSeconds % 60;
    return {
      'Difference': days + ' days, ' + hrs + ' hours, ' + mins + ' minutes, ' + secs + ' seconds',
      'Total Hours': core.formatNumber(totalHours, 2),
      'Total Minutes': core.formatNumber(totalMinutes),
      'Total Seconds': core.formatNumber(totalSeconds),
    };
  }
});

// === DAY OF WEEK ===

R('day-of-week', {
  title: 'Day of Week Calculator',
  description: 'Find out what day of the week any date falls on.',
  tags: ['day', 'week', 'weekday', 'calendar'],
  fields: [
    { id: 'date', label: 'Date', type: 'date', placeholder: 'e.g. 2025-01-01' },
  ],
  formula: '<p>Uses the Zeller-like algorithm to determine the day of the week for any given date.</p>',
  calculate: function(v) {
    if (!v.date) return { error: 'Enter a date' };
    const d = new Date(v.date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = dayNames[d.getDay()];
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    const isLeap = (d.getFullYear() % 4 === 0 && d.getFullYear() % 100 !== 0) || d.getFullYear() % 400 === 0;
    return {
      'Day of Week': day,
      'Date': core.formatDate(v.date),
      'Day of Year': dayOfYear,
      'Week Number': Math.ceil(dayOfYear / 7),
      'Is Leap Year': isLeap ? 'Yes' : 'No',
    };
  }
});

// === COUNTDOWN ===

R('countdown', {
  title: 'Countdown Calculator',
  description: 'Count down the days, hours, and minutes to a future date.',
  tags: ['countdown', 'timer', 'days until', 'event'],
  fields: [
    { id: 'targetDate', label: 'Target Date', type: 'date', placeholder: 'e.g. 2025-12-25' },
    { id: 'targetTime', label: 'Target Time (optional)', type: 'time', placeholder: 'e.g. 00:00' },
  ],
  formula: '<p>Calculates the remaining time from now until the specified target date and time.</p>',
  calculate: function(v) {
    if (!v.targetDate) return { error: 'Enter a target date' };
    const t = v.targetTime || '00:00';
    const target = new Date(v.targetDate + 'T' + t + ':00');
    const now = new Date();
    const diff = target - now;
    if (diff < 0) {
      const past = Math.abs(diff);
      const days = Math.floor(past / 86400000);
      return { 'Status': 'The date has passed', 'Days Ago': days };
    }
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const weeks = Math.floor(days / 7);
    return {
      'Days Until': days,
      'Weeks Until': weeks + ' weeks and ' + (days % 7) + ' days',
      'Hours Until': core.formatNumber(days * 24 + hrs),
      'Countdown': days + ' days, ' + hrs + ' hours, ' + mins + ' minutes',
      'Target Day': core.dayName(v.targetDate),
    };
  }
});

// === DATE CALCULATOR (Add/Subtract) ===

R('date-calculator', {
  title: 'Date Calculator',
  description: 'Add or subtract days, weeks, months, or years from a date.',
  tags: ['date', 'add', 'subtract', 'calendar', 'future', 'past'],
  fields: [
    { id: 'startDate', label: 'Start Date', type: 'date', placeholder: 'e.g. 2024-06-01' },
    { id: 'amount', label: 'Amount', type: 'number', step: 1, placeholder: 'e.g. 30', half: true },
    { id: 'unit', label: 'Unit', type: 'select', half: true, options: [
      { value: 'days', label: 'Days' }, { value: 'weeks', label: 'Weeks' },
      { value: 'months', label: 'Months' }, { value: 'years', label: 'Years' }
    ]},
    { id: 'direction', label: 'Direction', type: 'select', options: [
      { value: 'add', label: 'Add (Future)', default: true }, { value: 'subtract', label: 'Subtract (Past)' }
    ]},
  ],
  formula: '<p>Adds or subtracts the specified number of time units from the start date.</p>',
  calculate: function(v) {
    if (!v.startDate || !v.amount) return { error: 'Enter a date and amount' };
    const amt = v.direction === 'subtract' ? -v.amount : v.amount;
    let result;
    if (v.unit === 'months') {
      result = core.addMonths(v.startDate, amt);
    } else if (v.unit === 'years') {
      result = core.addMonths(v.startDate, amt * 12);
    } else {
      const days = v.unit === 'weeks' ? amt * 7 : amt;
      const d = new Date(v.startDate);
      d.setDate(d.getDate() + days);
      result = d.toISOString().slice(0, 10);
    }
    const daysDiff = core.daysBetween(v.startDate, result);
    return {
      'Result Date': core.formatDate(result),
      'Day of Week': core.dayName(result),
      'Days Difference': Math.abs(daysDiff),
      'Operation': (v.direction === 'add' ? '+' : '-') + ' ' + Math.abs(v.amount) + ' ' + v.unit,
    };
  }
});

// === TIME CALCULATOR (Add/Subtract time) ===

R('time-calculator', {
  title: 'Time Calculator',
  description: 'Add or subtract hours, minutes, and seconds from a time.',
  tags: ['time', 'add', 'subtract', 'hours', 'minutes', 'seconds'],
  fields: [
    { id: 'startTime', label: 'Start Time', type: 'time', placeholder: 'e.g. 09:30', half: true },
    { id: 'direction', label: 'Direction', type: 'select', half: true, options: [
      { value: 'add', label: 'Add', default: true }, { value: 'subtract', label: 'Subtract' }
    ]},
    { id: 'hours', label: 'Hours', type: 'number', step: 1, min: 0, placeholder: 'e.g. 2', half: true },
    { id: 'minutes', label: 'Minutes', type: 'number', step: 1, min: 0, placeholder: 'e.g. 30', half: true },
    { id: 'seconds', label: 'Seconds', type: 'number', step: 1, min: 0, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p>Adds or subtracts the specified hours, minutes, and seconds from the start time.</p>',
  calculate: function(v) {
    if (!v.startTime) return { error: 'Enter a start time' };
    const [sh, sm] = v.startTime.split(':').map(Number);
    const sign = v.direction === 'add' ? 1 : -1;
    const totalSec = sign * ((v.hours || 0) * 3600 + (v.minutes || 0) * 60 + (v.seconds || 0));
    let resultSec = sh * 3600 + sm * 60 + totalSec;
    // Normalize to 0-86399
    const daySec = 86400;
    resultSec = ((resultSec % daySec) + daySec) % daySec;
    const rh = Math.floor(resultSec / 3600);
    const rm = Math.floor((resultSec % 3600) / 60);
    const rs = resultSec % 60;
    const crossesMidnight = (sign > 0 && resultSec < sm + sh * 3600) || (sign < 0 && resultSec > sm + sh * 3600);
    return {
      'Result Time': String(rh).padStart(2, '0') + ':' + String(rm).padStart(2, '0') + ':' + String(rs).padStart(2, '0'),
      '24-Hour': String(rh).padStart(2, '0') + ':' + String(rm).padStart(2, '0'),
      'Total Seconds Changed': Math.abs(totalSec),
      'Crosses Midnight': crossesMidnight ? 'Yes' : 'No',
    };
  }
});

// === DECIMAL TO TIME ===

R('decimal-to-time', {
  title: 'Decimal Hours to Time Converter',
  description: 'Convert decimal hours to hours, minutes, and seconds.',
  tags: ['decimal', 'hours', 'time', 'convert', 'payroll'],
  fields: [
    { id: 'decimalHours', label: 'Decimal Hours', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 8.75' },
  ],
  formula: '<p>Converts a decimal hour value into hours:minutes:seconds format. Useful for payroll and time tracking.</p>',
  calculate: function(v) {
    if (v.decimalHours == null) return { error: 'Enter decimal hours' };
    const h = Math.floor(v.decimalHours);
    const m = Math.floor((v.decimalHours - h) * 60);
    const s = Math.round(((v.decimalHours - h) * 60 - m) * 60);
    const totalMinutes = Math.round(v.decimalHours * 60);
    const totalSeconds = Math.round(v.decimalHours * 3600);
    return {
      'Time': h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'),
      'Hours and Minutes': h + ' hours, ' + m + ' minutes',
      'Total Minutes': totalMinutes,
      'Total Seconds': totalSeconds,
    };
  }
});

R('time-to-decimal', {
  title: 'Time to Decimal Hours Converter',
  description: 'Convert hours, minutes, and seconds to decimal hours.',
  tags: ['time', 'decimal', 'hours', 'convert', 'payroll'],
  fields: [
    { id: 'hours', label: 'Hours', type: 'number', step: 1, min: 0, placeholder: 'e.g. 8', half: true },
    { id: 'minutes', label: 'Minutes', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 45', half: true },
    { id: 'seconds', label: 'Seconds', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p>Converts hours:minutes:seconds into a decimal hour value. Useful for payroll calculations.</p>',
  calculate: function(v) {
    const h = v.hours || 0, m = v.minutes || 0, s = v.seconds || 0;
    const decimal = h + m / 60 + s / 3600;
    const totalMinutes = h * 60 + m + s / 60;
    const totalSeconds = h * 3600 + m * 60 + s;
    return {
      'Decimal Hours': core.formatNumber(decimal, 4),
      'Total Minutes': core.formatNumber(totalMinutes, 2),
      'Total Seconds': totalSeconds,
    };
  }
});

// === TIME ZONE CONVERTER ===

R('time-zone-converter', {
  title: 'Time Zone Converter',
  description: 'Convert a time from one time zone to another.',
  tags: ['timezone', 'time zone', 'convert', 'UTC', 'offset'],
  fields: [
    { id: 'date', label: 'Date', type: 'date', placeholder: 'e.g. 2025-01-15', half: true },
    { id: 'time', label: 'Time', type: 'time', placeholder: 'e.g. 14:00', half: true },
    { id: 'fromOffset', label: 'From UTC Offset (hours)', type: 'number', step: 0.5, placeholder: 'e.g. -5', half: true },
    { id: 'toOffset', label: 'To UTC Offset (hours)', type: 'number', step: 0.5, placeholder: 'e.g. 1', half: true },
  ],
  formula: '<p>Converts a local time to another time zone using UTC offsets.</p>',
  calculate: function(v) {
    if (!v.date || !v.time) return { error: 'Enter date and time' };
    const [h, m] = v.time.split(':').map(Number);
    const fromOff = v.fromOffset || 0;
    const toOff = v.toOffset || 0;
    const diff = toOff - fromOff;
    let newH = h + diff;
    let newDate = new Date(v.date);
    if (newH >= 24) { newH -= 24; newDate.setDate(newDate.getDate() + 1); }
    else if (newH < 0) { newH += 24; newDate.setDate(newDate.getDate() - 1); }
    return {
      'Original': v.time + ' (UTC' + (fromOff >= 0 ? '+' : '') + fromOff + ')',
      'Converted': String(Math.floor(newH)).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' (UTC' + (toOff >= 0 ? '+' : '') + toOff + ')',
      'Date': core.formatDate(newDate.toISOString().slice(0, 10)),
      'Day': core.dayName(newDate.toISOString().slice(0, 10)),
      'Offset Difference': (diff >= 0 ? '+' : '') + diff + ' hours',
    };
  }
});

// === WORK DAY CALCULATOR ===

R('work-day-calculator', {
  title: 'Work Day Calculator',
  description: 'Calculate an end date given a start date and number of work days, excluding weekends.',
  tags: ['work', 'business', 'days', 'weekends', 'exclude'],
  fields: [
    { id: 'startDate', label: 'Start Date', type: 'date', placeholder: 'e.g. 2025-01-06' },
    { id: 'workDays', label: 'Number of Work Days', type: 'number', step: 1, min: 1, placeholder: 'e.g. 10', half: true },
    { id: 'direction', label: 'Direction', type: 'select', half: true, options: [
      { value: 'forward', label: 'Forward (Future)', default: true },
      { value: 'backward', label: 'Backward (Past)' }
    ]},
  ],
  formula: '<p>Counts only Monday-Friday work days, skipping weekends. Useful for project planning.</p>',
  calculate: function(v) {
    if (!v.startDate || !v.workDays) return { error: 'Enter a start date and work days' };
    const d = new Date(v.startDate);
    const steps = v.direction === 'forward' ? v.workDays : -v.workDays;
    let counted = 0;
    while (counted !== steps) {
      d.setDate(d.getDate() + (steps > 0 ? 1 : -1));
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        counted += (steps > 0 ? 1 : -1);
      }
    }
    const result = d.toISOString().slice(0, 10);
    const calDays = core.daysBetween(v.startDate, result);
    return {
      'End Date': core.formatDate(result),
      'Day of Week': core.dayName(result),
      'Calendar Days': Math.abs(calDays),
      'Work Days': v.workDays,
      'Weekends Skipped': Math.abs(calDays) - v.workDays,
    };
  }
});

// === DUE DATE CALCULATOR ===

R('due-date-calculator', {
  title: 'Due Date Calculator',
  description: 'Calculate a due date from a start date and a duration in days, weeks, months, or years.',
  tags: ['due', 'deadline', 'duration', 'project', 'planning'],
  fields: [
    { id: 'startDate', label: 'Start Date', type: 'date', placeholder: 'e.g. 2025-01-01' },
    { id: 'amount', label: 'Duration Amount', type: 'number', step: 1, min: 1, placeholder: 'e.g. 90', half: true },
    { id: 'unit', label: 'Duration Unit', type: 'select', half: true, options: [
      { value: 'days', label: 'Days' }, { value: 'weeks', label: 'Weeks' },
      { value: 'months', label: 'Months' }, { value: 'years', label: 'Years' }
    ]},
  ],
  formula: '<p>Adds the specified duration to the start date to find the due date.</p>',
  calculate: function(v) {
    if (!v.startDate || !v.amount) return { error: 'Enter a start date and duration' };
    let result;
    if (v.unit === 'months') {
      result = core.addMonths(v.startDate, v.amount);
    } else if (v.unit === 'years') {
      result = core.addMonths(v.startDate, v.amount * 12);
    } else {
      const days = v.unit === 'weeks' ? v.amount * 7 : v.amount;
      const d = new Date(v.startDate);
      d.setDate(d.getDate() + days);
      result = d.toISOString().slice(0, 10);
    }
    return {
      'Due Date': core.formatDate(result),
      'Day of Week': core.dayName(result),
      'Days from Start': core.daysBetween(v.startDate, result),
      'Weeks from Start': core.formatNumber(core.daysBetween(v.startDate, result) / 7, 2),
    };
  }
});

// === ELAPSED TIME ===

R('elapsed-time', {
  title: 'Elapsed Time Calculator',
  description: 'Calculate the elapsed time between a start and end time on the same or different days.',
  tags: ['elapsed', 'duration', 'time', 'between'],
  fields: [
    { id: 'startHour', label: 'Start Hour', type: 'number', step: 1, min: 0, max: 23, placeholder: 'e.g. 9', half: true },
    { id: 'startMin', label: 'Start Minute', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 30', half: true },
    { id: 'endHour', label: 'End Hour', type: 'number', step: 1, min: 0, max: 23, placeholder: 'e.g. 17', half: true },
    { id: 'endMin', label: 'End Minute', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 0', half: true },
    { id: 'days', label: 'Number of Days Spanned (0 = same day)', type: 'number', step: 1, min: 0, max: 365, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p>Calculates the total elapsed time between two clock times, optionally spanning multiple days.</p>',
  calculate: function(v) {
    const startSec = (v.startHour || 0) * 3600 + (v.startMin || 0) * 60;
    const endSec = (v.endHour || 0) * 3600 + (v.endMin || 0) * 60;
    const daySpan = (v.days || 0) * 86400;
    let elapsed = endSec - startSec + daySpan;
    if (elapsed < 0) elapsed += 86400; // crossed midnight
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return {
      'Elapsed Time': h + ' hours, ' + m + ' minutes' + (s > 0 ? ', ' + s + ' seconds' : ''),
      'Total Hours': core.formatNumber(h + m / 60, 4),
      'Total Minutes': Math.floor(elapsed / 60),
      'Total Seconds': elapsed,
    };
  }
});

// === STOPWATCH CONVERSION ===

R('stopwatch-conversion', {
  title: 'Seconds to Hours:Minutes:Seconds Converter',
  description: 'Convert a total number of seconds into a readable H:M:S format.',
  tags: ['stopwatch', 'seconds', 'convert', 'HMS', 'timer'],
  fields: [
    { id: 'seconds', label: 'Total Seconds', type: 'number', step: 1, min: 0, placeholder: 'e.g. 3661' },
  ],
  formula: '<p>Breaks down a total number of seconds into hours, minutes, and seconds.</p>',
  calculate: function(v) {
    if (v.seconds == null) return { error: 'Enter total seconds' };
    const total = Math.floor(v.seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const days = Math.floor(h / 24);
    const remH = h % 24;
    return {
      'Formatted': (days > 0 ? days + 'd ' : '') + String(remH).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'),
      'Hours': h,
      'Minutes': Math.floor(total / 60),
      'Days': core.formatNumber(total / 86400, 4),
    };
  }
});

// === MILITARY TIME CONVERTER ===

R('military-time', {
  title: 'Military Time Converter',
  description: 'Convert between 12-hour and 24-hour (military) time formats.',
  tags: ['military', '24-hour', '12-hour', 'AM', 'PM', 'convert'],
  fields: [
    { id: 'hour', label: 'Hour', type: 'number', step: 1, min: 1, max: 12, placeholder: 'e.g. 2', half: true },
    { id: 'minute', label: 'Minute', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 30', half: true },
    { id: 'ampm', label: 'AM / PM', type: 'select', half: true, options: [
      { value: 'AM', label: 'AM', default: true }, { value: 'PM', label: 'PM' }
    ]},
  ],
  formula: '<p>Converts between 12-hour clock (with AM/PM) and 24-hour military time format.</p>',
  calculate: function(v) {
    if (v.hour == null) return { error: 'Enter an hour' };
    let h12 = v.hour, h24;
    const m = v.minute || 0;
    const ampm = v.ampm || 'AM';
    // 12-hour to 24-hour
    if (ampm === 'AM') {
      h24 = h12 === 12 ? 0 : h12;
    } else {
      h24 = h12 === 12 ? 12 : h12 + 12;
    }
    // 24-hour back to 12-hour with AM/PM
    let h12Out = h24 % 12;
    if (h12Out === 0) h12Out = 12;
    const ampmOut = h24 < 12 ? 'AM' : 'PM';
    return {
      '12-Hour': h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm,
      '24-Hour (Military)': String(h24).padStart(2, '0') + ':' + String(m).padStart(2, '0'),
      'Military (no colon)': String(h24).padStart(2, '0') + String(m).padStart(2, '0') + 'hrs',
    };
  }
});

// === LEAP YEAR CHECKER ===

R('leap-year', {
  title: 'Leap Year Checker',
  description: 'Determine if a given year is a leap year.',
  tags: ['leap', 'year', 'feb', 'february', '29'],
  fields: [
    { id: 'year', label: 'Year', type: 'number', step: 1, min: 1, max: 9999, placeholder: 'e.g. 2024' },
  ],
  formula: '<p>A year is a leap year if it is divisible by 4, except for century years which must be divisible by 400.</p>',
  calculate: function(v) {
    if (v.year == null) return { error: 'Enter a year' };
    const y = v.year;
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    const nextLeap = isLeap ? y + 4 : findNextLeap(y);
    const prevLeap = isLeap ? y - 4 : findPrevLeap(y);
    return {
      'Year': y,
      'Is Leap Year': isLeap ? 'Yes' : 'No',
      'Days in Year': isLeap ? 366 : 360 || 365,
      'Days in February': isLeap ? 29 : 28,
      'Next Leap Year': nextLeap,
      'Previous Leap Year': prevLeap,
    };
    function findNextLeap(yr) { for (let i = yr + 1; i <= yr + 8; i++) { if ((i % 4 === 0 && i % 100 !== 0) || i % 400 === 0) return i; } return yr + 4; }
    function findPrevLeap(yr) { for (let i = yr - 1; i >= yr - 8; i--) { if ((i % 4 === 0 && i % 100 !== 0) || i % 400 === 0) return i; } return yr - 4; }
  }
});

// === WEEK NUMBER ===

R('week-number', {
  title: 'Week Number of Year',
  description: 'Find the ISO week number for any date.',
  tags: ['week', 'number', 'ISO', 'year'],
  fields: [
    { id: 'date', label: 'Date', type: 'date', placeholder: 'e.g. 2025-01-15' },
  ],
  formula: '<p>Calculates the ISO 8601 week number. Week 1 is the week containing the first Thursday of the year.</p>',
  calculate: function(v) {
    if (!v.date) return { error: 'Enter a date' };
    const d = new Date(v.date);
    // ISO week number calculation
    const tmp = new Date(d.getTime());
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    const isLeap = (d.getFullYear() % 4 === 0 && d.getFullYear() % 100 !== 0) || d.getFullYear() % 400 === 0;
    const totalWeeks = isLeap ? 53 : 52;
    return {
      'ISO Week Number': weekNo,
      'Year': d.getFullYear(),
      'Day of Year': dayOfYear,
      'Day of Week': core.dayName(v.date),
      'Total Weeks in Year': (isLeap && (new Date(d.getFullYear(), 0, 1).getDay() === 4 || (isLeap && new Date(d.getFullYear(), 0, 1).getDay() === 5))) ? 53 : 52,
      'Week Starts': core.formatDate(v.date),
    };
  }
});

// === TIME DURATION CALCULATOR ===

R('time-duration', {
  title: 'Time Duration Calculator',
  description: 'Calculate the total duration by adding multiple time periods together.',
  tags: ['duration', 'total', 'sum', 'time', 'add'],
  fields: [
    { id: 'durations', label: 'Durations (one per line, format: H:M:S or M:S)', type: 'textarea', placeholder: 'e.g.\n8:30\n1:00\n7:45\n0:30', hint: 'Enter each duration on a new line as hours:minutes:seconds or minutes:seconds' },
  ],
  formula: '<p>Adds multiple time durations together to find the total elapsed time.</p>',
  calculate: function(v) {
    if (!v.durations || !v.durations.trim()) return { error: 'Enter at least one duration' };
    const lines = v.durations.trim().split(/\n/).map(l => l.trim()).filter(l => l);
    let totalSec = 0;
    const parsed = [];
    for (const line of lines) {
      const parts = line.split(':').map(Number);
      let sec;
      if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
      else continue;
      if (isNaN(sec)) continue;
      totalSec += sec;
      parsed.push(sec);
    }
    if (!parsed.length) return { error: 'No valid durations found' };
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const avgSec = totalSec / parsed.length;
    const avgH = Math.floor(avgSec / 3600);
    const avgM = Math.floor((avgSec % 3600) / 60);
    return {
      'Total Duration': h + 'h ' + m + 'm ' + s + 's',
      'Total Hours': core.formatNumber(h + m / 60 + s / 3600, 4),
      'Total Minutes': Math.floor(totalSec / 60),
      'Total Seconds': totalSec,
      'Number of Periods': parsed.length,
      'Average Duration': avgH + 'h ' + avgM + 'm',
    };
  }
});

// === SOLAR TIME CALCULATOR ===

R('solar-time', {
  title: 'Solar Time Calculator',
  description: 'Estimate sunrise and sunset times based on date and latitude.',
  tags: ['solar', 'sunrise', 'sunset', 'daylight', 'latitude'],
  fields: [
    { id: 'date', label: 'Date', type: 'date', placeholder: 'e.g. 2025-06-21' },
    { id: 'latitude', label: 'Latitude (degrees)', type: 'number', step: 0.1, min: -90, max: 90, placeholder: 'e.g. 40.7', half: true },
    { id: 'longitude', label: 'Longitude (degrees)', type: 'number', step: 0.1, min: -180, max: 180, placeholder: 'e.g. -74.0', half: true },
  ],
  formula: '<p>Estimates sunrise and sunset using the solar position algorithm. Accuracy is approximate (\u00b1 few minutes).</p>',
  calculate: function(v) {
    if (!v.date || v.latitude == null) return { error: 'Enter a date and latitude' };
    const d = new Date(v.date);
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    const lat = v.latitude;
    const lon = v.longitude || 0;
    // Solar declination approximation
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81)) * Math.PI / 180;
    // Hour angle at sunrise/sunset
    const cosHA = -Math.tan(lat * Math.PI / 180) * Math.tan(declination);
    let sunrise, sunset, daylightHours;
    if (cosHA > 1) {
      // Sun never rises (polar night)
      return { 'Status': 'Polar Night - Sun does not rise', 'Latitude': lat + '\u00b0', 'Day of Year': dayOfYear };
    } else if (cosHA < -1) {
      // Sun never sets (midnight sun)
      return { 'Status': 'Midnight Sun - Sun does not set', 'Latitude': lat + '\u00b0', 'Day of Year': dayOfYear };
    }
    const ha = Math.acos(cosHA) * 180 / Math.PI;
    // Equation of time approximation (minutes)
    const B = (2 * Math.PI / 365) * (dayOfYear - 81);
    const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    // Solar noon in minutes from midnight UTC
    const solarNoon = 720 - 4 * lon - EoT;
    sunrise = solarNoon - ha * 4;
    sunset = solarNoon + ha * 4;
    daylightHours = (sunset - sunrise) / 60;
    const fmtTime = function(mins) {
      let h = Math.floor(mins / 60) % 24;
      let m = Math.round(mins % 60);
      if (m === 60) { h++; m = 0; }
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    };
    return {
      'Sunrise': fmtTime(sunrise) + ' local',
      'Sunset': fmtTime(sunset) + ' local',
      'Solar Noon': fmtTime(solarNoon) + ' local',
      'Daylight Hours': core.formatNumber(daylightHours, 2),
      'Solar Declination': core.formatNumber(declination * 180 / Math.PI, 2) + '\u00b0',
      'Day of Year': dayOfYear,
    };
  }
});

// === ALIASES ===

R('countdown-timer', {
  title: 'Countdown Timer',
  description: 'Count down the days, hours, and minutes to a future date.',
  tags: ['countdown', 'timer', 'days until', 'event'],
  fields: [
    { id: 'targetDate', label: 'Target Date', type: 'date', placeholder: 'e.g. 2025-12-25' },
    { id: 'targetTime', label: 'Target Time (optional)', type: 'time', placeholder: 'e.g. 00:00' },
  ],
  formula: '<p>Calculates the remaining time from now until the specified target date and time.</p>',
  calculate: function(v) {
    if (!v.targetDate) return { error: 'Enter a target date' };
    const t = v.targetTime || '00:00';
    const target = new Date(v.targetDate + 'T' + t + ':00');
    const now = new Date();
    const diff = target - now;
    if (diff < 0) {
      const past = Math.abs(diff);
      const days = Math.floor(past / 86400000);
      return { 'Status': 'The date has passed', 'Days Ago': days };
    }
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const weeks = Math.floor(days / 7);
    return {
      'Days Until': days,
      'Weeks Until': weeks + ' weeks and ' + (days % 7) + ' days',
      'Hours Until': core.formatNumber(days * 24 + hrs),
      'Countdown': days + ' days, ' + hrs + ' hours, ' + mins + ' minutes',
      'Target Day': core.dayName(v.targetDate),
    };
  }
});

R('date-calendar', {
  title: 'Date Calendar Calculator',
  description: 'Add or subtract calendar units (days, weeks, months, years) from a date.',
  tags: ['date', 'calendar', 'add', 'subtract', 'units'],
  fields: [
    { id: 'startDate', label: 'Start Date', type: 'date', placeholder: 'e.g. 2024-06-01' },
    { id: 'amount', label: 'Amount', type: 'number', step: 1, placeholder: 'e.g. 30', half: true },
    { id: 'unit', label: 'Unit', type: 'select', half: true, options: [
      { value: 'days', label: 'Days' }, { value: 'weeks', label: 'Weeks' },
      { value: 'months', label: 'Months' }, { value: 'years', label: 'Years' }
    ]},
    { id: 'direction', label: 'Direction', type: 'select', options: [
      { value: 'add', label: 'Add (Future)', default: true }, { value: 'subtract', label: 'Subtract (Past)' }
    ]},
  ],
  formula: '<p>Adds or subtracts the specified number of calendar units from the start date.</p>',
  calculate: function(v) {
    if (!v.startDate || !v.amount) return { error: 'Enter a date and amount' };
    const amt = v.direction === 'subtract' ? -v.amount : v.amount;
    let result;
    if (v.unit === 'months') {
      result = core.addMonths(v.startDate, amt);
    } else if (v.unit === 'years') {
      result = core.addMonths(v.startDate, amt * 12);
    } else {
      const days = v.unit === 'weeks' ? amt * 7 : amt;
      const d = new Date(v.startDate);
      d.setDate(d.getDate() + days);
      result = d.toISOString().slice(0, 10);
    }
    const daysDiff = core.daysBetween(v.startDate, result);
    return {
      'Result Date': core.formatDate(result),
      'Day of Week': core.dayName(result),
      'Days Difference': Math.abs(daysDiff),
      'Operation': (v.direction === 'add' ? '+' : '-') + ' ' + Math.abs(v.amount) + ' ' + v.unit,
    };
  }
});

R('date-day', {
  title: 'Date After N Days Calculator',
  description: 'Calculate what date it will be after a given number of days.',
  tags: ['date', 'days', 'future', 'after'],
  fields: [
    { id: 'startDate', label: 'Start Date', type: 'date', placeholder: 'e.g. 2025-01-01' },
    { id: 'days', label: 'Number of Days', type: 'number', step: 1, min: 0, placeholder: 'e.g. 90' },
  ],
  formula: '<p>Adds the specified number of days to the start date.</p>',
  calculate: function(v) {
    if (!v.startDate || v.days == null) return { error: 'Enter a start date and number of days' };
    const d = new Date(v.startDate);
    d.setDate(d.getDate() + v.days);
    const result = d.toISOString().slice(0, 10);
    return {
      'Result Date': core.formatDate(result),
      'Day of Week': core.dayName(result),
      'Days Added': v.days,
      'Weeks': core.formatNumber(v.days / 7, 2),
    };
  }
});

R('day-of-the-week', {
  title: 'Day of the Week Calculator',
  description: 'Find out what day of the week any date falls on.',
  tags: ['day', 'week', 'weekday', 'calendar'],
  fields: [
    { id: 'date', label: 'Date', type: 'date', placeholder: 'e.g. 2025-01-01' },
  ],
  formula: '<p>Determines the day of the week for any given date.</p>',
  calculate: function(v) {
    if (!v.date) return { error: 'Enter a date' };
    const d = new Date(v.date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = dayNames[d.getDay()];
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    const isLeap = (d.getFullYear() % 4 === 0 && d.getFullYear() % 100 !== 0) || d.getFullYear() % 400 === 0;
    return {
      'Day of Week': day,
      'Date': core.formatDate(v.date),
      'Day of Year': dayOfYear,
      'Week Number': Math.ceil(dayOfYear / 7),
      'Is Leap Year': isLeap ? 'Yes' : 'No',
    };
  }
});

R('decimal-to-time-calculator', {
  title: 'Decimal to Time Calculator',
  description: 'Convert decimal hours to hours, minutes, and seconds.',
  tags: ['decimal', 'hours', 'time', 'convert', 'payroll'],
  fields: [
    { id: 'decimalHours', label: 'Decimal Hours', type: 'number', step: 0.01, min: 0, placeholder: 'e.g. 8.75' },
  ],
  formula: '<p>Converts a decimal hour value into hours:minutes:seconds format.</p>',
  calculate: function(v) {
    if (v.decimalHours == null) return { error: 'Enter decimal hours' };
    const h = Math.floor(v.decimalHours);
    const m = Math.floor((v.decimalHours - h) * 60);
    const s = Math.round(((v.decimalHours - h) * 60 - m) * 60);
    const totalMinutes = Math.round(v.decimalHours * 60);
    const totalSeconds = Math.round(v.decimalHours * 3600);
    return {
      'Time': h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'),
      'Hours and Minutes': h + ' hours, ' + m + ' minutes',
      'Total Minutes': totalMinutes,
      'Total Seconds': totalSeconds,
    };
  }
});

R('hours', {
  title: 'Hours Calculator',
  description: 'Add or subtract hours from a start time.',
  tags: ['hours', 'add', 'subtract', 'time'],
  fields: [
    { id: 'startTime', label: 'Start Time', type: 'time', placeholder: 'e.g. 09:30', half: true },
    { id: 'direction', label: 'Direction', type: 'select', half: true, options: [
      { value: 'add', label: 'Add', default: true }, { value: 'subtract', label: 'Subtract' }
    ]},
    { id: 'hours', label: 'Hours', type: 'number', step: 0.25, min: 0, placeholder: 'e.g. 2.5', half: true },
  ],
  formula: '<p>Adds or subtracts hours from the start time.</p>',
  calculate: function(v) {
    if (!v.startTime || !v.hours) return { error: 'Enter a start time and hours' };
    const [sh, sm] = v.startTime.split(':').map(Number);
    const sign = v.direction === 'add' ? 1 : -1;
    const totalMin = sign * v.hours * 60;
    let resultMin = sh * 60 + sm + totalMin;
    resultMin = ((resultMin % 1440) + 1440) % 1440;
    const rh = Math.floor(resultMin / 60);
    const rm = resultMin % 60;
    return {
      'Result Time': String(rh).padStart(2, '0') + ':' + String(rm).padStart(2, '0'),
      'Hours Changed': (v.direction === 'add' ? '+' : '-') + v.hours,
    };
  }
});

R('hours-and-minutes-calculator', {
  title: 'Hours and Minutes Calculator',
  description: 'Add or subtract hours and minutes from a start time.',
  tags: ['hours', 'minutes', 'add', 'subtract', 'time'],
  fields: [
    { id: 'startTime', label: 'Start Time', type: 'time', placeholder: 'e.g. 09:30', half: true },
    { id: 'direction', label: 'Direction', type: 'select', half: true, options: [
      { value: 'add', label: 'Add', default: true }, { value: 'subtract', label: 'Subtract' }
    ]},
    { id: 'hours', label: 'Hours', type: 'number', step: 1, min: 0, placeholder: 'e.g. 2', half: true },
    { id: 'minutes', label: 'Minutes', type: 'number', step: 1, min: 0, placeholder: 'e.g. 30', half: true },
  ],
  formula: '<p>Adds or subtracts hours and minutes from the start time.</p>',
  calculate: function(v) {
    if (!v.startTime) return { error: 'Enter a start time' };
    const [sh, sm] = v.startTime.split(':').map(Number);
    const sign = v.direction === 'add' ? 1 : -1;
    const totalMin = sign * ((v.hours || 0) * 60 + (v.minutes || 0));
    let resultMin = sh * 60 + sm + totalMin;
    resultMin = ((resultMin % 1440) + 1440) % 1440;
    const rh = Math.floor(resultMin / 60);
    const rm = resultMin % 60;
    return {
      'Result Time': String(rh).padStart(2, '0') + ':' + String(rm).padStart(2, '0'),
      'Total Minutes Changed': Math.abs(totalMin),
    };
  }
});

R('hours-minutes-seconds', {
  title: 'Hours Minutes Seconds Calculator',
  description: 'Add or subtract hours, minutes, and seconds from a time.',
  tags: ['hours', 'minutes', 'seconds', 'HMS', 'time'],
  fields: [
    { id: 'startTime', label: 'Start Time', type: 'time', placeholder: 'e.g. 09:30', half: true },
    { id: 'direction', label: 'Direction', type: 'select', half: true, options: [
      { value: 'add', label: 'Add', default: true }, { value: 'subtract', label: 'Subtract' }
    ]},
    { id: 'hours', label: 'Hours', type: 'number', step: 1, min: 0, placeholder: 'e.g. 2', half: true },
    { id: 'minutes', label: 'Minutes', type: 'number', step: 1, min: 0, placeholder: 'e.g. 30', half: true },
    { id: 'seconds', label: 'Seconds', type: 'number', step: 1, min: 0, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p>Adds or subtracts hours, minutes, and seconds from the start time.</p>',
  calculate: function(v) {
    if (!v.startTime) return { error: 'Enter a start time' };
    const [sh, sm] = v.startTime.split(':').map(Number);
    const sign = v.direction === 'add' ? 1 : -1;
    const totalSec = sign * ((v.hours || 0) * 3600 + (v.minutes || 0) * 60 + (v.seconds || 0));
    let resultSec = sh * 3600 + sm * 60 + totalSec;
    resultSec = ((resultSec % 86400) + 86400) % 86400;
    const rh = Math.floor(resultSec / 3600);
    const rm = Math.floor((resultSec % 3600) / 60);
    const rs = resultSec % 60;
    return {
      'Result Time': String(rh).padStart(2, '0') + ':' + String(rm).padStart(2, '0') + ':' + String(rs).padStart(2, '0'),
      'Total Seconds Changed': Math.abs(totalSec),
    };
  }
});

R('military-time-converter', {
  title: 'Military Time Converter',
  description: 'Convert between 12-hour and 24-hour (military) time formats.',
  tags: ['military', '24-hour', '12-hour', 'AM', 'PM', 'convert'],
  fields: [
    { id: 'hour', label: 'Hour', type: 'number', step: 1, min: 1, max: 12, placeholder: 'e.g. 2', half: true },
    { id: 'minute', label: 'Minute', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 30', half: true },
    { id: 'ampm', label: 'AM / PM', type: 'select', half: true, options: [
      { value: 'AM', label: 'AM', default: true }, { value: 'PM', label: 'PM' }
    ]},
  ],
  formula: '<p>Converts between 12-hour clock (with AM/PM) and 24-hour military time format.</p>',
  calculate: function(v) {
    if (v.hour == null) return { error: 'Enter an hour' };
    let h12 = v.hour, h24;
    const m = v.minute || 0;
    const ampm = v.ampm || 'AM';
    if (ampm === 'AM') {
      h24 = h12 === 12 ? 0 : h12;
    } else {
      h24 = h12 === 12 ? 12 : h12 + 12;
    }
    let h12Out = h24 % 12;
    if (h12Out === 0) h12Out = 12;
    const ampmOut = h24 < 12 ? 'AM' : 'PM';
    return {
      '12-Hour': h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm,
      '24-Hour (Military)': String(h24).padStart(2, '0') + ':' + String(m).padStart(2, '0'),
      'Military (no colon)': String(h24).padStart(2, '0') + String(m).padStart(2, '0') + 'hrs',
    };
  }
});

R('stopwatchtimer', {
  title: 'Stopwatch Timer Converter',
  description: 'Convert a total number of seconds into a readable H:M:S format.',
  tags: ['stopwatch', 'seconds', 'convert', 'HMS', 'timer'],
  fields: [
    { id: 'seconds', label: 'Total Seconds', type: 'number', step: 1, min: 0, placeholder: 'e.g. 3661' },
  ],
  formula: '<p>Breaks down a total number of seconds into hours, minutes, and seconds.</p>',
  calculate: function(v) {
    if (v.seconds == null) return { error: 'Enter total seconds' };
    const total = Math.floor(v.seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const days = Math.floor(h / 24);
    const remH = h % 24;
    return {
      'Formatted': (days > 0 ? days + 'd ' : '') + String(remH).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'),
      'Hours': h,
      'Minutes': Math.floor(total / 60),
      'Days': core.formatNumber(total / 86400, 4),
    };
  }
});

R('sunrise_sunset', {
  title: 'Sunrise Sunset Calculator',
  description: 'Estimate sunrise and sunset times based on date and latitude.',
  tags: ['sunrise', 'sunset', 'solar', 'daylight', 'latitude'],
  fields: [
    { id: 'date', label: 'Date', type: 'date', placeholder: 'e.g. 2025-06-21' },
    { id: 'latitude', label: 'Latitude (degrees)', type: 'number', step: 0.1, min: -90, max: 90, placeholder: 'e.g. 40.7', half: true },
    { id: 'longitude', label: 'Longitude (degrees)', type: 'number', step: 0.1, min: -180, max: 180, placeholder: 'e.g. -74.0', half: true },
  ],
  formula: '<p>Estimates sunrise and sunset using the solar position algorithm. Accuracy is approximate.</p>',
  calculate: function(v) {
    if (!v.date || v.latitude == null) return { error: 'Enter a date and latitude' };
    const d = new Date(v.date);
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    const lat = v.latitude;
    const lon = v.longitude || 0;
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81)) * Math.PI / 180;
    const cosHA = -Math.tan(lat * Math.PI / 180) * Math.tan(declination);
    if (cosHA > 1) {
      return { 'Status': 'Polar Night - Sun does not rise', 'Latitude': lat + '\u00b0', 'Day of Year': dayOfYear };
    } else if (cosHA < -1) {
      return { 'Status': 'Midnight Sun - Sun does not set', 'Latitude': lat + '\u00b0', 'Day of Year': dayOfYear };
    }
    const ha = Math.acos(cosHA) * 180 / Math.PI;
    const B = (2 * Math.PI / 365) * (dayOfYear - 81);
    const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const solarNoon = 720 - 4 * lon - EoT;
    const sunrise = solarNoon - ha * 4;
    const sunset = solarNoon + ha * 4;
    const daylightHours = (sunset - sunrise) / 60;
    const fmtTime = function(mins) {
      let h = Math.floor(mins / 60) % 24;
      let m = Math.round(mins % 60);
      if (m === 60) { h++; m = 0; }
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    };
    return {
      'Sunrise': fmtTime(sunrise) + ' local',
      'Sunset': fmtTime(sunset) + ' local',
      'Solar Noon': fmtTime(solarNoon) + ' local',
      'Daylight Hours': core.formatNumber(daylightHours, 2),
      'Day of Year': dayOfYear,
    };
  }
});

R('time-clock-calculator', {
  title: 'Time Clock Calculator',
  description: 'Calculate total hours worked from time clock in/out entries.',
  tags: ['time clock', 'in', 'out', 'work hours', 'timesheet'],
  fields: [
    { id: 'entries', label: 'Time Entries (one per line, format: IN OUT)', type: 'textarea', placeholder: 'e.g.\n09:00 17:30\n08:30 12:00\n13:00 17:00', hint: 'Enter each pair as "IN OUT" on a separate line' },
  ],
  formula: '<p>Calculates total hours worked from time clock in/out pairs.</p>',
  calculate: function(v) {
    if (!v.entries || !v.entries.trim()) return { error: 'Enter at least one time entry' };
    const lines = v.entries.trim().split(/\n/).map(l => l.trim()).filter(l => l);
    let totalMin = 0;
    const details = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const [ih, im] = parts[0].split(':').map(Number);
      const [oh, om] = parts[1].split(':').map(Number);
      let dur = (oh * 60 + om) - (ih * 60 + im);
      if (dur < 0) dur += 1440; // crossed midnight
      totalMin += dur;
      details.push({ in: parts[0], out: parts[1], hours: core.formatNumber(dur / 60, 2) });
    }
    if (!details.length) return { error: 'No valid entries found' };
    let rows = details.map(d => `<tr><td>${d.in}</td><td>${d.out}</td><td>${d.hours}</td></tr>`).join('');
    return {
      html: `<table><tr><th>In</th><th>Out</th><th>Hours</th></tr>${rows}</table>
        <p style="margin-top:1rem"><strong>Total Hours:</strong> ${core.formatNumber(totalMin / 60, 2)}</p>
        <p><strong>Total Minutes:</strong> ${totalMin}</p>
        <p><strong>Number of Entries:</strong> ${details.length}</p>`
    };
  }
});

R('time-to-decimal-calculator', {
  title: 'Time to Decimal Calculator',
  description: 'Convert hours, minutes, and seconds to decimal hours.',
  tags: ['time', 'decimal', 'hours', 'convert', 'payroll'],
  fields: [
    { id: 'hours', label: 'Hours', type: 'number', step: 1, min: 0, placeholder: 'e.g. 8', half: true },
    { id: 'minutes', label: 'Minutes', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 45', half: true },
    { id: 'seconds', label: 'Seconds', type: 'number', step: 1, min: 0, max: 59, placeholder: 'e.g. 0', half: true },
  ],
  formula: '<p>Converts hours:minutes:seconds into a decimal hour value.</p>',
  calculate: function(v) {
    const h = v.hours || 0, m = v.minutes || 0, s = v.seconds || 0;
    const decimal = h + m / 60 + s / 3600;
    const totalMinutes = h * 60 + m + s / 60;
    const totalSeconds = h * 3600 + m * 60 + s;
    return {
      'Decimal Hours': core.formatNumber(decimal, 4),
      'Total Minutes': core.formatNumber(totalMinutes, 2),
      'Total Seconds': totalSeconds,
    };
  }
});

R('work-hours-calculator', {
  title: 'Work Hours Calculator',
  description: 'Calculate total weekly work hours with breaks deducted.',
  tags: ['work', 'hours', 'weekly', 'break', 'timesheet'],
  fields: [
    { id: 'monIn', label: 'Monday In', type: 'time', placeholder: 'e.g. 09:00', half: true },
    { id: 'monOut', label: 'Monday Out', type: 'time', placeholder: 'e.g. 17:00', half: true },
    { id: 'tueIn', label: 'Tuesday In', type: 'time', placeholder: 'e.g. 09:00', half: true },
    { id: 'tueOut', label: 'Tuesday Out', type: 'time', placeholder: 'e.g. 17:00', half: true },
    { id: 'wedIn', label: 'Wednesday In', type: 'time', placeholder: 'e.g. 09:00', half: true },
    { id: 'wedOut', label: 'Wednesday Out', type: 'time', placeholder: 'e.g. 17:00', half: true },
    { id: 'thuIn', label: 'Thursday In', type: 'time', placeholder: 'e.g. 09:00', half: true },
    { id: 'thuOut', label: 'Thursday Out', type: 'time', placeholder: 'e.g. 17:00', half: true },
    { id: 'friIn', label: 'Friday In', type: 'time', placeholder: 'e.g. 09:00', half: true },
    { id: 'friOut', label: 'Friday Out', type: 'time', placeholder: 'e.g. 17:00', half: true },
    { id: 'breakMin', label: 'Daily Break (minutes)', type: 'number', step: 5, min: 0, placeholder: 'e.g. 30', half: true },
  ],
  formula: '<p>Calculates total work hours for the week, subtracting daily break time for each day worked.</p>',
  calculate: function(v) {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    let totalMin = 0;
    let daysWorked = 0;
    const details = [];
    for (const day of days) {
      const inTime = v[day + 'In'], outTime = v[day + 'Out'];
      if (inTime && outTime) {
        const [ih, im] = inTime.split(':').map(Number);
        const [oh, om] = outTime.split(':').map(Number);
        let dur = (oh * 60 + om) - (ih * 60 + im);
        if (dur < 0) dur += 1440;
        const breakMin = v.breakMin || 0;
        const net = dur - breakMin;
        totalMin += net;
        daysWorked++;
        details.push({ day: day.toUpperCase().slice(0, 3), hours: core.formatNumber(net / 60, 2) });
      }
    }
    if (!daysWorked) return { error: 'Enter at least one day with in/out times' };
    let rows = details.map(d => `<tr><td>${d.day}</td><td>${d.hours}</td></tr>`).join('');
    return {
      html: `<table><tr><th>Day</th><th>Hours</th></tr>${rows}</table>
        <p style="margin-top:1rem"><strong>Total Weekly Hours:</strong> ${core.formatNumber(totalMin / 60, 2)}</p>
        <p><strong>Days Worked:</strong> ${daysWorked}</p>
        <p><strong>Average per Day:</strong> ${core.formatNumber(totalMin / 60 / daysWorked, 2)}</p>`
    };
  }
});

})(calculatorRegistry);
