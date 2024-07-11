// Copyright 2022 Takanori Fujiwara.
// Released under the BSD 3-Clause 'New' or 'Revised' License

// import {
//   zoomableSunburst
// } from './chart.js';

let data = await d3.json('./data/flare-2.json');

let larghezza
function updateSize() {
  larghezza = window.innerHeight;
  console.log("resize")
  console.log(larghezza)
}

updateSize()
window.addEventListener("resize", updateSize);

function createSunburstChart() {
  // Specify the chart’s dimensions.
  let width = larghezza;
  let height = width;
  let radius = width / 6;

  // Create the color scale.
  let color = d3.scaleOrdinal(d3.quantize(d3.interpolateHcl("#e52a1c", "#bcb4da"), 2));

  // Compute the layout.
  let hierarchy = d3
    .hierarchy(data)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);

  let root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(
    hierarchy
  );
  root.each((d) => (d.current = d));

  // Create the arc generator.
  let arc = d3
    .arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 3)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 2));

  // Create the SVG container.
  let svg = d3
    .create('svg')
    .attr('viewBox', [-width / 2, -height / 2, width, width])
    //.style('font', '12.5px Arial');

  // Append the arcs.
  let path = svg
    .append('g')
    .selectAll('path')
    .data(root.descendants().slice(1))
    .join('path')
    .attr('fill', (d) => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.name);
    })
    .attr('fill-opacity', (d) =>
      arcVisible(d.current) ? (d.children ? 0.9 : 0.7) : 0
    )
    .attr('pointer-events', (d) => (arcVisible(d.current) ? 'auto' : 'none'))

    .attr('d', (d) => arc(d.current));

  // Make them clickable if they have children.
  path
    .filter((d) => d.children)
    .style('cursor', 'pointer')
    .on('click', clicked);

  let format = d3.format(',d');
  // Tooltip (box if you hover over a chart)
  path.append('title').text(
    (d) =>
      `${d
        .ancestors()
        .map((d) => d.data.name)
        .reverse()
        .join('/')}\n${format(d.value)}`
  );

  let label_1 = svg
    .append('g')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .style('user-select', 'none')
    .selectAll('text')
    .data(root.descendants().slice(1))
    .join('text')
    .style("font-size", "18px")
    .style("font-family", "Arial")
    .attr('alignment-baseline', 'after-edge')
    .style("font-weight", "Bold")
    .style('fill', 'rgb(255,255,255)')
    .attr('dy', '0.35em')
    .attr('fill-opacity', (d) => +labelVisible(d.current))
    .attr('transform', (d) => labelTransform_1(d.current))
    .text(d => `${format(d.value)}`);
  
  let label_2 = svg
    .append('g')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .style('user-select', 'none')
    .selectAll('text')
    .data(root.descendants().slice(1))
    .join('text')
    .style("font-size", "10px")
    .style("font-family", "Arial")
    .style("font-weight", "Bold")
    .style('fill', 'rgb(255,255,255)')
    .attr('dy', '0.35em')
    .attr('fill-opacity', (d) => +labelVisible(d.current))
    .attr('transform', (d) => labelTransform_2(d.current))
    .text((d) => d.data.name);

  let parent = svg
    .append('g')
    .datum({})
    .attr('pointer-events', 'all')
    .on('click', clicked);

  let backIconSVGString = `<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512"><path opacity="1" fill="#1E3050" d="M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 246.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160zm352-160l-160 160c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L301.3 256 438.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0z"/></svg>`;

  let backIconWidth = 16;
  let backIconHeight = 16;

  let backIcon = parent
    .append('image')
    .attr(
      'xlink:href',
      'data:image/svg+xml,' + encodeURIComponent(backIconSVGString)
    )
    .attr('width', backIconWidth)
    .attr('height', backIconHeight)
    .attr('x', -backIconWidth / 2)
    .attr('y', -backIconHeight / 2)
    .style('cursor', 'pointer');

  let backText = parent
    .append('text')
    .text('Back')
    .attr('text-anchor', 'middle')
    .attr('dy', backIconHeight / 2 + 10);

  hideBack();
  parent.on('click', null);

  // Handle zoom on click.
  function clicked(event, p) {
    parent.datum(p.parent || root);

    root.each(d => {
        d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth),
        };
    });

    const t = svg.transition().duration(750);

    path.transition(t)
        .tween('data', d => {
            const i = d3.interpolate(d.current, d.target);
            return t => d.current = i(t);
        })
        .filter(function(d) {
            return +this.getAttribute('fill-opacity') || arcVisible(d.target);
        })
        .attr('fill-opacity', d => arcVisible(d.target) ? (d.children ? 0.9 : 0.7) : 0)
        .attr('pointer-events', d => arcVisible(d.target) ? 'auto' : 'none')
        .attrTween('d', d => () => arc(d.current));

    label_1.transition(t)
        .attr('fill-opacity', d => +labelVisible(d.target))
        .attrTween('transform', d => () => labelTransform_1(d.current));

    label_2.transition(t)
        .attr('fill-opacity', d => +labelVisible(d.target))
        .attrTween('transform', d => () => labelTransform_2(d.current));

    if (p === root) {
        hideBack();
    } else {
        showBack();
    }
}

  function hideBack() {
    parent
      .select('image')
      .attr(
        'xlink:href',
        root.parent === null
          ? ''
          : 'data:image/svg+xml,' + encodeURIComponent(backIconSVGString)
      );
    parent.select('text').text(root.parent === null ? '' : 'Back');

    parent.select('image').style('cursor', 'default');
    parent.select('text').style('cursor', 'default');
    parent.on('click', null);
  }

  function showBack() {
    // parent
    //   .select('image')
    //   .attr(
    //     'xlink:href',
    //     root.parent !== null
    //       ? ''
    //       : 'data:image/svg+xml,' + encodeURIComponent(backIconSVGString)
    //   );
    parent.select('text').text(root.parent !== null ? '' : 'back');

    parent.select('image').style('cursor', 'pointer');
    parent.select('text').style('cursor', 'pointer');
    parent.select('text')
    .style("font-size", "10px")
    .style("font-family", "Arial")
    .style("fill", "black")
    .style("transform", "translate(0px, -15px)")
    .style("font-weight", "bold");
    parent.on('click', clicked);
  }

  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform_1(d) {
    let x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    let y = ((d.y0 + d.y1) / 2) * radius;
    if (d.depth > 1) { // Applicare una rotazione diversa per gli spicchi esterni
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    } else { // Rotazione standard per gli spicchi interni
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
  }

  function labelTransform_2(d) {
    let x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    let y = ((d.y0 + d.y1) / 2) * radius;
    if (d.depth > 1) { // Applicare una rotazione diversa per gli spicchi esterni
      return `rotate(${x < 180 ? x - 88 : x - 92}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    } else { // Rotazione standard per gli spicchi interni
      return `rotate(${x < 180 ? x - 87 : x - 93}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
  }

  return svg.node();
}

let chart = createSunburstChart();
document.body.appendChild(chart);