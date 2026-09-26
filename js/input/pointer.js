// Input sentuh / mouse / pena → Manipulator.
// Ketuk = pasang jangkar (pusat / titik garis). Seret = pegang & ubah bayangan.

const TAP_MS = 280;
const TAP_PX = 8;

export function attachPointer(canvas, plane, manip, { onHover } = {}) {
  let down = null;

  const world = (e) => {
    const r = canvas.getBoundingClientRect();
    return plane.toWorld(e.clientX - r.left, e.clientY - r.top);
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (down) return; // abaikan jari kedua
    canvas.setPointerCapture(e.pointerId);
    down = { id: e.pointerId, t: performance.now(), x: e.clientX, y: e.clientY, dragging: false, p: world(e) };
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = world(e);
    onHover?.(p);
    if (!down || e.pointerId !== down.id) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (!down.dragging && moved > TAP_PX) {
      down.dragging = true;
      manip.grabStart(down.p);
    }
    if (down.dragging) manip.grabMove(p);
  });

  const end = (e) => {
    if (!down || e.pointerId !== down.id) return;
    if (down.dragging) manip.grabEnd();
    else if (performance.now() - down.t < TAP_MS * 3 && manip.needsAnchor) manip.setAnchor(world(e));
    down = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', (e) => { if (down?.dragging) manip.grabEnd(); down = null; });
  canvas.addEventListener('pointerleave', () => onHover?.(null));
}
