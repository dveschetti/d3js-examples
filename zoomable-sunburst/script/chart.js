/// Modified source copyright
// Copyright 2022 Takanori Fujiwara.
// Released under the BSD 3-Clause 'New' or 'Revised' License
let larghezza

/// Original source copyright
// Copyright 2018 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/zoomable-sunburst

function updateSize() {
  larghezza = window.innerHeight;
  console.log("resize")
  console.log(larghezza)
}

updateSize()
window.addEventListener("resize", updateSize);
export let zoomableSunburst = (data, {
  svgId = 'zoomable-sunburst',
  width = window.innerHeight-20,
  radius = width / 6,
  color =  d3.scaleOrdinal(d3.quantize(d3.interpolateHcl("#e52b20", "#bcb4da"), 2)),
  format = d3.format(',d')
} = {}) => {
  let partition = data => {
    let root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
    return d3.partition()
      .size([2 * Math.PI, root.height + 1])
      (root);
  }

  let root = partition(data);
  root.each(d => d.current = d);

  let svg = d3.create('svg')
    .attr('id', svgId)
    .attr('width', width)
    .attr('height', width)
    .attr('viewBox', [0, 0, width, width])
    //.style('font', '10px sans-serif');


  let g = svg.append('g')
    .attr('transform', `translate(${width / 2},${width / 2})`);

  let arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 3)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 2));

  let arcVisible = d => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  let labelVisible = d => d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  let labelTransform_1 = d => {
    let x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    let y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }
  let labelTransform_2 = d => {
    let x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    let y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x < 180 ? x -88 : x -92}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  let clicked = (event, p) => {
    parent.datum(p.parent || root);

    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });

    let t = g.transition().duration(750);

    // Transition the data on all arcs, even the ones that aren’t visible,
    // so that if this transition is interrupted, entering arcs will start
    // the next transition from the desired position.
    path.transition(t)
      .tween('data', d => {
        let i = d3.interpolate(d.current, d.target);
        return t => d.current = i(t);
      })
      .filter(
        function(d) {
          return +this.getAttribute('fill-opacity') || arcVisible(d.target);
        })
      .attr('fill-opacity', d => arcVisible(d.target) ? (d.children ? 1 : 0.7) : 0)
      .attr('pointer-events', d => arcVisible(d.target) ? 'auto' : 'none')

      .attrTween('d', d => () => arc(d.current));

    label_1.filter(
        function(d) {
          return +this.getAttribute('fill-opacity') || labelVisible(d.target);
        }).transition(t)
      .attr('fill-opacity', d => +labelVisible(d.target))
      .attrTween('transform', d => () => labelTransform_1(d.current));

      label_2.filter(
        function(d) {
          return +this.getAttribute('fill-opacity') || labelVisible(d.target);
        }).transition(t)
      .attr('fill-opacity', d => +labelVisible(d.target))
      .attrTween('transform', d => () => labelTransform_2(d.current));
  }

  let path = g.append('g')
    .selectAll('path')
    .data(root.descendants().slice(1))
    .join('path')
    .attr('fill', d => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.name);
    })
    .attr('fill-opacity', d => arcVisible(d.current) ? (d.children ? 1 : 0.7) : 0)
    .attr('pointer-events', d => arcVisible(d.current) ? 'auto' : 'none')
    .attr('d', d => arc(d.current));

  path.filter(d => d.children)
    .style('cursor', 'pointer')
    .on('click', clicked);

  path.append('title')
    .text(d => `${d.ancestors().map(d => d.data.name).reverse().join('/')}\n${format(d.value)}`);

  let label_1 = g.append('g')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .style('user-select', 'none')
    .selectAll('text')
    .data(root.descendants().slice(1))
    .join('text')
    .style("font-size", "20px")
    .style("font-family", "Arial")
    .attr('alignment-baseline', 'after-edge')
    .style("font-weight", "Bold")
    .style('fill', 'rgb(255,255,255)')
    .attr('dy', '0.35em')
    .attr('fill-opacity', d => +labelVisible(d.current))
    .attr('transform', d => labelTransform_1(d.current))
    .text(d => `${format(d.value)}`);


  let label_2 = g.append('g')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'before-edge')
    .style('user-select', 'none')
    .selectAll('text')
    .data(root.descendants().slice(1))
    .join('text')
    .style("font-size", "10px")
    .style("font-family", "Arial")
    .style("font-weight", "Bold")
    .style('fill', 'rgb(255,255,255)')
    .attr('dy', '0.35em')
    .attr('fill-opacity', d => +labelVisible(d.current))
    .attr('transform', d => labelTransform_2(d.current))
    .text(d => d.data.name);

  let parent = g.append('circle')
    .datum(root)
    .attr('r', radius)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('click', clicked);

  return svg.node();
}