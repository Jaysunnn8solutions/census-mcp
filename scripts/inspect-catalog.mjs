const res = await fetch("https://api.census.gov/data.json");
const catalog = await res.json();

const acs5 = catalog.dataset.filter(d =>
  Array.isArray(d.c_dataset) &&
  d.c_dataset[0] === "acs" &&
  d.c_dataset[1] === "acs5" &&
  d.c_dataset.length === 2
);

console.log("Count:", acs5.length);
console.log("Vintages:", acs5.map(d => d.c_vintage).sort());
console.log("\nOne full entry:\n", JSON.stringify(acs5[0], null, 2));
