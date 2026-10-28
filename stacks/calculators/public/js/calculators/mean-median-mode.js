// Mean, Median, Mode Calculator

document.getElementById("statsForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const data = core.getDataSet("dataSet");

  if (data.length === 0) {
    alert("Please enter at least one number.");
    return;
  }

  const count = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  // Median
  let median;
  if (count % 2 === 0) {
    median = (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
  } else {
    median = sorted[Math.floor(count / 2)];
  }

  // Mode
  const freq = {};
  data.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq));
  const modes = Object.keys(freq).filter((k) => freq[k] === maxFreq).map(Number).sort((a, b) => a - b);
  const modeStr = maxFreq === 1 ? "No mode" : modes.join(", ");

  document.getElementById("result").innerHTML =
    '<h3>Results</h3>' +
    '<table>' +
    '<tr><th>Count</th><td>' + count + '</td></tr>' +
    '<tr><th>Sum</th><td>' + core.formatNumber(sum) + '</td></tr>' +
    '<tr><th>Mean</th><td>' + core.formatNumber(mean) + '</td></tr>' +
    '<tr><th>Median</th><td>' + core.formatNumber(median) + '</td></tr>' +
    '<tr><th>Mode</th><td>' + modeStr + '</td></tr>' +
    '<tr><th>Min</th><td>' + core.formatNumber(min) + '</td></tr>' +
    '<tr><th>Max</th><td>' + core.formatNumber(max) + '</td></tr>' +
    '<tr><th>Range</th><td>' + core.formatNumber(range) + '</td></tr>' +
    "</table>";
  core.showResult("result");
});
