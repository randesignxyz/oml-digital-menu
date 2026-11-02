export function createPaperDrag(page, turnPage, destination = () => ({})) {
  let plan;
  let direction;
  return {
    onDrag(dx) {
      if (!dx) {
        if (plan) turnPage.preview(0, { backwards: direction < 0 });
        return;
      }
      const nextDirection = dx < 0 ? 1 : -1;
      if (!plan || nextDirection !== direction) {
        turnPage.resize?.();
        direction = nextDirection;
        plan = destination(direction);
      }
      if (!plan) return;
      turnPage.preview(Math.abs(dx) / page.clientWidth, { backwards: direction < 0, ...plan });
    },
    onRelease(committed) {
      if (committed) turnPage.restorePreview?.();
      else turnPage.cancelPreview();
      plan = null;
    },
  };
}
