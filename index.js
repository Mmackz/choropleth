// data files
const FILES = [
   "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json",
   "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json"
];

// setup chart
const height = 600;
const width = 960;
const chartContainer = d3.select(".chart");
const chart = chartContainer.append("svg").attr("height", height).attr("width", width);

// tooltip
const tip = d3
   .tip()
   .attr("class", "tooltip")
   .attr("id", "tooltip")
   .direction("n")
   .offset([16, 110])
   .html((d) => {
      d3.select("#tooltip").attr("data-education", d.percent);
      return `
         <p>${d.county}, ${d.state}: ${d.percent}%</p>
      `;
   });

// chart title and description
const titleContainer = d3
   .select(".chart-outer")
   .append("div")
   .attr("class", "title-container")
   .lower();
titleContainer
   .append("h1")
   .attr("id", "title")
   .attr("class", "title")
   .text("United States Educational Attainment");
titleContainer.append("p").attr("id", "description").text(`
   Percentage of adults age 25 and older with a bachelor's degree or higher (2010-2014)
`);

// required for converting topojson data to a svg path property
const path = d3.geoPath();

Promise.all([d3.json(FILES[0]), d3.json(FILES[1])]).then((data) => {
   const [education, map] = data;
   const [minData, maxData] = d3.extent(education, (d) => d.bachelorsOrHigher);

   // divide colorspace into 9 groups.
   const color = d3
      .scaleThreshold()
      .domain(d3.range(minData, maxData + 1, (maxData - minData) / 8))
      .range(d3.schemeBuGn[9]);

   // initialize tooltips
   chart.call(tip);

   // draw the map
   chart
      .append("g")
      .selectAll("path")
      .data(topojson.feature(map, map.objects.counties).features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", "county")
      .attr("data-fips", (d) => d.id)
      .attr(
         "data-education",
         (d) => education.find((item) => item.fips === d.id).bachelorsOrHigher
      )
      .attr("fill", (d) =>
         color(education.find((item) => item.fips === d.id).bachelorsOrHigher)
      )
      .on("mouseover", (event, data) => {
         const {
            area_name: county,
            state,
            bachelorsOrHigher: percent
         } = education.find((d) => d.fips === data.id);
         tip.show({ county, state, percent }, event.target);
      })
      .on("mouseout", tip.hide);

   // apply state borders
   chart
      .append("g")
      .lower()
      .selectAll("path")
      .data(topojson.feature(map, map.objects.states).features)
      .enter()
      .append("path")
      .attr("d", path)
      .style("fill", "transparent")
      .style("stroke", "black")
      .style("stroke-width", "1px");

   // draw the legend
   const legendScale = d3.scaleLinear().domain([minData, maxData]).range([550, 850]);
   const legendAxis = d3
      .axisBottom(legendScale)
      .tickValues(color.domain())
      .tickSize(15)
      .tickFormat((d) => `${Math.round(d)}%`);

   chart
      .append("rect")
      .attr("width", 340)
      .attr("height", 70)
      .attr("x", 530)
      .attr("y", -10)
      .style("fill", "#eee")
      .style("stroke", "black")
      .style("stroke-width", "1px");
   const legendContainer = chart.append("g").attr("transform", `translate(0, 20)`);
   const legend = legendContainer.append("g").attr("id", "legend");

   legendContainer
      .append("g")
      .append("text")
      .attr("x", 678)
      .attr("y", -8)
      .text("Legend")
      .style("text-decoration", "underline")
      .style("font-size", "0.85rem");

   legend
      .selectAll("rect")
      .data(
         color
            .range()
            .slice(1)
            .map((d) => {
               colorData = color.invertExtent(d);
               if (colorData[1] == undefined) {
                  colorData[1] = maxData;
               }
               return colorData;
            })
      )
      .enter()
      .append("rect")
      .attr("width", (d) => legendScale(d[1]) - legendScale(d[0]))
      .attr("height", 10)
      .attr("x", (d) => legendScale(d[0]))
      .attr("fill", (d) => color(d[0]))
      .style("stroke", "black")
      .style("stroke-width", 1);

   // apply axis labels last, otherwise will be overlapped
   legend.call(legendAxis);
});
