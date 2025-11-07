// Global Total Column Ozone — D3 bar chart
// NOTE: By default this tries to load GLOBAL yearly means from
//   data/ozone_yearly_means_global.csv
// Expected columns: Year, DU   (or)  Year, Mean_Ozone_DU   (or)  Year, v
// If the CSV cannot be loaded, it will FALL BACK to the hardcoded array.

// ---- Fallback (previous Arctic values) — replace once global CSV is ready ----
const fallbackData = [
  {Year:1979, v:366.69},{Year:1980, v:370.22},{Year:1981, v:359.72},{Year:1982, v:367.66},
  {Year:1983, v:352.42},{Year:1984, v:361.58},{Year:1985, v:361.24},{Year:1986, v:352.53},
  {Year:1987, v:366.37},{Year:1988, v:358.22},{Year:1989, v:358.42},
  {Year:1990, v:343.01},{Year:1991, v:357.82},{Year:1992, v:342.44},{Year:1993, v:330.44},
  {Year:1997, v:329.87},{Year:1998, v:361.95},{Year:1999, v:355.42},
  {Year:2000, v:337.89},{Year:2001, v:358.63},{Year:2002, v:349.25},{Year:2003, v:350.82},
  {Year:2004, v:348.76},{Year:2005, v:342.00},{Year:2006, v:353.45},{Year:2007, v:345.02},
  {Year:2008, v:343.31},{Year:2009, v:351.29},
  {Year:2010, v:361.24},{Year:2011, v:331.61},{Year:2012, v:348.75},{Year:2013, v:358.87},
  {Year:2014, v:351.70},{Year:2015, v:360.58},{Year:2016, v:347.91},{Year:2017, v:348.06},
  {Year:2018, v:357.91},{Year:2019, v:357.62},
  {Year:2020, v:326.52},{Year:2021, v:347.87},{Year:2022, v:348.62},{Year:2023, v:351.00},
  {Year:2024, v:377.15}
];

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
const fillColor = "#1565C0";       // base bar
const hoverColor = "#043b83";      // hover bar

function currentData(){
  return (DATA && DATA.length) ? DATA : fallbackData;
}

function filterByRange(range){
  const arr = currentData();
  if (range === "all") return arr;
  const [a,b] = range.split("-").map(Number);
  return arr.filter(d => d.Year >= a && d.Year <= b);
}

function update(range="all"){
  const data = filterByRange(range).slice().sort((a,b)=>a.Year-b.Year);

  x.domain(data.map(d=>d.Year));
  const maxV = d3.max(data, d=>d.v);
  const minV = d3.min(data, d=>d.v);
  y.domain([ (minV-5), (maxV+5) ]);

  xAxisG.call(d3.axisBottom(x)
    .tickValues(x.domain().filter((_,i)=>!(i%2)))
    .tickFormat(d3.format("d"))
  );
  yAxisG.call(d3.axisLeft(y).ticks(6));

  const bars = g.selectAll("rect.bar").data(data, d=>d.Year);

  const barSel = bars.join(
    enter => enter.append("rect")
      .attr("class","bar")
      .attr("x", d=>x(d.Year))
      .attr("y", d=>y(d.v))
      .attr("width", x.bandwidth())
      .attr("height", d=>innerH - y(d.v))
      .attr("fill", fillColor),
    update => update
      .attr("x", d=>x(d.Year))
      .attr("y", d=>y(d.v))
      .attr("width", x.bandwidth())
      .attr("height", d=>innerH - y(d.v)),
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
    .on("mouseout", function(){
      d3.select(this).attr("fill", fillColor);
      tip.style("opacity", 0);
    });

  // Title update (GLOBAL)
  const label = (range==="all") ? "1979–2024" : range.replace("-", "–");
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

d3.csv("data/ozone_yearly_means_global.csv", d => {
  const du = (d.DU ?? d.Mean_Ozone_DU ?? d.v);
  return { Year: +d.Year, v: +du };
}).then(rows => {
  const cleaned = rows.filter(d => !isNaN(d.Year) && !isNaN(d.v));
  if (cleaned.length) {
    DATA = cleaned;
  }
  init();
}).catch(() => {
  // fallback to existing array
  init();
});