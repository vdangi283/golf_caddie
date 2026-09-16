export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const hit = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || Number.EPSILON) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function orientation(a, b, c) {
  return Math.sign((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
}

function onSegment(a, b, c) {
  return b.x <= Math.max(a.x, c.x) && b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) && b.y >= Math.min(a.y, c.y);
}

function segmentsIntersect(p1, q1, p2, q2) {
  const o1 = orientation(p1, q1, p2), o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1), o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

export function shotCrossesPolygon(from, to, polygon) {
  if (pointInPolygon(from, polygon) || pointInPolygon(to, polygon)) return true;
  for (let i = 0; i < polygon.length; i++) {
    const a = {x: polygon[i][0], y: polygon[i][1]};
    const b = {x: polygon[(i + 1) % polygon.length][0], y: polygon[(i + 1) % polygon.length][1]};
    if (segmentsIntersect(from, to, a, b)) return true;
  }
  return false;
}

export function recommendClub({remainingYards, clubs, from, pin, hazards, projectAlongShot}) {
  const ascending = [...clubs].sort((a,b) => a.total - b.total);
  const descending = [...clubs].sort((a,b) => b.total - a.total);

  // If the green is reachable, prefer the shortest club whose carry covers it.
  const greenClub = ascending.find(c => c.carry >= remainingYards - 1);
  if (greenClub) return {club: greenClub, target: pin, reason: ''};

  // Otherwise evaluate the whole shot line, not only its landing point.
  for (const club of descending) {
    const travel = Math.min(club.total, remainingYards);
    const target = projectAlongShot(travel / remainingYards);
    const risky = hazards.some(h => shotCrossesPolygon(from, target, h.poly));
    if (!risky) return {club, target, reason: ''};
  }

  const club = ascending[0];
  return {
    club,
    target: projectAlongShot(Math.min(club.total, remainingYards) / remainingYards),
    reason: 'Hazard crosses the direct line. Consider a safer aim point.'
  };
}
