// Distance & Length Converter — loads unit table from JSON
(async function () {
  const data = await fetch("../../js/conversions/distance.json").then((r) => r.json());

  const fromSel = document.getElementById("fromUnit");
  const toSel = document.getElementById("toUnit");

  data.units.forEach((u) => {
    const opt1 = new Option(u.name + " (" + u.symbol + ")", u.factor);
    const opt2 = new Option(u.name + " (" + u.symbol + ")", u.factor);
    fromSel.appendChild(opt1);
    toSel.appendChild(opt2);
  });

  // Default: meters → feet
  fromSel.value = "1";
  toSel.value = "0.3048";

  document.getElementById("convertForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const val = core.getNumber("inputValue");
    if (val === null) return;

    const fromFactor = parseFloat(fromSel.value);
    const toFactor = parseFloat(toSel.value);
    const fromName = fromSel.options[fromSel.selectedIndex].text;
    const toName = toSel.options[toSel.selectedIndex].text;

    const result = (val * fromFactor) / toFactor;

    document.getElementById("result").innerHTML =
      '<p class="value">' + core.formatNumber(result, 6) + " " + toName.split(" ")[0] + "</p>" +
      '<p>' + core.formatNumber(val) + " " + fromName.split(" ")[0] + " = " + core.formatNumber(result, 6) + " " + toName.split(" ")[0] + "</p>";
    core.showResult("result");
  });
})();
