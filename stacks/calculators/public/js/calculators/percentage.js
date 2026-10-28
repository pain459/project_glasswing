// Percentage Calculator — three calculations on one page

document.getElementById("form1").addEventListener("submit", function (e) {
  e.preventDefault();
  const x = core.getNumber("p1_x");
  const y = core.getNumber("p1_y");
  if (x === null || y === null) return;
  const ans = (x / 100) * y;
  document.getElementById("result1").innerHTML =
    '<p class="value">' + core.formatNumber(ans) + '</p>' +
    '<p>' + core.formatNumber(x) + '% of ' + core.formatNumber(y) + ' = ' + core.formatNumber(ans) + '</p>';
  core.showResult("result1");
});

document.getElementById("form2").addEventListener("submit", function (e) {
  e.preventDefault();
  const x = core.getNumber("p2_x");
  const y = core.getNumber("p2_y");
  if (x === null || y === null || y === 0) return;
  const ans = (x / y) * 100;
  document.getElementById("result2").innerHTML =
    '<p class="value">' + core.formatNumber(ans) + '%</p>' +
    '<p>' + core.formatNumber(x) + ' is ' + core.formatNumber(ans) + '% of ' + core.formatNumber(y) + '</p>';
  core.showResult("result2");
});

document.getElementById("form3").addEventListener("submit", function (e) {
  e.preventDefault();
  const x = core.getNumber("p3_x");
  const y = core.getNumber("p3_y");
  if (x === null || y === null || x === 0) return;
  const ans = ((y - x) / Math.abs(x)) * 100;
  const dir = ans >= 0 ? "increase" : "decrease";
  document.getElementById("result3").innerHTML =
    '<p class="value">' + core.formatNumber(Math.abs(ans)) + '% ' + dir + '</p>' +
    '<p>Change from ' + core.formatNumber(x) + ' to ' + core.formatNumber(y) + ' is ' + core.formatNumber(ans) + '%</p>';
  core.showResult("result3");
});
