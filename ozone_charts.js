// Global Total Column Ozone — D3 bar chart
// NOTE: By default this tries to load GLOBAL yearly means from
//   data/ozone_yearly_means_global.csv
// Expected columns: Year, DU   (or)  Year, Mean_Ozone_DU   (or)  Year, v
// If the CSV cannot be loaded, it will FALL BACK to the hardcoded array.

let DATA = null; // will hold GLOBAL data once loaded

// Tooltip div
const tip = d3.select("body").append("div").attr("class","tooltip").style("opacity",0);

// Chart dims
const margin = {top:20,right:16,bottom:40,left:48};
const width = 820, height = 420;
const svg = d3.select("#chart").append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const x = d3.scaleBand().padding(0.15).range([0, innerW]);
const y = d3.scaleLinear().range([innerH, 0]);

const xAxisG = g.append("g").attr("transform", `translate(0,${innerH})`);
const yAxisG = g.append("g");

// Site palette
const montrealYear = 1987;           // Montreal Protocol signature year
const montrealColor = "#BF092F";   // highlight color for 1987
const fillColor = "#1565C0";       // base bar color
const hoverColor = "#043b83";      // hover bar color

function currentData(){
  return DATA;
}

function filterByRange(range){
  const arr = DATA || [];
  if (!arr.length) return [];

  const minYear = d3.min(arr, d => d.Year);
  const maxYear = d3.max(arr, d => d.Year);

  let a = minYear;
  let b = maxYear;

  switch (range) {
    case "pre-montreal":
      a = minYear;
      b = 1986;
      break;
    case "post-montreal":
      a = 1987;
      b = 1999;
      break;
    case "early-recovery":
      a = 2000;
      b = 2009;
      break;
    case "recent-recovery":
      a = 2010;
      b = maxYear;
      break;
    case "all":
    default:
      a = minYear;
      b = maxYear;
      break;
  }

  return arr.filter(d => d.Year >= a && d.Year <= b);
}

function update(range="all"){
  if (!DATA) return;
  const data = filterByRange(range).slice().sort((a,b)=>a.Year-b.Year);

  x.domain(data.map(d=>d.Year));
  const globalMaxV = d3.max(DATA, d => d.v);
  const globalMinV = d3.min(DATA, d => d.v);
  y.domain([ (globalMinV - 5), (globalMaxV + 5) ]);

  xAxisG.call(d3.axisBottom(x)
    .tickValues(x.domain().filter((_,i)=>!(i%2)))
    .tickFormat(d3.format("d"))
  );
  yAxisG.call(d3.axisLeft(y).ticks(6));

  // Vertical reference line for Montreal Protocol year (only in "all" view)
  let xPos = null;
  if (range === "all") {
    const hasMontreal = data.some(d => d.Year === montrealYear);
    if (hasMontreal && x.domain().includes(montrealYear)) {
      xPos = x(montrealYear) + x.bandwidth() / 2;
    }
  }

  const refLine = g.selectAll(".montreal-line")
    .data(xPos != null ? [1] : []);

  refLine.join(
    enter => enter.append("line")
      .attr("class", "montreal-line")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2 2")
      .attr("opacity", 0.6)
      .lower(),
    updateSel => updateSel
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", 0)
      .attr("y2", innerH),
    exit => exit.remove()
  );

  // Labels for pre/post Montreal Protocol (only when line exists, i.e., in "all" view)
  const labelData = xPos != null ? [1] : [];

  const leftLabel = g.selectAll(".montreal-label-left")
    .data(labelData);

  leftLabel.join(
    enter => enter.append("text")
      .attr("class", "montreal-label-left")
      .attr("text-anchor", "middle")
      .attr("x", xPos / 2)
      .attr("y", 14)
      .attr("fill", "#444")
      .attr("font-size", 11)
      .text("Pre Montreal Protocol"),
    updateSel => updateSel
      .attr("x", xPos / 2)
      .attr("y", 14),
    exit => exit.remove()
  );

  const rightLabel = g.selectAll(".montreal-label-right")
    .data(labelData);

  rightLabel.join(
    enter => enter.append("text")
      .attr("class", "montreal-label-right")
      .attr("text-anchor", "middle")
      .attr("x", (xPos + innerW) / 2)
      .attr("y", 14)
      .attr("fill", "#444")
      .attr("font-size", 11)
      .text("Post Montreal Protocol"),
    updateSel => updateSel
      .attr("x", (xPos + innerW) / 2)
      .attr("y", 14),
    exit => exit.remove()
  );

  const bars = g.selectAll("rect.bar").data(data, d=>d.Year);

  const barSel = bars.join(
    enter => enter.append("rect")
      .attr("class","bar")
      .attr("x", d=>x(d.Year))
      .attr("y", d=>y(d.v))
      .attr("width", x.bandwidth())
      .attr("height", d=>innerH - y(d.v))
      .attr("fill", d => d.Year === montrealYear ? montrealColor : fillColor),
    update => update
      .attr("x", d=>x(d.Year))
      .attr("y", d=>y(d.v))
      .attr("width", x.bandwidth())
      .attr("height", d=>innerH - y(d.v))
      .attr("fill", d => d.Year === montrealYear ? montrealColor : fillColor),
    exit => exit.remove()
  );

  // Native title tooltip (optional)
  barSel.selectAll("title").data(d=>[d]).join("title")
    .text(d => `${d.Year}: ${d.v} DU`);

  // Hover interactions
  barSel
    .style("cursor","pointer")
    .on("mouseover", function(event, d){
      d3.select(this).attr("fill", hoverColor);
      tip.style("opacity", 1).html(`${d.Year}: <b>${d.v} DU</b>`);
    })
    .on("mousemove", function(event){
      tip.style("left", (event.pageX) + "px")
         .style("top",  (event.pageY - 24) + "px");
    })
    .on("mouseout", function(event, d){
      d3.select(this).attr("fill", d.Year === montrealYear ? montrealColor : fillColor);
      tip.style("opacity", 0);
    });

  // Title update (GLOBAL)
  const globalMin = d3.min(DATA, d => d.Year);
  const globalMax = d3.max(DATA, d => d.Year);
  let label;
  switch (range) {
    case "pre-montreal":
      label = "Before Montreal Protocol (" + globalMin + "–1986)";
      break;
    case "post-montreal":
      label = "After Montreal — Peak Depletion (1987–1999)";
      break;
    case "early-recovery":
      label = "Early Recovery (2000–2009)";
      break;
    case "recent-recovery":
      label = "Recent Recovery (2010–" + globalMax + ")";
      break;
    case "all":
    default:
      label = globalMin + "–" + globalMax;
      break;
  }
  d3.select("#title").text(`Global Total Column Ozone — ${label}`);
}

function init(){
  // Bind selector
  const sel = document.getElementById("range");
  if (sel) sel.addEventListener("change", e => update(e.target.value));
  update("all");
}

// Try to load GLOBAL CSV; if it fails, use fallback
// Place your processed CSV at: data/ozone_yearly_means_global.csv
// Accepts columns: (Year, DU) or (Year, Mean_Ozone_DU) or (Year, v)

d3.csv("dataset/ozone_yearly_means_global.csv", d => {
  const du = (d.DU ?? d.Mean_Ozone_DU ?? d.v);
  return { Year: +d.Year, v: +du };
}).then(rows => {
  const cleaned = rows.filter(d => !isNaN(d.Year) && !isNaN(d.v));
  if (cleaned.length) {
    DATA = cleaned;
  }
  init();
}).catch(() => {
  // CSV failed to load, DATA remains null
  init();
});