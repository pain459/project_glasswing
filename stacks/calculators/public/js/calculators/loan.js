// Loan Calculator
document.getElementById("loanForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const P = core.getNumber("loanAmount", 0.01);
  const annualRate = core.getNumber("interestRate", 0, 100);
  const n = core.getNumber("termMonths", 1, 600);

  if (P === null || annualRate === null || n === null) {
    alert("Please enter valid numbers in all fields.");
    return;
  }

  const r = annualRate / 100 / 12;
  let M;
  if (r === 0) {
    M = P / n;
  } else {
    M = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const totalPaid = M * n;
  const totalInterest = totalPaid - P;

  const resultEl = document.getElementById("result");
  resultEl.innerHTML =
    '<h3>Results</h3>' +
    '<p class="value">' + core.formatCurrency(M) + ' / month</p>' +
    '<table>' +
    '<tr><th>Total Paid</th><td>' + core.formatCurrency(totalPaid) + '</td></tr>' +
    '<tr><th>Total Interest</th><td>' + core.formatCurrency(totalInterest) + '</td></tr>' +
    '<tr><th>Principal</th><td>' + core.formatCurrency(P) + '</td></tr>' +
    "</table>";

  core.showResult("result");
});

// Pre-fill from URL params
window.addEventListener("DOMContentLoaded", function () {
  const amt = core.urlParam("amount");
  const rate = core.urlParam("rate");
  const term = core.urlParam("term");
  if (amt) document.getElementById("loanAmount").value = amt;
  if (rate) document.getElementById("interestRate").value = rate;
  if (term) document.getElementById("termMonths").value = term;
});
