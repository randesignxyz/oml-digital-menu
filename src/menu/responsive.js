export function pagesPerView(stage) {
  return typeof getComputedStyle === 'function'
    ? Number(getComputedStyle(stage).getPropertyValue('--pages-per-view')) || 1 : 1;
}

export function spreadStart(index, count) {
  return Math.floor(index / count) * count;
}

export function chipGroup(products, index, count) {
  return products.slice(index, index + count);
}

export function alignProduct(stage, pages, index) {
  const page = pages[spreadStart(index, pagesPerView(stage))];
  stage.scrollTo({
    left: page.offsetLeft - pages[0].offsetLeft,
    top: (page.offsetTop || 0) - (pages[0].offsetTop || 0),
    behavior: 'instant',
  });
}

// Keep the selected product's spread visible across rotation and folding.
export function watchProductViewport(stage, pages, selectedIndex, Observer = ResizeObserver, onResize = () => {}) {
  const observer = new Observer(() => {
    if (!stage.clientWidth) return;
    onResize();
    alignProduct(stage, pages, selectedIndex());
  });
  observer.observe(stage);
  return observer;
}
