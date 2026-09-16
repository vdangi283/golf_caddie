export const VIEW={width:300,height:500,padding:18};

export function geometries(feature){
  const g=feature?.geometry;if(!g)return[];
  return g.type==='GeometryCollection'?(g.geometries||[]):[g];
}
export function collectCoordinates(geojson){
  const out=[];const walk=v=>{if(Array.isArray(v)&&typeof v[0]==='number'&&typeof v[1]==='number')out.push(v);else if(Array.isArray(v))v.forEach(walk)};
  (geojson.features||[]).forEach(f=>geometries(f).forEach(g=>walk(g.coordinates)));return out;
}
export function createProjection(coords){
  const lngs=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);const minLng=Math.min(...lngs),maxLng=Math.max(...lngs),minLat=Math.min(...lats),maxLat=Math.max(...lats);const usableW=VIEW.width-2*VIEW.padding,usableH=VIEW.height-2*VIEW.padding;const lngSpan=maxLng-minLng||1,latSpan=maxLat-minLat||1;const scale=Math.min(usableW/lngSpan,usableH/latSpan);const drawW=lngSpan*scale,drawH=latSpan*scale,offsetX=(VIEW.width-drawW)/2,offsetY=(VIEW.height-drawH)/2;
  return{project({lat,lng}){return{x:offsetX+(lng-minLng)*scale,y:offsetY+(maxLat-lat)*scale}},unproject({x,y}){return{lng:minLng+(x-offsetX)/scale,lat:maxLat-(y-offsetY)/scale}}};
}
export function featureType(feature){
  const p=feature.properties||{};const text=[p.type,p.layer,p.golf,p.natural,p.landuse,p.leisure,p.name].filter(Boolean).join(' ').toLowerCase();
  if(text.includes('green'))return'green';if(text.includes('bunker')||text.includes('sand'))return'bunker';if(text.includes('water')||text.includes('pond'))return'water';if(text.includes('fairway'))return'fairway';if(text.includes('tee'))return'tee';if(text.includes('rough'))return'rough';return null;
}
export function polygonRings(feature){
  const rings=[];for(const g of geometries(feature)){if(g.type==='Polygon')rings.push(g.coordinates[0]);else if(g.type==='MultiPolygon')g.coordinates.forEach(p=>rings.push(p[0]));}return rings;
}
export function renderGeoJSON(svg,geojson,projection){
  const old=document.getElementById('courseLayer');if(old)old.remove();const layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.id='courseLayer';const colors={rough:'var(--rough)',fairway:'var(--fairway)',green:'var(--green-surface)',bunker:'var(--sand)',water:'var(--water)',tee:'#8A6A3E'};
  const order={rough:0,fairway:1,water:2,bunker:3,tee:4,green:5};const features=[...(geojson.features||[])].sort((a,b)=>(order[featureType(a)]??9)-(order[featureType(b)]??9));
  for(const feature of features){const type=featureType(feature);if(!type)continue;for(const ring of polygonRings(feature)){if(!ring?.length)continue;const el=document.createElementNS('http://www.w3.org/2000/svg','polygon');el.setAttribute('points',ring.map(([lng,lat])=>{const p=projection.project({lat,lng});return`${p.x},${p.y}`}).join(' '));el.setAttribute('fill',colors[type]);el.dataset.type=type;layer.appendChild(el)}}
  svg.insertBefore(layer,svg.firstChild.nextSibling);
}
