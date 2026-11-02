export function createPaperDrag(page, turnPage) {
  return {
    onDrag(dx) {
      turnPage.preview(Math.abs(dx) / page.clientWidth);
    },
    onRelease(committed) {
      if (!committed) turnPage.cancelPreview();
    },
  };
}
