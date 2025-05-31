d3.dsv(";", "car_prices_clean.csv", d3.autoType)
  .then(data => {
    const scroller = scrollama();

    const svg1 = d3.select(`#viz1`);
    const svg7 = d3.select("#viz7");

    const texts1 = {
      sellingprice: {
        main: "¿Cuál es el precio de venta más común en vehículos usados?",
        sub: "Como podemos observar el precio normalmente no supera los 20000$. Ahora comprobaremos cómo pueden afectar otros factores a su precio."
      },
      odometer: {
        main: "¿Y el kilometraje habitual de los coches vendidos?",
        sub: "Existe una tendencia a que las ventas se reduzcan conforme los vehículos tienen más kilometros. Esto puede deberse a que haya menos vehículos con más kilometros o que la gente no tienda a comprarlos."
      }
    };

    const texts7 = {
      transmission: {
        main: "¿Afecta el tipo de transmisión?",
        sub: "Como podemos observar, los vehículos cuyo kilometraje es más alto tienden a tener un precio más bajo. Además, como es de esperar en Estados Unidos, la mayoría de vehículos son automáticos."
      },
      condition_factor: {
        main: "¿Y cómo afecta la condición del coche?",
        sub: "Como vemos, no existe una tendencia clara respecto a la condición ya que algunos de los valores más altos están dentro del valor de peor condición posible."
      }
    };

    const uniqueYears = [...new Set(data.map(d => d.sale_year))].sort();
    const initialYear = uniqueYears[0];

    function updateTextAndViz1(value) {
      document.getElementById("mainText").textContent = texts1[value].main;
      document.getElementById("subText").textContent = texts1[value].sub;
      renderHistogram(data, value, svg1);
    }

    function updateTextAndViz7(value) {
      document.getElementById("mainText7").textContent = texts7[value].main;
      document.getElementById("subText7").textContent = texts7[value].sub;
      renderScatter(data, value, svg7);
    }

    // Escuchamos cambios en el selector del 1
    document.getElementById("dataSelector").addEventListener("change", e => {
      updateTextAndViz1(e.target.value);
    });

    // Escuchar cambio del selector del 7
    document.getElementById("dataSelector7").addEventListener("change", e => {
      updateTextAndViz7(e.target.value);
    });

    scroller
      .setup({
        step: ".step",
        offset: 0.5,
        debug: false
      })
      .onStepEnter(response => {
        const step = +response.element.dataset.step;
        d3.selectAll(".step").classed("active", false);
        d3.select(response.element).classed("active", true);

        const stepNumber = +response.element.dataset.step;
        const svg = d3.select(`#viz${stepNumber}`);

        if (step === 1) {
          const selected = document.getElementById("dataSelector").value;
          updateTextAndViz1(selected);
        } else if (step === 2) {
          renderTopBrands(data, svg);
        } else if (step === 3) {
          renderBoxplotByBrand(data, svg);
        } else if (step == 4) {
          renderMonthlySalesHistogram(data, svg, initialYear);

          const yearSelector = document.getElementById("yearSelector");
          if (yearSelector.children.length === 0) {
            uniqueYears.forEach(year => {
              const option = document.createElement("option");
              option.value = year;
              option.textContent = year;
              yearSelector.appendChild(option);
            });

            yearSelector.value = initialYear;

            yearSelector.addEventListener("change", () => {
              const selectedYear = +yearSelector.value;
              renderMonthlySalesHistogram(data, svg, selectedYear);
            });
          }
        } else if (step === 5) {
          renderPriceDiffMap(data, svg);
        } else if (step === 6) {
          renderDepreciationCurve(data, svg);
        } else if (step === 7) {
          const selected = document.getElementById("dataSelector7").value;
          updateTextAndViz7(selected);
        } else if (step === 8) {
          renderBoxplotByCondition(data, svg);
        }
      });
  });

function renderHistogram(data, variable, svg) {
  svg.selectAll("*").remove();

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 30, right: 20, bottom: 40, left: 60 };

  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const values = data.map(d => d[variable]);

  const x = d3.scaleLinear()
    .domain(d3.extent(values))
    .nice()
    .range([0, contentWidth]);

  const bins = d3.bin().domain(x.domain()).thresholds(30)(values);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .nice()
    .range([contentHeight, 0]);

  g.append("g")
    .selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("x", d => x(d.x0) + 1)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", d => contentHeight - y(d.length))
    .attr("fill", "#3A86FF");

  g.append("g")
    .attr("transform", `translate(0,${contentHeight})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("x", contentWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .text(variable === "sellingprice" ? "Distribución del Precio de Venta" : "Distribución del Kilometraje");
}

function renderTopBrands(data, svg) {
  svg.selectAll("*").remove();

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 40, right: 20, bottom: 60, left: 100 };
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  const counts = d3.rollup(data, v => v.length, d => d.make);
  const topBrands = Array.from(counts, ([make, count]) => ({ make, count }))
    .sort((a, b) => d3.descending(a.count, b.count))
    .slice(0, 10);

  const y = d3.scaleBand()
    .domain(topBrands.map(d => d.make))
    .range([0, contentHeight])
    .padding(0.1);

  const x = d3.scaleLinear()
    .domain([0, d3.max(topBrands, d => d.count)])
    .range([0, contentWidth]);

  g.append("g").call(d3.axisLeft(y));
  g.append("g")
    .attr("transform", `translate(0,${contentHeight})`)
    .call(d3.axisBottom(x));

  g.selectAll("rect")
    .data(topBrands)
    .join("rect")
    .attr("y", d => y(d.make))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", d => x(d.count))
    .attr("fill", "#3A86FF");

  g.append("text")
    .attr("x", contentWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .text("Top 10 Marcas Más Vendidas");
}

function renderBoxplotByBrand(data, svg) {
  svg.selectAll("*").remove();

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 40, right: 20, bottom: 60, left: 60 };
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  const counts = d3.rollup(data, v => v.length, d => d.make);
  const topBrands = new Set(
    Array.from(counts, ([make, count]) => ({ make, count }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 10)
      .map(d => d.make)
  );

  const filtered = data.filter(d => topBrands.has(d.make));

  const nested = d3.groups(filtered, d => d.make).map(([make, values]) => {
    const prices = values.map(d => d.sellingprice).sort(d3.ascending);
    return {
      make,
      q1: d3.quantile(prices, 0.25),
      median: d3.quantile(prices, 0.5),
      q3: d3.quantile(prices, 0.75),
      min: d3.min(prices),
      max: d3.max(prices)
    };
  });

  const x = d3.scaleBand()
    .domain(nested.map(d => d.make))
    .range([0, contentWidth])
    .padding(0.4);

  const maxPrice = d3.max(nested, d => d.max);
  const maxY = Math.min(40000, maxPrice);  // límite a 40,000 o el valor que prefieras

  const y = d3.scaleLinear()
    .domain([0, maxY])
    .nice()
    .range([contentHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${contentHeight})`)
    .call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  g.selectAll(".box")
    .data(nested)
    .join("rect")
    .attr("x", d => x(d.make))
    .attr("y", d => y(d.q3))
    .attr("height", d => y(d.q1) - y(d.q3))
    .attr("width", x.bandwidth())
    .attr("fill", "#A8DADC")
    .attr("opacity", 0.6);

  g.selectAll(".median")
    .data(nested)
    .join("line")
    .attr("x1", d => x(d.make))
    .attr("x2", d => x(d.make) + x.bandwidth())
    .attr("y1", d => y(d.median))
    .attr("y2", d => y(d.median))
    .attr("stroke", "#1D3557");

  g.append("text")
    .attr("x", contentWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .text("Distribución de Precios por Marca");
}

function renderDepreciationCurve(data, svg, binSize = 10000) {
  svg.selectAll("*").remove();

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 40, right: 20, bottom: 50, left: 70 };
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const bins = new Map();

  data.forEach(d => {
    if (d.odometer != null && d.sellingprice != null) {
      const binStart = Math.floor(d.odometer / binSize) * binSize;
      if (!bins.has(binStart)) bins.set(binStart, []);
      bins.get(binStart).push(d.sellingprice);
    }
  });

  const depreciationData = Array.from(bins.entries())
    .map(([binStart, prices]) => ({
      odometerStart: binStart,
      odometerEnd: binStart + binSize,
      medianPrice: d3.median(prices)
    }))
    .sort((a, b) => a.odometerStart - b.odometerStart);

  const x = d3.scaleLinear()
    .domain([0, d3.max(depreciationData, d => d.odometerEnd)])
    .range([0, contentWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(depreciationData, d => d.medianPrice)])
    .nice()
    .range([contentHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${contentHeight})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(",d")))
    .append("text")
    .attr("x", contentWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Kilometraje");

  g.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -contentHeight / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Precio mediano");

  const line = d3.line()
    .x(d => x((d.odometerStart + d.odometerEnd) / 2))
    .y(d => y(d.medianPrice))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(depreciationData)
    .attr("fill", "none")
    .attr("stroke", "#06D6A0")
    .attr("stroke-width", 2)
    .attr("d", line);

  g.selectAll(".dot")
    .data(depreciationData)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", d => x((d.odometerStart + d.odometerEnd) / 2))
    .attr("cy", d => y(d.medianPrice))
    .attr("r", 4)
    .attr("fill", "#FB5607");

  // 7. Título
  g.append("text")
    .attr("x", contentWidth / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .text("Curva de Depreciación: Precio vs Kilometraje");
}

function renderScatter(data, colorVariable, svg) {
  svg.selectAll("*").remove();

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 40, right: 120, bottom: 60, left: 70 };
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.odometer))
    .nice()
    .range([0, contentWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.sellingprice))
    .nice()
    .range([contentHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${contentHeight})`)
    .call(d3.axisBottom(x).ticks(10));
  
  g.append("g").call(d3.axisLeft(y).ticks(10));

  let color = d3.scaleOrdinal(d3.schemeCategory10);
  let categories = [];
  let customColors = {
    "Alta": "#FF006E",
    "Excelente": "#8338EC",
    "Media": "#FB5607",
    "Baja": "#FFBE0B",
    "Muy baja": "#06D6A0",
    "Automatic": "#FF006E",
    "Manual": "#06D6A0"
  };

  if (colorVariable) {
    categories = Array.from(new Set(data.map(d => d[colorVariable])));
    color.domain(categories)
        .range(categories.map(cat => customColors[cat] || "#CCCCCC"));
  }

  g.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.odometer))
    .attr("cy", d => y(d.sellingprice))
    .attr("r", 3)
    .attr("fill", d => colorVariable ? color(d[colorVariable]) : "#1f77b4")
    .attr("opacity", 0.6);

  let title = "Relación entre Kilometraje y Precio";
  if (colorVariable === "transmission") title += " (color por transmisión)";
  if (colorVariable === "condition_factor") title += " (color por condición)";

  g.append("text")
    .attr("x", contentWidth / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .text(title);

  if (colorVariable) {
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right + 20},${margin.top})`);

    const legendItemHeight = 20;
    
    legend.selectAll("rect")
      .data(categories)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * legendItemHeight)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", d => color(d));

    legend.selectAll("text")
      .data(categories)
      .join("text")
      .attr("x", 20)
      .attr("y", (d, i) => i * legendItemHeight + 12)
      .text(d => d)
      .style("font-size", "12px");
  }
}

function renderPriceDiffMap(data, svg) {
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 800;
  const height = +svg.attr("height") || 500;

  const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1000);

  const path = d3.geoPath().projection(projection);

  // Mapeo de FIPS a abreviaturas
  const fipsToAbbr = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
    "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
    "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
    "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
    "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
    "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
    "54": "WV", "55": "WI", "56": "WY"
  };

  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
    const statesGeo = topojson.feature(us, us.objects.states).features;

    const statePriceDiff = d3.rollup(data, v => d3.mean(v, d => d.price_diff), d => d.state);
    const priceDiffExtent = d3.extent(Array.from(statePriceDiff.values()));

    const color = d3.scaleSequential()
      .domain(priceDiffExtent)
      .interpolator(d3.interpolateRdYlGn);

    svg.selectAll("path")
      .data(statesGeo)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const fipsCode = d.id.toString().padStart(2, "0");
        const abbr = fipsToAbbr[fipsCode];
        const value = statePriceDiff.get(abbr);

        return value !== undefined ? color(value) : "#ccc";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .text("Diferencia media entre precio de mercado y precio de venta (por estado)");

    // Leyenda
    const legendWidth = 300;
    const legendHeight = 10;
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient").attr("id", "legend-gradient");

    linearGradient.selectAll("stop")
      .data(d3.ticks(0, 1, 10))
      .join("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", d => color(priceDiffExtent[0] + d * (priceDiffExtent[1] - priceDiffExtent[0])));

    svg.append("rect")
      .attr("x", width / 2 - legendWidth / 2)
      .attr("y", height - 40)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    const legendScale = d3.scaleLinear()
      .domain(priceDiffExtent)
      .range([width / 2 - legendWidth / 2, width / 2 + legendWidth / 2]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format(".2s"));

    svg.append("g")
      .attr("transform", `translate(0, ${height - 30})`)
      .call(legendAxis);
  });
}

function renderBoxplotByCondition(data, svg) {
  try
  {
    svg.selectAll("*").remove();

    console.log("Data sample:", data.slice(0, 5));

    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const margin = { top: 40, right: 20, bottom: 60, left: 60 };
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    const conditionExists = data.some(d => d.condition_factor !== undefined);
    console.log("Existe condition_factor en datos?", conditionExists);

    const counts = d3.rollup(data, v => v.length, d => d.condition_factor);

    const topConditions = new Set(
      Array.from(counts, ([condition, count]) => ({ condition, count }))
        .sort((a, b) => d3.descending(a.count, b.count))
        .map(d => d.condition)
    );

    const filtered = data.filter(d => topConditions.has(d.condition_factor) && !isNaN(d.sellingprice));
    console.log("Datos filtrados:", filtered.length);

    const nested = d3.groups(filtered, d => d.condition_factor).map(([condition, values]) => {
      const prices = values.map(d => +d.sellingprice).sort(d3.ascending);
      return {
        condition,
        q1: d3.quantile(prices, 0.25),
        median: d3.quantile(prices, 0.5),
        q3: d3.quantile(prices, 0.75),
        min: d3.min(prices),
        max: d3.max(prices)
      };
    });

    const x = d3.scaleBand()
      .domain(nested.map(d => d.condition))
      .range([0, contentWidth])
      .padding(0.4);

    const maxPrice = d3.max(nested, d => d.max);
    const maxY = Math.min(40000, maxPrice);

    const y = d3.scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([contentHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${contentHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end");

    g.append("g").call(d3.axisLeft(y));

    g.selectAll(".box")
      .data(nested)
      .join("rect")
      .attr("x", d => x(d.condition))
      .attr("y", d => y(d.q3))
      .attr("height", d => y(d.q1) - y(d.q3))
      .attr("width", x.bandwidth())
      .attr("fill", "#A8DADC")
      .attr("opacity", 0.6);

    g.selectAll(".median")
      .data(nested)
      .join("line")
      .attr("x1", d => x(d.condition))
      .attr("x2", d => x(d.condition) + x.bandwidth())
      .attr("y1", d => y(d.median))
      .attr("y2", d => y(d.median))
      .attr("stroke", "#1D3557");

    g.append("text")
      .attr("x", contentWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .text("Distribución de Precios por Condición");
  }
  catch (err) {
    console.error("Error en renderBoxplotByCondition:", err);
  }
}

function renderMonthlySalesHistogram(data, svg, selectedYear) {
  const filtered = data.filter(d => d.sale_year === selectedYear);

  const monthCounts = d3.rollups(
    filtered,
    v => v.length,
    d => d.sale_month
  ).sort((a, b) => a[0] - b[0]);

  const margin = { top: 40, right: 30, bottom: 40, left: 50 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;

  svg.selectAll("*").remove(); // Limpiar el SVG

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(d3.range(1, 13))
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(monthCounts, d => d[1])])
    .nice()
    .range([height, 0]);

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => d3.timeFormat("%B")(new Date(2000, d - 1, 1))))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  g.selectAll("rect")
    .data(monthCounts)
    .enter()
    .append("rect")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d[1]))
    .attr("fill", "#3A86FF");
}