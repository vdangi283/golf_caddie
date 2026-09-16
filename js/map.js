export const VIEW = {width:300,height:500,padding:18};

export function collectCoordinates(geojson){
  const out=[];
  const walk=v=>{
    if(Array.isArray(v)&&typeof v[0]==='number'&&typeof v[1]==='number') out.push(v);
    else if(Array.isArray(v)) v.forEach(walk);
  };
  (geojson.features||[]).forEach(f=>walk(f.geometry?.coordinates));
  return out;
}

export function createProjection(coords){
  const lngs=coords.map(c=>c[0]), lats=coords.map(c=>c[1]);
  const minLng=Math.min(...lngs),maxLng=Math.max(...lngs),minLat=Math.min(...lats),maxLat=Math.max(...lats);
  const usableW=VIEW.width-2*VIEW.padding,usableH=VIEW.height-2*VIEW.padding;
  const lngSpan=maxLng-minLng||1,latSpan=maxLat-minLat||1;
  const scale=Math.min(usableW/lngSpan,usableH/latSpan);
  const drawW=lngSpan*scale,drawH=latSpan*scale;
  const offsetX=(VIEW.width-drawW)/2,offsetY=(VIEW.height-drawH)/2;
  return {
    project({lat,lng}){return{x:offsetX+(lng-minLng)*scale,y:offsetY+(maxLat-lat)*scale}},
    unproject({x,y}){return{lng:minLng+(x-offsetX)/scale,lat:maxLat-(y-offsetY)/scale}}
  };
}

export function featureType(feature){
  const p=feature.properties||{};
  const text=[p.golf,p.natural,p.landuse,p.leisure,p.name].filter(Boolean).join(' ').toLowerCase();
  if(text.includes('green')) return 'green';
  if(text.includes('bunker')) return 'bunker';
  if(text.includes('water')||text.includes('pond')) return 'water';
  if(text.includes('fairway')) return 'fairway';
  if(text.includes('tee')) return 'tee';
  return null;
}

export function renderGeoJSON(svg,geojson,projection){
  const layer=document.createElementNS('http://www.w3.org/2000/svg','g');
  layer.id='courseLayer';
  const colors={fairway:'var(--fairway)',green:'var(--green-surface)',bunker:'var(--sand)',water:'var(--water)',tee:'#8A6A3E'};
  for(const feature of geojson.features||[]){
    const type=featureType(feature); if(!type) continue;
    const geom=feature.geometry; if(!geom) continue;
    const polygons=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
    polygons.forEach(poly=>{
      const ring=poly[0]; if(!ring?.length) return;
      const el=document.createElementNS('http://www.w3.org/2000/svg','polygon');
      el.setAttribute('points',ring.map(([lng,lat])=>{const p=projection.project({lat,lng});return `${p.x},${p.y}`}).join(' '));
      el.setAttribute('fill',colors[type]); el.dataset.type=type; layer.appendChild(el);
    });
  }
  svg.insertBefore(layer,svg.firstChild.nextSibling);
}
