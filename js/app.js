import {distanceYards,interpolateGeo} from './distance.js';
import {recommendClub} from './caddie.js';
import {collectCoordinates,createProjection,renderGeoJSON,featureType,polygonRings} from './map.js';

const COURSE_URL='./course_data/cog_hill_18.json';
const TERRAIN_URL='./course_data/cog_hill_18_elevation.json';
const GEOJSON_URL='./course_data/cog_hill_course.geojson';
const HOLE=18;
let clubs=[{name:'Driver',carry:215,total:230},{name:'3-Wood',carry:195,total:210},{name:'5-Iron',carry:165,total:170},{name:'7-Iron',carry:145,total:150},{name:'9-Iron',carry:125,total:130},{name:'PW',carry:105,total:110},{name:'SW',carry:75,total:80}];
let course,geojson,holeGeoJSON,projection,tee,pin,ball,hazards=[],strokeCount=0,holed=false;
const $=id=>document.getElementById(id);
function centroid(ring){const pts=ring.length>1?ring.slice(0,-1):ring;return{lng:pts.reduce((s,p)=>s+p[0],0)/pts.length,lat:pts.reduce((s,p)=>s+p[1],0)/pts.length}}
function geometryCenter(f){const ring=polygonRings(f)[0];return ring?.length?centroid(ring):null}
function holeNumbers(f){const h=f?.properties?.holes;return Array.isArray(h)?h.map(Number).filter(Number.isFinite):[]}
function belongsToHole(f,n=HOLE){return holeNumbers(f).includes(n)}
function belongsOnlyToOtherHoles(f,n=HOLE){const h=holeNumbers(f);return h.length>0&&!h.includes(n)}
function getFeatures(type,source=geojson){return(source.features||[]).filter(f=>featureType(f)===type)}
function polyToScreen(f){const ring=polygonRings(f)[0];return ring?ring.map(([lng,lat])=>{const p=projection.project({lat,lng});return[p.x,p.y]}):[]}
function pointSegmentDistanceYards(p,a,b){const lat0=(a.lat+b.lat)/2*Math.PI/180,sx=111320*Math.cos(lat0),sy=110540;const bx=(b.lng-a.lng)*sx,by=(b.lat-a.lat)*sy,px=(p.lng-a.lng)*sx,py=(p.lat-a.lat)*sy;const den=bx*bx+by*by||1,t=Math.max(0,Math.min(1,(px*bx+py*by)/den));return Math.hypot(px-t*bx,py-t*by)*1.0936133}
function chooseBlackTeeAndGreen(exact){
  const greens=exact.filter(f=>featureType(f)==='green').map(f=>({f,c:geometryCenter(f)})).filter(x=>x.c);
  const tees=exact.filter(f=>featureType(f)==='tee').map(f=>({f,c:geometryCenter(f)})).filter(x=>x.c);
  if(!greens.length)throw Error('Hole 18 has no tagged green');
  if(!tees.length)throw Error('Hole 18 has no tagged tee');
  let best=null;
  for(const t of tees)for(const g of greens){const d=distanceYards(t.c,g.c);if(d<250||d>600)continue;const score=Math.abs(d-course.yardages.Black);if(!best||score<best.score)best={t,g,d,score}}
  if(!best){for(const t of tees)for(const g of greens){const d=distanceYards(t.c,g.c),score=Math.abs(d-course.yardages.Black);if(!best||score<best.score)best={t,g,d,score}}}
  return best;
}
function deriveHole18(){
  const features=geojson.features||[];
  const exact=features.filter(f=>belongsToHole(f));
  if(!exact.length)throw Error('Local GeoJSON contains no features tagged for Hole 18');
  const best=chooseBlackTeeAndGreen(exact);tee=best.t.c;pin=best.g.c;
  // Primary map geometry comes ONLY from explicit Hole 18 membership.
  const explicit=exact.filter(f=>['rough','fairway','green','tee','bunker','water'].includes(featureType(f)));
  // Some hazards are intentionally unassigned in the source. Add only untagged hazards
  // close to the Hole 18 tee-to-green playing corridor. Never borrow a feature tagged to another hole.
  const supplemental=features.filter(f=>{
    if(belongsToHole(f)||belongsOnlyToOtherHoles(f))return false;
    const type=featureType(f);if(!['bunker','water'].includes(type))return false;
    const c=geometryCenter(f);if(!c)return false;
    return pointSegmentDistanceYards(c,tee,pin)<=70&&distanceYards(c,tee)<=575&&distanceYards(c,pin)<=575;
  });
  const unique=[...new Map([...explicit,...supplemental].map(f=>[f.properties?.feature_id||f.properties?.osm_id||JSON.stringify(f.geometry),f])).values()];
  return{tee,pin,features:unique,straightLineYards:best.d};
}
function updateStrokeUI(){$('strokeRow').textContent=`Shot ${strokeCount+1} · Par ${course.par}`;$('strokeInput').value=strokeCount}
function drawTarget(target,from){const a=projection.project(from),b=projection.project(target);[['shotLine',{x1:a.x,y1:a.y,x2:b.x,y2:b.y}],['targetDot',{cx:b.x,cy:b.y}],['ball',{cx:a.x,cy:a.y}]].forEach(([id,attrs])=>Object.entries(attrs).forEach(([k,v])=>$(id).setAttribute(k,v)))}
function recommend(){const remaining=distanceYards(ball,pin),from=projection.project(ball),pinPx=projection.project(pin);$('remainYards').textContent=Math.round(remaining);$('statusLine').style.display='none';if(remaining<20){$('recClub').textContent='Putter';$('shotYards').textContent=Math.round(remaining*3);$('shotUnit').textContent=' foot putt (approx.)';drawTarget(pin,ball);return}$('shotUnit').textContent=' yard shot';const rec=recommendClub({remainingYards:remaining,clubs,from,pin:pinPx,hazards,projectAlongShot:f=>projection.project(interpolateGeo(ball,pin,f))});$('recClub').textContent=rec.club.name;$('shotYards').textContent=Math.round(Math.min(rec.club.total,remaining));if(rec.reason){$('statusLine').textContent=rec.reason;$('statusLine').style.display='block'}drawTarget(projection.unproject(rec.target),ball)}
function renderClubInputs(){const c=$('clubInputs');c.innerHTML='<span></span><span class="club-head">Carry</span><span class="club-head">Total</span>';clubs.forEach((club,i)=>{const l=document.createElement('label');l.textContent=club.name;c.appendChild(l);['carry','total'].forEach(key=>{const input=document.createElement('input');input.type='number';input.value=club[key];input.addEventListener('input',e=>{clubs[i][key]=+e.target.value||0;recommend()});c.appendChild(input)})})}
function finishHole(n){holed=true;strokeCount=n;$('strokeRow').textContent=`Holed in ${n}`;$('strokeInput').value=n;$('recClub').textContent='Holed out';$('shotYards').textContent=n;$('shotUnit').textContent=' total strokes';$('remainYards').textContent=0}
function bind(){const svg=$('hole');svg.addEventListener('click',e=>{if(holed)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());ball=projection.unproject({x:q.x,y:q.y});strokeCount++;if(distanceYards(ball,pin)<2)return finishHole(strokeCount);updateStrokeUI();recommend()});$('resetBtn').onclick=()=>{ball={...tee};strokeCount=0;holed=false;updateStrokeUI();recommend()};$('holedBtn').onclick=()=>finishHole(Math.max(1,strokeCount+1))}
async function init(){course=await fetch(COURSE_URL).then(r=>r.json());const terrain=await fetch(TERRAIN_URL).then(r=>r.json());$('courseName').textContent=course.course;$('terrainStatus').textContent=terrain.samples.length?'Loaded':'Awaiting real elevation samples';geojson=await fetch(GEOJSON_URL).then(r=>{if(!r.ok)throw Error('Local course GeoJSON failed to load');return r.json()});const h=deriveHole18();tee=h.tee;pin=h.pin;holeGeoJSON={type:'FeatureCollection',features:h.features};const coords=collectCoordinates(holeGeoJSON);if(!coords.length)throw Error('Hole 18 contains no drawable coordinates');projection=createProjection(coords);renderGeoJSON($('hole'),holeGeoJSON,projection);ball={...tee};hazards=[...getFeatures('water',holeGeoJSON),...getFeatures('bunker',holeGeoJSON)].map(f=>({name:featureType(f),poly:polyToScreen(f)})).filter(h=>h.poly.length);const t=projection.project(tee),g=projection.project(pin);$('teeMarker').setAttribute('x',t.x-5);$('teeMarker').setAttribute('y',t.y-4);$('pin').setAttribute('cx',g.x);$('pin').setAttribute('cy',g.y);$('holeMeta').textContent=`Hole ${course.hole} · Par ${course.par} · Black tee ${course.yardages.Black} yd · mapped line ${Math.round(h.straightLineYards)} yd`;renderClubInputs();updateStrokeUI();bind();recommend()}
init().catch(err=>{$('statusLine').textContent=`Map data error: ${err.message}`;$('statusLine').style.display='block';console.error(err)});
