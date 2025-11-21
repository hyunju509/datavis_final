
const file20 = "dataset/energy_nyc_20.csv";
const file21 = "dataset/energy_nyc_21.csv";
const file22 = "dataset/energy_nyc_22_23.csv";



// 2022–23 files already have "Calendar Year"
function parse22(d) {
    return {
        year: +d["Calendar Year"],
        energy: +d["Site Energy Use (kBtu)"],
        ghg: +d["Total (Location-Based) GHG Emissions (Metric Tons CO2e)"],
        dcFloorArea: d["Data Center - Gross Floor Area (ft²)"]
    };
}

// 2021 
function parse21(d) {
    return {
        year: 2021,
        energy: +d["Site Energy Use (kBtu)"],
        ghg: +d["Total GHG Emissions (Metric Tons CO2e)"],
        dcFloorArea: d["Data Center - Gross Floor Area (ft²)"]
    };
}

// 2020
function parse20(d) {
    return {
        year: 2020,
        energy: +d["Site Energy Use (kBtu)"],
        ghg: +d["Total GHG Emissions (Metric Tons CO2e)"],
        dcFloorArea: d["Data Center - Gross Floor Area (ft²)"]
    };
}

Promise.all([
    d3.csv(file20, parse20),
    d3.csv(file21, parse21),
    d3.csv(file22, parse22),
]).then(([d20, d21, d22]) => {

    const data = [...d20, ...d21, ...d22].sort((a, b) => a.year - b.year);

    function parseNumber(value) {
        if (!value || value.toLowerCase() === "not available") return 0;
        return +value;
    }

    function isDataCenter(d) {
        const floor = parseNumber(d.dcFloorArea);
        return floor > 0;
    }

    const dcOnly = data.filter(isDataCenter);

    function aggregateByYear(data) {
        const yearlyTotals = {};
        data.forEach(d => {
            const { year, energy, ghg } = d;
            if (year == null) return;
            if (!yearlyTotals[year]) yearlyTotals[year] = { energy: 0, ghg: 0, count: 0 };
            yearlyTotals[year].energy += isNaN(energy) ? 0 : energy;
            yearlyTotals[year].ghg += isNaN(ghg) ? 0 : ghg;
            yearlyTotals[year].count++;
        });
        return yearlyTotals;
    }

    const aggregated = aggregateByYear(dcOnly);

    console.log("=== AGGREGATED DATA CENTER YEARLY SUMMARY ===");
    console.log("Parsed data:", data.length);
    console.log("Filtered rows:", dcOnly.length);
    console.log("Aggregated by year:");
    Object.entries(aggregated).forEach(([year, vals]) => {
        console.log(year,
            "Energy:", vals.energy,
            "GHG:", vals.ghg,
            "Count:", vals.count);
    }
    );

    // now draw those line charts
    // Define the years
    const years = [2020, 2021, 2022, 2023];

    // Convert aggregated object to array with both metrics
    const aggregatedArray = years.map(y => {
        const vals = aggregated[y] || { energy: 0, ghg: 0, count: 0 };
        return {
            year: y,
            energy: vals.energy,
            ghg: vals.ghg,
            count: vals.count
        };
    });

    console.log("Combined Chart Data:", aggregatedArray);

    // Dimensions
    const margin = { top: 100, right: 80, bottom: 80, left: 100 };
   

    // SVG container
    const svg = d3.select("#energychart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale (years)
    const x = d3.scaleLinear()
        .domain([2019.5, 2023.5])
        .range([0, width]);

    // Y scales
    const yEnergy = d3.scaleLinear()
        .domain([0, d3.max(aggregatedArray, d => d.energy) * 1.1])
        .range([height, 0])
        .nice();

    const yGHG = d3.scaleLinear()
        .domain([0, d3.max(aggregatedArray, d => d.ghg) * 1.1])
        .range([height, 0])
        .nice();

    // Gridlines for Y (using left axis)
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(yEnergy)
            .tickSize(-width)
            .tickFormat("")
        );

    // X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickValues(years)
            .tickFormat(d3.format("d")))
        .selectAll("text")
        .style("font-size", "14px");

    // Left Y-axis (Energy)
    svg.append("g")
        .call(d3.axisLeft(yEnergy)
            .tickFormat(d => d3.format(".2s")(d)))
        .selectAll("text")
        .style("font-size", "12px");

    // Right Y-axis (GHG)
    svg.append("g")
        .attr("transform", `translate(${width},0)`)
        .call(d3.axisRight(yGHG)
            .tickFormat(d => d3.format(".2s")(d)))
        .selectAll("text")
        .style("font-size", "12px");

    // Line generators
    const lineEnergy = d3.line()
        .x(d => x(d.year))
        .y(d => yEnergy(d.energy))
        .curve(d3.curveMonotoneX);

    const lineGHG = d3.line()
        .x(d => x(d.year))
        .y(d => yGHG(d.ghg))
        .curve(d3.curveMonotoneX);

    // Draw Energy line
    svg.append("path")
        .datum(aggregatedArray)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 3)
        .attr("d", lineEnergy);

    // Draw GHG line
    svg.append("path")
        .datum(aggregatedArray)
        .attr("fill", "none")
        .attr("stroke", "#16a34a")
        .attr("stroke-width", 3)
        .attr("d", lineGHG);

    // Draw points for Energy
    svg.selectAll("circle.energy")
        .data(aggregatedArray)
        .enter()
        .append("circle")
        .attr("class", "energy")
        .attr("cx", d => x(d.year))
        .attr("cy", d => yEnergy(d.energy))
        .attr("r", 6)
        .attr("fill", "#2563eb")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    // Draw points for GHG
    svg.selectAll("circle.ghg")
        .data(aggregatedArray)
        .enter()
        .append("circle")
        .attr("class", "ghg")
        .attr("cx", d => x(d.year))
        .attr("cy", d => yGHG(d.ghg))
        .attr("r", 6)
        .attr("fill", "#16a34a")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    // Value labels for Energy
    svg.selectAll(".value-label-energy")
        .data(aggregatedArray)
        .enter()
        .append("text")
        .attr("class", "value-label-energy")
        .attr("x", d => x(d.year))
        .attr("y", d => yEnergy(d.energy) - 15)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#2563eb")
        .style("font-weight", "bold")
        .text(d => d3.format(".2s")(d.energy));

    // Value labels for GHG
    svg.selectAll(".value-label-ghg")
        .data(aggregatedArray)
        .enter()
        .append("text")
        .attr("class", "value-label-ghg")
        .attr("x", d => x(d.year))
        .attr("y", d => yGHG(d.ghg) - 15)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#16a34a")
        .style("font-weight", "bold")
        .text(d => d3.format(".2s")(d.ghg));

    // Count labels below points
    svg.selectAll(".count-label")
        .data(aggregatedArray)
        .enter()
        .append("text")
        .attr("class", "count-label")
        .attr("x", d => x(d.year))
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#666")
        .text(d => `(${d.count} facilities)`);

    // Chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .style("fill", "#1e293b")
        .text("NYC Data Center Energy & GHG Emissions (2020-2023)");

    // X axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#475569")
        .text("Year");

    // Left Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#2563eb")
        .text("Total Energy Use (kBtu)");

    // Right Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", width + 60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#16a34a")
        .text("Total GHG Emissions (Metric Tons CO₂e)");

    // Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 150}, -10)`);

    legend.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", "#2563eb");

    legend.append("text")
        .attr("x", 12)
        .attr("y", 4)
        .text("Energy (kBtu)")
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");

    legend.append("circle")
        .attr("cx", 0)
        .attr("cy", 20)
        .attr("r", 6)
        .attr("fill", "#16a34a");

    legend.append("text")
        .attr("x", 12)
        .attr("y", 24)
        .text("GHG (Metric Tons CO₂e)")
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");

    // First, hide all value labels by default
    svg.selectAll(".value-label-energy").style("opacity", 0);
    svg.selectAll(".value-label-ghg").style("opacity", 0);

    // Add interactivity to legend
    legend.selectAll("circle, text")
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            const labelType = d3.select(this).text().includes("Energy") ? "energy" : "ghg";

            // Show the appropriate value labels
            if (labelType === "energy") {
                svg.selectAll(".value-label-energy").transition().duration(200).style("opacity", 1);
                svg.selectAll(".value-label-ghg").transition().duration(200).style("opacity", 0);
            } else {
                svg.selectAll(".value-label-ghg").transition().duration(200).style("opacity", 1);
                svg.selectAll(".value-label-energy").transition().duration(200).style("opacity", 0);
            }
        })
        .on("mouseout", function (event, d) {
            // Hide both value labels when mouse leaves the legend
            svg.selectAll(".value-label-energy").transition().duration(200).style("opacity", 0);
            svg.selectAll(".value-label-ghg").transition().duration(200).style("opacity", 0);
        });
});

// NYC Data Center Energy & GHG Emissions Line Chart
// Uses *already-summarized* CSV: dataset/energy_clean_summary.csv
// Expected columns: year, energy_kbtu, ghg_tons, count

const summaryFile = "dataset/energy_clean_summary.csv";

// Load the small summary CSV and then draw the chart
// Each row: { year, energy_kbtu, ghg_tons, count }
d3.csv(summaryFile, d => ({
  year: +d.year,
  energy: +d.energy_kbtu,
  ghg: +d.ghg_tons,
  count: +d.count
}))
  .then(aggregatedArray => {
    console.log("Loaded summary data:", aggregatedArray);

    // ==== DIMENSIONS ====
    const margin = { top: 100, right: 80, bottom: 80, left: 100 };

    const container = document.getElementById("energychart");
    // Fallback if container width is not measurable
    const containerWidth = container ? container.clientWidth : 800;

    const width = Math.max(400, containerWidth - margin.left - margin.right);
    const height = 360;

    // SVG container
    const svg = d3
      .select("#energychart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ==== SCALES ====
    const years = aggregatedArray.map(d => d.year).sort((a, b) => a - b);

    const x = d3
      .scaleLinear()
      .domain([d3.min(years) - 0.5, d3.max(years) + 0.5])
      .range([0, width]);

    const yEnergy = d3
      .scaleLinear()
      .domain([0, d3.max(aggregatedArray, d => d.energy) * 1.1])
      .range([height, 0])
      .nice();

    const yGHG = d3
      .scaleLinear()
      .domain([0, d3.max(aggregatedArray, d => d.ghg) * 1.1])
      .range([height, 0])
      .nice();

    // ==== GRIDLINES (use energy axis) ====
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(yEnergy)
          .tickSize(-width)
          .tickFormat("")
      );

    // ==== AXES ====
    // X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(years)
          .tickFormat(d3.format("d"))
      )
      .selectAll("text")
      .style("font-size", "14px");

    // Left Y-axis (Energy)
    svg
      .append("g")
      .call(
        d3
          .axisLeft(yEnergy)
          .tickFormat(d => d3.format(".2s")(d))
      )
      .selectAll("text")
      .style("font-size", "12px");

    // Right Y-axis (GHG)
    svg
      .append("g")
      .attr("transform", `translate(${width},0)`)
      .call(
        d3
          .axisRight(yGHG)
          .tickFormat(d => d3.format(".2s")(d))
      )
      .selectAll("text")
      .style("font-size", "12px");

    // ==== LINES ====
    const lineEnergy = d3
      .line()
      .x(d => x(d.year))
      .y(d => yEnergy(d.energy))
      .curve(d3.curveMonotoneX);

    const lineGHG = d3
      .line()
      .x(d => x(d.year))
      .y(d => yGHG(d.ghg))
      .curve(d3.curveMonotoneX);

    // Energy line
    svg
      .append("path")
      .datum(aggregatedArray)
      .attr("fill", "none")
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 3)
      .attr("d", lineEnergy);

    // GHG line
    svg
      .append("path")
      .datum(aggregatedArray)
      .attr("fill", "none")
      .attr("stroke", "#16a34a")
      .attr("stroke-width", 3)
      .attr("d", lineGHG);

    // ==== POINTS ====
    svg
      .selectAll("circle.energy")
      .data(aggregatedArray)
      .enter()
      .append("circle")
      .attr("class", "energy")
      .attr("cx", d => x(d.year))
      .attr("cy", d => yEnergy(d.energy))
      .attr("r", 6)
      .attr("fill", "#2563eb")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    svg
      .selectAll("circle.ghg")
      .data(aggregatedArray)
      .enter()
      .append("circle")
      .attr("class", "ghg")
      .attr("cx", d => x(d.year))
      .attr("cy", d => yGHG(d.ghg))
      .attr("r", 6)
      .attr("fill", "#16a34a")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // ==== VALUE LABELS (hidden by default, toggled via legend) ====
    svg
      .selectAll(".value-label-energy")
      .data(aggregatedArray)
      .enter()
      .append("text")
      .attr("class", "value-label-energy")
      .attr("x", d => x(d.year))
      .attr("y", d => yEnergy(d.energy) - 15)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#2563eb")
      .style("font-weight", "bold")
      .style("opacity", 0)
      .text(d => d3.format(".2s")(d.energy));

    svg
      .selectAll(".value-label-ghg")
      .data(aggregatedArray)
      .enter()
      .append("text")
      .attr("class", "value-label-ghg")
      .attr("x", d => x(d.year))
      .attr("y", d => yGHG(d.ghg) - 15)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#16a34a")
      .style("font-weight", "bold")
      .style("opacity", 0)
      .text(d => d3.format(".2s")(d.ghg));

    // Count labels under x-axis ticks
    svg
      .selectAll(".count-label")
      .data(aggregatedArray)
      .enter()
      .append("text")
      .attr("class", "count-label")
      .attr("x", d => x(d.year))
      .attr("y", height + 35)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text(d => `(${d.count} facilities)`);

    // ==== TITLES & AXIS LABELS ====
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .style("fill", "#1e293b")
      .text("NYC Data Center Energy & GHG Emissions (2020–2023)");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 60)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#475569")
      .text("Year");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -70)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#2563eb")
      .text("Total Energy Use (kBtu)");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", width + 60)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#16a34a")
      .text("Total GHG Emissions (Metric Tons CO₂e)");

    // ==== LEGEND with hover to reveal labels ====
    const legend = svg.append("g").attr("transform", `translate(${width - 150}, -10)`);

    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 6)
      .attr("fill", "#2563eb");

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 4)
      .text("Energy (kBtu)")
      .style("font-size", "12px")
      .attr("alignment-baseline", "middle");

    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 20)
      .attr("r", 6)
      .attr("fill", "#16a34a");

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 24)
      .text("GHG (Metric Tons CO₂e)")
      .style("font-size", "12px")
      .attr("alignment-baseline", "middle");

    // Hover behavior on legend
    legend
      .selectAll("circle, text")
      .style("cursor", "pointer")
      .on("mouseover", function () {
        const txt = d3.select(this).text();
        const showEnergy = txt.includes("Energy");

        svg
          .selectAll(".value-label-energy")
          .transition()
          .duration(200)
          .style("opacity", showEnergy ? 1 : 0);

        svg
          .selectAll(".value-label-ghg")
          .transition()
          .duration(200)
          .style("opacity", showEnergy ? 0 : 1);
      })
      .on("mouseout", function () {
        svg
          .selectAll(".value-label-energy, .value-label-ghg")
          .transition()
          .duration(200)
          .style("opacity", 0);
      });
  })
  .catch(err => {
    console.error("Error loading summary CSV", err);
  });