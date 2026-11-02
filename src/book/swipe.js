export function swipeDirection(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < 55 || Math.abs(dx) <= Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

export function onSwipe(element, navigate, { ignore = () => false, onDrag = () => {}, onRelease = () => {} } = {}) {
  let start = null;
  let suppressClick = false;
  element.addEventListener('pointerdown', event => {
    start = event.isPrimary && event.button === 0 && !ignore(event.target)
      ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null;
    suppressClick = false;
  });
  element.addEventListener('pointermove', event => {
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (!start.dragging) {
        start.dragging = true;
        element.setPointerCapture?.(event.pointerId);
      }
      onDrag(dx);
    } else if (start.dragging) {
      onDrag(0);
    }
  });
  element.addEventListener('pointerup', event => {
    if (!start || start.id !== event.pointerId) return;
    const direction = swipeDirection(start, { x: event.clientX, y: event.clientY });
    const dragging = start.dragging;
    start = null;
    if (dragging) {
      suppressClick = true;
      onRelease(Boolean(direction));
    }
    if (direction) {
      suppressClick = true;
      navigate(direction);
    }
  });
  function cancelGesture() {
    if (start?.dragging) onRelease(false);
    start = null;
  }
  element.addEventListener('pointercancel', cancelGesture);
  globalThis.addEventListener?.('resize', cancelGesture);
  element.addEventListener('dragstart', event => event.preventDefault());
  element.addEventListener('click', event => {
    if (!suppressClick || !event.isTrusted) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}
