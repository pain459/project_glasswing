// Homelab / infrastructure calculators
// These cover the questions that come up while running the platform itself:
// addressing a Docker network, sizing a RAID array, planning a transfer, and
// working out what the machine costs to run.
(function(reg) {
const T = reg.register.bind(reg, 'technology');
const F = reg.register.bind(reg, 'financial');

// === SUBNET / CIDR ===

const ipToInt = (value) => {
  const parts = String(value).trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    n = (n * 256) + octet;
  }
  return n >>> 0;
};

const intToIp = (n) =>
  [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

T('subnet-calculator', {
  title: 'Subnet (CIDR) Calculator',
  description: 'Work out the network, broadcast, host range and usable host count for an IPv4 subnet.',
  tags: ['subnet', 'cidr', 'ipv4', 'netmask', 'network', 'vlan', 'docker'],
  fields: [
    { id: 'ip', label: 'IPv4 Address', type: 'text', placeholder: 'e.g. 192.168.68.62' },
    { id: 'prefix', label: 'Prefix Length (/n)', type: 'number', step: 1, min: 0, max: 32, value: 24, half: true },
  ],
  formula: '<p><code>Network = IP AND Mask</code>, <code>Broadcast = Network OR ¬Mask</code>, <code>Usable hosts = 2^(32 − n) − 2</code>. /31 has 2 usable addresses and /32 has 1 (RFC 3021).</p>',
  background: '<p>CIDR replaced classful A/B/C addressing in 1993 (RFC 1519). The address is split into a network part and a host part at an arbitrary bit boundary, which is why an address is written <code>192.168.68.0/24</code>. In this platform the shared Docker bridge is <code>10.89.0.0/24</code> and Docker carves private networks out of <code>172.16.0.0/12</code>; both are chosen so they never overlap the LAN.</p>',
  calculate: function(v) {
    const base = ipToInt(v.ip);
    const prefix = Number(v.prefix);
    if (base === null) return { error: 'Enter a valid IPv4 address such as 192.168.68.62.' };
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      return { error: 'Prefix length must be a whole number from 0 to 32.' };
    }

    const hostBits = 32 - prefix;
    const mask = prefix === 0 ? 0 : (0xFFFFFFFF << hostBits) >>> 0;
    const wildcard = (~mask) >>> 0;
    const network = (base & mask) >>> 0;
    const broadcast = (network | wildcard) >>> 0;
    const total = Math.pow(2, hostBits);

    let usable, first, last;
    if (prefix === 32) {
      usable = 1; first = network; last = network;
    } else if (prefix === 31) {
      usable = 2; first = network; last = broadcast;
    } else {
      usable = total - 2; first = network + 1; last = broadcast - 1;
    }

    return {
      'CIDR': `${intToIp(network)}/${prefix}`,
      'Network Address': intToIp(network),
      'Broadcast Address': intToIp(broadcast),
      'Subnet Mask': intToIp(mask),
      'Wildcard Mask': intToIp(wildcard),
      'Usable Host Range': `${intToIp(first)} – ${intToIp(last)}`,
      'Usable Hosts': core.formatNumber(usable, 0),
      'Total Addresses': core.formatNumber(total, 0),
      'Address Class': network >>> 24 < 128 ? 'A' : network >>> 24 < 192 ? 'B' : network >>> 24 < 224 ? 'C' : network >>> 24 < 240 ? 'D (multicast)' : 'E (reserved)',
    };
  }
});

// === RAID CAPACITY ===

T('raid-capacity-calculator', {
  title: 'RAID Capacity Calculator',
  description: 'Usable capacity, parity overhead and fault tolerance for common RAID levels.',
  tags: ['raid', 'storage', 'nas', 'parity', 'homelab', 'disk'],
  fields: [
    { id: 'disks', label: 'Data Disks', type: 'number', step: 1, min: 2, max: 48, value: 4, half: true },
    { id: 'size', label: 'Size per Disk (TB)', type: 'number', step: 0.1, min: 0.1, value: 8, half: true },
    { id: 'level', label: 'RAID Level', type: 'select', options: [
      { value: '0', label: 'RAID 0 — stripe, no redundancy' },
      { value: '1', label: 'RAID 1 — mirror' },
      { value: '5', label: 'RAID 5 — single parity', default: true },
      { value: '6', label: 'RAID 6 — double parity' },
      { value: '10', label: 'RAID 10 — mirrored stripes' },
    ]},
    { id: 'spares', label: 'Hot Spares', type: 'number', step: 1, min: 0, max: 8, value: 0, half: true },
  ],
  formula: '<p><code>RAID 0: N × S</code>, <code>RAID 1: S</code>, <code>RAID 5: (N − 1) × S</code>, <code>RAID 6: (N − 2) × S</code>, <code>RAID 10: floor(N/2) × S</code>, where N is data disks and S is disk size. Spares are excluded from N.</p>',
  background: '<p>RAID trades capacity for availability: mirroring keeps a full copy, parity keeps checksums that can rebuild one (RAID 5) or two (RAID 6) failed disks. Rebuilds are slow and stress every remaining disk, and RAID is not a backup — it cannot undo a deletion or ransomware. Pathfinder keeps its data on two separate filesystems instead of one array, so a lost disk only costs one copy.</p>',
  calculate: function(v) {
    const level = String(v.level);
    const spares = Number(v.spares) || 0;
    const data = Number(v.disks);
    const size = Number(v.size);
    if (!Number.isFinite(data) || !Number.isFinite(size) || data < 2 || size <= 0) {
      return { error: 'Enter at least 2 disks and a positive size.' };
    }
    if (spares < 0 || spares >= data) {
      return { error: 'Hot spares must be fewer than the number of disks.' };
    }

    const n = data - spares;
    const minimum = { '0': 2, '1': 2, '5': 2, '6': 3, '10': 4 }[level];
    if (n < minimum) {
      return { error: `RAID ${level} needs at least ${minimum} data disks (excluding spares).` };
    }
    if (level === '10' && n % 2 !== 0) {
      return { error: 'RAID 10 needs an even number of data disks; otherwise the last disk is unused.' };
    }

    let usable, tolerance, note;
    switch (level) {
      case '0': usable = n * size; tolerance = 0; note = 'Any disk failure loses the array.'; break;
      case '1': usable = size; tolerance = n - 1; note = 'Every disk holds a full copy.'; break;
      case '5': usable = (n - 1) * size; tolerance = 1; note = 'One disk can fail; capacity of one disk is parity.'; break;
      case '6': usable = (n - 2) * size; tolerance = 2; note = 'Two disks can fail; two disks of parity.'; break;
      default: usable = Math.floor(n / 2) * size; tolerance = 1; note = 'One disk per mirror pair can fail; half the disks are copies.'; break;
    }

    const raw = data * size;
    return {
      'Usable Capacity': core.formatNumber(usable, 2) + ' TB',
      'Raw Capacity': core.formatNumber(raw, 2) + ' TB',
      'Parity / Mirror Overhead': core.formatNumber(raw - usable, 2) + ' TB',
      'Storage Efficiency': core.formatPercent(usable / raw * 100),
      'Fault Tolerance': tolerance === 0 ? 'None' : tolerance + (tolerance === 1 ? ' disk' : ' disks'),
      'Data Disks Used': n + (spares ? ` (+${spares} hot spare${spares > 1 ? 's' : ''})` : ''),
      'Note': note,
    };
  }
});

// === DATA TRANSFER TIME ===

T('data-transfer-time', {
  title: 'Data Transfer Time Calculator',
  description: 'How long a file or backup takes over a link, accounting for protocol overhead.',
  tags: ['bandwidth', 'transfer', 'network', 'backup', 'throughput', 'download'],
  fields: [
    { id: 'size', label: 'Data Size', type: 'number', step: 0.1, min: 0, value: 100, half: true },
    { id: 'sizeUnit', label: 'Size Unit', type: 'select', options: [
      { value: 'MB', label: 'Megabytes (MB)' },
      { value: 'GB', label: 'Gigabytes (GB)', default: true },
      { value: 'TB', label: 'Terabytes (TB)' },
    ], half: true },
    { id: 'speed', label: 'Link Speed', type: 'number', step: 0.1, min: 0, value: 1, half: true },
    { id: 'speedUnit', label: 'Speed Unit', type: 'select', options: [
      { value: 'Mbps', label: 'Megabits/s (Mbps)' },
      { value: 'MBps', label: 'Megabytes/s (MB/s)' },
      { value: 'Gbps', label: 'Gigabits/s (Gbps)', default: true },
    ], half: true },
    { id: 'overhead', label: 'Protocol Overhead (%)', type: 'number', step: 1, min: 0, max: 90, value: 5, half: true },
  ],
  formula: '<p><code>t = (Size × 8) / (Bandwidth × (1 − overhead))</code>. The factor 8 converts bytes to bits; overhead covers TCP/IP, framing and disk or encryption limits.</p>',
  background: '<p>Link speeds are quoted in bits per second while files are measured in bytes, so a “1 Gbps” LAN moves at most 125 MB/s and in practice about 110–118 MB/s. Backups are also bounded by the slowest component — gigabit Ethernet, the USB bridge, the disk itself or encryption. This calculator uses decimal units (1 GB = 10⁹ bytes) to match how drives and ISPs are sold.</p>',
  calculate: function(v) {
    const size = Number(v.size);
    const speed = Number(v.speed);
    const overhead = Number(v.overhead) || 0;
    if (!Number.isFinite(size) || size <= 0) return { error: 'Enter a data size greater than zero.' };
    if (!Number.isFinite(speed) || speed <= 0) return { error: 'Enter a link speed greater than zero.' };
    if (overhead < 0 || overhead >= 100) return { error: 'Overhead must be between 0 and 90%.' };

    const sizeBytes = { MB: 1e6, GB: 1e9, TB: 1e12 }[v.sizeUnit] * size;
    const speedBps = { Mbps: 1e6, MBps: 8e6, Gbps: 1e9 }[v.speedUnit] * speed;
    const effective = speedBps * (1 - overhead / 100);
    const seconds = (sizeBytes * 8) / effective;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    const human = [
      hours ? `${hours} h` : '',
      minutes ? `${minutes} min` : '',
      `${secs} s`,
    ].filter(Boolean).join(' ');

    return {
      'Transfer Time': human,
      'Time in Seconds': core.formatNumber(seconds, 1),
      'Effective Throughput': core.formatNumber(effective / 8 / 1e6, 2) + ' MB/s',
      'Data Size': core.formatNumber(sizeBytes / 1e9, 3) + ' GB',
      'Effective Link': core.formatNumber(effective / 1e6, 1) + ' Mbps after ' + core.formatNumber(overhead, 0) + '% overhead',
      'Per Day at This Rate': core.formatNumber(effective * 86400 / 8 / 1e12, 2) + ' TB/day',
    };
  }
});

// === UPS RUNTIME ===

T('ups-runtime-calculator', {
  title: 'UPS Runtime Calculator',
  description: 'Estimate how long a battery can carry a load before it shuts down.',
  tags: ['ups', 'battery', 'runtime', 'power', 'homelab', 'outage'],
  fields: [
    { id: 'ah', label: 'Battery Capacity (Ah)', type: 'number', step: 0.1, min: 0.1, value: 9, half: true },
    { id: 'voltage', label: 'Battery Voltage (V)', type: 'number', step: 0.1, min: 0.1, value: 12, half: true },
    { id: 'load', label: 'Load (W)', type: 'number', step: 1, min: 1, value: 120, half: true },
    { id: 'efficiency', label: 'Inverter Efficiency (%)', type: 'number', step: 1, min: 1, max: 100, value: 90, half: true },
    { id: 'dod', label: 'Usable Depth of Discharge (%)', type: 'number', step: 1, min: 1, max: 100, value: 80, half: true },
  ],
  formula: '<p><code>Usable Wh = Ah × V × DoD × η</code>, <code>Runtime (h) = Usable Wh / Load (W)</code>. η is the inverter efficiency, DoD the fraction of the battery you allow yourself to use.</p>',
  background: '<p>Battery capacity in amp-hours only becomes energy when multiplied by voltage: 9 Ah at 12 V is 108 Wh, not 9. Lead-acid batteries should not be discharged below about 50% or their life collapses, while LiFePO4 tolerates 80–90%. Real runtime also falls faster than the arithmetic suggests under heavy load (the Peukert effect), so treat the result as an optimistic ceiling.</p>',
  calculate: function(v) {
    const ah = Number(v.ah);
    const voltage = Number(v.voltage);
    const load = Number(v.load);
    const efficiency = Number(v.efficiency) / 100;
    const dod = Number(v.dod) / 100;
    if ([ah, voltage, load].some((x) => !Number.isFinite(x) || x <= 0)) {
      return { error: 'Capacity, voltage and load must all be positive.' };
    }
    if (!(efficiency > 0 && efficiency <= 1) || !(dod > 0 && dod <= 1)) {
      return { error: 'Efficiency and depth of discharge must be between 1 and 100%.' };
    }

    const nominalWh = ah * voltage;
    const usableWh = nominalWh * dod * efficiency;
    const hours = usableWh / load;
    const minutes = hours * 60;

    return {
      'Estimated Runtime': hours >= 1
        ? `${core.formatNumber(hours, 1)} h (${core.formatNumber(minutes, 0)} min)`
        : `${core.formatNumber(minutes, 0)} min`,
      'Usable Energy': core.formatNumber(usableWh, 0) + ' Wh',
      'Nominal Battery Energy': core.formatNumber(nominalWh, 0) + ' Wh',
      'Load': core.formatNumber(load, 0) + ' W',
      'Runtime per 100 Wh': core.formatNumber(100 / load * 60, 1) + ' min',
      'Note': 'Real lead-acid runtime is shorter at high load (Peukert effect); add margin.',
    };
  }
});

// === ELECTRICITY COST ===

F('electricity-cost-calculator', {
  title: 'Electricity Cost Calculator',
  description: 'What a device costs to run, from its wattage, hours of use and your kWh price.',
  tags: ['electricity', 'power', 'kwh', 'cost', 'homelab', 'energy'],
  fields: [
    { id: 'watts', label: 'Power Draw (W)', type: 'number', step: 1, min: 0, value: 250, half: true },
    { id: 'hours', label: 'Hours per Day', type: 'number', step: 0.1, min: 0, max: 24, value: 24, half: true },
    { id: 'days', label: 'Days in Period', type: 'number', step: 1, min: 1, max: 366, value: 30, half: true },
    { id: 'rate', label: 'Price per kWh', type: 'number', step: 0.001, min: 0, value: 0.20, half: true },
    { id: 'devices', label: 'Number of Devices', type: 'number', step: 1, min: 1, value: 1, half: true },
  ],
  formula: '<p><code>kWh = W × hours × days × devices / 1000</code>, <code>Cost = kWh × price</code>. One kilowatt-hour is 1 kW drawn for one hour.</p>',
  background: '<p>A workstation like Pathfinder draws far more under a 4090 inference load than at idle, so the honest number is an average over time — measure it with a wall meter or a smart plug for a day. The GPU alone can swing the total by 300 W. Electricity is also why an always-on homelab is usually cheaper to run than a cloud instance of similar CPU, RAM and GPU, but only if the load is actually used.</p>',
  calculate: function(v) {
    const watts = Number(v.watts);
    const hours = Number(v.hours);
    const days = Number(v.days);
    const rate = Number(v.rate);
    const devices = Number(v.devices) || 1;
    if ([watts, hours, days, rate, devices].some((x) => !Number.isFinite(x) || x < 0)) {
      return { error: 'All values must be zero or positive.' };
    }
    if (hours > 24) return { error: 'Hours per day cannot exceed 24.' };
    if (devices < 1) return { error: 'Enter at least one device.' };

    const kwh = (watts * hours * days * devices) / 1000;
    const cost = kwh * rate;
    const perDay = cost / days;
    const perYear = perDay * 365;

    return {
      'Energy Used': core.formatNumber(kwh, 2) + ' kWh',
      'Cost for Period': core.formatCurrency(cost),
      'Average per Day': core.formatCurrency(perDay),
      'Projected per Year': core.formatCurrency(perYear),
      'Cost per Hour': core.formatCurrency((watts * devices / 1000) * rate),
      'Average Load': core.formatNumber(watts * devices, 0) + ' W',
    };
  }
});

})(calculatorRegistry);
