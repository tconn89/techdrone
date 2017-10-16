var canvas = document.querySelector("canvas"),
    context = canvas.getContext("2d"),
    width = canvas.width,
    height = canvas.height;
var n = 100,
    particles = new Array(n);
var voronoi = d3.voronoi()
    .extent([[-1, -1], [width + 1, height + 1]]);
for (var i = 0; i < n; ++i) particles[i] = {0: Math.random() * width, 1: Math.random() * height, vx: 0, vy: 0};
var timer = d3.timer(function(elapsed) {
  for (var i = 0; i < n; ++i) {
    var p = particles[i];
    p[0] += p.vx; if (p[0] < 0) p[0] = p.vx *= -1; else if (p[0] > width) p[0] = width + (p.vx *= -1);
    p[1] += p.vy; if (p[1] < 0) p[1] = p.vy *= -1; else if (p[1] > height) p[1] = height + (p.vy *= -1);
    p.vx += 0.1 * (Math.random() - 0.5) - 0.01 * p.vx;
    p.vy += 0.1 * (Math.random() - 0.5) - 0.01 * p.vy;
  }
  var topology = computeTopology(voronoi(particles));
  context.clearRect(0, 0, width, height);
  context.beginPath();
  renderMultiLineString(context, topojson.mesh(topology, topology.objects.voronoi, function(a, b) { return a !== b; }));
  context.strokeStyle = "rgba(0,0,0,0.4)";
  context.lineWidth = 0.5;
  context.stroke();
  particles.forEach(function(p, i) {
    context.beginPath();
    context.arc(p[0], p[1], 2.5, 0, 2 * Math.PI);
    context.fillStyle = i & 1 ? "rgba(255,0,0,1)" : "rgba(0,0,0,0.6)";
    context.fill();
  });
  context.beginPath();
  renderMultiPolygon(context, topojson.merge(topology, topology.objects.voronoi.geometries.filter(function(d, i) { return i & 1; })));
  context.fillStyle = "rgba(255,0,0,0.1)";
  context.fill();
  context.lineWidth = 1.5;
  context.lineJoin = "round";
  context.strokeStyle = "rgba(255,0,0,1)";
  context.stroke();
});
function computeTopology(diagram) {
  var cells = diagram.cells,
      arcs = [],
      arcIndex = -1,
      arcIndexByEdge = {};
  return {
    objects: {
      voronoi: {
        type: "GeometryCollection",
        geometries: cells.map(function(cell) {
          var cell,
              site = cell.site,
              halfedges = cell.halfedges,
              cellArcs = [],
              clipArc;
          halfedges.forEach(function(halfedge) {
            var edge = diagram.edges[halfedge];
            if (edge.right) {
              var l = edge.left.index,
                  r = edge.right.index,
                  k = l + "," + r,
                  i = arcIndexByEdge[k];
              if (i == null) arcs[i = arcIndexByEdge[k] = ++arcIndex] = edge;
              cellArcs.push(site === edge.left ? i : ~i);
              clipArc = null;
            } else if (clipArc) { // Coalesce border edges.
              if (edge.left) edge = edge.slice(); // Copy-on-write.
              clipArc.push(edge[1]);
            } else {
              arcs[++arcIndex] = clipArc = edge;
              cellArcs.push(arcIndex);
            }
          });
          // Ensure the last point in the polygon is identical to the first point.
          var firstArcIndex = cellArcs[0],
              lastArcIndex = cellArcs[cellArcs.length - 1],
              firstArc = arcs[firstArcIndex < 0 ? ~firstArcIndex : firstArcIndex],
              lastArc = arcs[lastArcIndex < 0 ? ~lastArcIndex : lastArcIndex];
          lastArc[lastArcIndex < 0 ? 0 : lastArc.length - 1] = firstArc[firstArcIndex < 0 ? firstArc.length - 1 : 0].slice();
          return {
            type: "Polygon",
            data: site.data,
            arcs: [cellArcs]
          };
        })
      }
    },
    arcs: arcs
  };
}
function renderMultiLineString(context, line) {
  line.coordinates.forEach(function(line) {
    line.forEach(function(point, i) {
      if (i) context.lineTo(point[0], point[1]);
      else context.moveTo(point[0], point[1]);
    });
  });
}
function renderMultiPolygon(context, polygon) {
  polygon.coordinates.forEach(function(polygon) {
    polygon.forEach(function(ring) {
      ring.forEach(function(point, i) {
        if (i) context.lineTo(point[0], point[1]);
        else context.moveTo(point[0], point[1]);
      });
    });
  });
}