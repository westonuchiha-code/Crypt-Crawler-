// ---------- collision & line of sight ----------
function solid(x, y) {
  const cx = Math.floor(x), cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= W || cy >= H) return true;
  const t = map[cy * W + cx];
  return t > 0 && t !== STAIRS;
}
function blocked(x, y) {
  const r = 0.2;
  for (const pr of props) if (pr.solid && Math.abs(pr.x - x) < 0.32 && Math.abs(pr.y - y) < 0.32) return true;
  return solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r);
}
function moveEnt(e, dx, dy) {
  if (!blocked(e.x + dx, e.y)) e.x += dx;
  if (!blocked(e.x, e.y + dy)) e.y += dy;
}
function los(x0, y0, x1, y1) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solid(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

