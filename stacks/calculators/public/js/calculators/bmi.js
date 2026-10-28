// BMI Calculator

const unitSel = document.getElementById("unitSystem");
const weightLabel = document.getElementById("weightLabel");
const heightLabel = document.getElementById("heightLabel");
const weightInput = document.getElementById("weight");
const heightInput = document.getElementById("height");

function updateLabels() {
  if (unitSel.value === "metric") {
    weightLabel.textContent = "Weight (kg)";
    heightLabel.textContent = "Height (cm)";
    weightInput.placeholder = "e.g. 70";
    heightInput.placeholder = "e.g. 175";
  } else {
    weightLabel.textContent = "Weight (lbs)";
    heightLabel.textContent = "Height (inches)";
    weightInput.placeholder = "e.g. 154";
    heightInput.placeholder = "e.g. 69";
  }
}
unitSel.addEventListener("change", updateLabels);
updateLabels();

document.getElementById("bmiForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const weight = core.getNumber("weight", 0.1);
  const height = core.getNumber("height", 0.1);
  if (weight === null || height === null) return;

  let bmi;
  if (unitSel.value === "metric") {
    const heightM = height / 100;
    bmi = weight / (heightM * heightM);
  } else {
    bmi = 703 * weight / (height * height);
  }

  let category;
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal weight";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";

  document.getElementById("result").innerHTML =
    '<p class="value">BMI: ' + core.formatNumber(bmi) + '</p>' +
    '<p>Category: <strong>' + category + '</strong></p>';
  core.showResult("result");
});
