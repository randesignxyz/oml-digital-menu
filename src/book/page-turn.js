function createTurningSheet(page) {
  const layer = document.createElement('div');
  layer.className = 'page-turn-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  const sheet = page.cloneNode(true);
  // Freeze layout before changing tabs; ID-based rules no longer apply once
  // snapshot IDs are removed, and the destination must not resize this sheet.
  const originals = [page, ...page.querySelectorAll('*')];
  const copies = [sheet, ...sheet.querySelectorAll('*')];
  const layoutProperties = ['display', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'padding', 'margin', 'flex', 'flex-direction', 'flex-shrink', 'grid-template-columns', 'gap', 'overflow', 'font-family', 'font-size', 'line-height', 'object-fit'];
  originals.forEach((original, index) => {
    const computed = getComputedStyle(original);
    layoutProperties.forEach((property) => copies[index].style.setProperty(property, computed.getPropertyValue(property)));
  });
  const rect = page.getBoundingClientRect();
  const parentRect = page.parentElement.getBoundingClientRect();
  Object.assign(layer.style, {
    inset: 'auto', left: `${rect.left - parentRect.left}px`, top: `${rect.top - parentRect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`,
  });
  sheet.classList.remove('page-turning');
  sheet.classList.add('page-turn-sheet');
  sheet.style.height = `${page.getBoundingClientRect().height}px`;
  sheet.style.minHeight = '0';
  // The snapshot is visual only; leave IDs and accessible controls on the live page.
  sheet.removeAttribute('id');
  sheet
    .querySelectorAll('[id]')
    .forEach((element) => element.removeAttribute('id'));
  const dishes = page.querySelector('#dishes');
  const snapshotDishes = sheet.querySelector('.dish-grid');
  const catalogues = page.querySelectorAll('.soup-stage');
  const snapshotCatalogues = sheet.querySelectorAll('.soup-stage');
  if (dishes && snapshotDishes) {
    snapshotDishes.style.flex = '1';
    snapshotDishes.style.minHeight = '0';
    snapshotDishes.style.overflowY = 'auto';
    snapshotDishes.style.scrollbarGutter = 'stable';
  }
  layer.append(sheet);
  const curl = document.createElement('div');
  curl.className = 'page-curl';
  layer.append(curl);
  page.parentElement.append(layer);
  if (dishes && snapshotDishes) snapshotDishes.scrollTop = dishes.scrollTop;
  catalogues.forEach((stage, index) => {
    if (snapshotCatalogues[index]) snapshotCatalogues[index].scrollTop = stage.scrollTop;
  });
  return {
    animate: (frames, options) => {
      const backwards = frames[0].opacity === 0;
      // Reversing an animation also reverses its easing curve. Mirror the
      // supplied curve so backward turns keep the forward turn's pacing.
      const timing = {
        ...options,
        direction: backwards ? 'reverse' : 'normal',
        easing: backwards ? 'cubic-bezier(.82, 0, .68, 1)' : options.easing,
      };
      const animation = sheet.animate([
        { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 100% 100%, 0 100%)', offset: 0 },
        { clipPath: 'polygon(0 0, 100% 0, 100% 68%, 68% 100%, 0 100%)', offset: .25 },
        { clipPath: 'polygon(0 0, 100% 0, 100% 15%, 15% 100%, 0 100%)', offset: .55 },
        { clipPath: 'polygon(0 0, 40% 0, 0 40%, 0 40%, 0 40%)', offset: .85 },
        { clipPath: 'polygon(0 0, 0 0, 0 0, 0 0, 0 0)', offset: 1 },
      ], timing);
      const fold = curl.animate([
        { width: '0%', height: '0%', opacity: 0, offset: 0 },
        { width: '32%', height: '32%', opacity: 1, offset: .25 },
        { width: '85%', height: '85%', opacity: 1, offset: .55 },
        { width: '160%', height: '160%', opacity: .8, offset: .85 },
        { width: '200%', height: '200%', opacity: 0, offset: 1 },
      ], timing);
      return {
        finished: animation.finished,
        cancel() { animation.cancel(); fold.cancel(); },
      };
    },
    remove: () => layer.remove(),
  };
}

// Forward turns lift the old sheet; backward turns lay the previous page down.
export function createPageTurn(
  page,
  {
    reducedMotion = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    createSheet = createTurningSheet,
  } = {},
) {
  let pending = null;
  let running = false;

  async function flush() {
    running = true;
    const wasInert = page.inert;
    page.inert = true;
    page.classList.add('page-turning');
    try {
      while (pending) {
        const { update, backwards } = pending;
        pending = null;
        if (reducedMotion() || typeof page.animate !== 'function') {
          update();
          continue;
        }
        const sheet = createSheet(page);
        let incomingSheet;
        let animation;
        try {
          update();
          // A returning page swings back onto the outgoing page from the spine.
          if (backwards) incomingSheet = createSheet(page);
          animation = (incomingSheet || sheet).animate(
            backwards
              ? [
                  { transform: 'rotateY(-100deg)', filter: 'brightness(.8)', opacity: 0 },
                  { transform: 'rotateY(-65deg)', filter: 'brightness(.88)', opacity: 1, offset: 0.35 },
                  { transform: 'rotateY(0deg)', filter: 'brightness(1)', opacity: 1 },
                ]
              : [
              {
                transform: 'rotateY(0deg)',
                filter: 'brightness(1)',
                opacity: 1,
              },
              {
                transform: 'rotateY(-65deg)',
                filter: 'brightness(.88)',
                opacity: 1,
                offset: 0.65,
              },
              {
                transform: 'rotateY(-100deg)',
                filter: 'brightness(.8)',
                opacity: 0,
              },
            ],
            {
              duration: 1500,
              easing: 'cubic-bezier(.32, 0, .18, 1)',
              fill: 'forwards',
            },
          );
          await animation.finished;
        } catch {
          // The live page is already updated if an animation is cancelled.
        } finally {
          animation?.cancel();
          incomingSheet?.remove();
          sheet.remove();
        }
      }
    } finally {
      page.inert = wasInert;
      page.classList.remove('page-turning');
      running = false;
    }
  }

  return function turnPage(update, { backwards = false } = {}) {
    pending = { update, backwards };
    if (!running) return flush();
  };
}
