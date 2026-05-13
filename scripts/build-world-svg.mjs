// scripts/build-world-svg.mjs
// 将 Natural Earth 110m TopoJSON 转成静态 SVG（等经纬投影 360×180）
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoPath, geoEquirectangular } from "d3-geo";

const topo = JSON.parse(readFileSync("public/world-topo.json", "utf8"));
const countries = feature(topo, topo.objects.countries);

// viewBox 0 0 1000 500（方便后续缩放）
const projection = geoEquirectangular().scale(159.155).translate([500, 250]);
const toPath = geoPath(projection);

// 单个 path 合并所有国家；fillRule 处理洞
const d = countries.features.map((f) => toPath(f)).filter(Boolean).join(" ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" preserveAspectRatio="none"><path d="${d}" fill="currentColor" fill-rule="evenodd"/></svg>`;

writeFileSync("public/world-map.svg", svg);
console.log(`wrote public/world-map.svg · ${svg.length} bytes`);
