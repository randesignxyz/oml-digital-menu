function createTurningSheet(page) {
  const layer = document.createElement('div');
  layer.className = 'page-turn-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  // Copy only visible content, rather than every product in every category.
  // Keep layout values because the visual snapshot has no live element IDs.
  const layoutProperties = ['display', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'padding', 'margin', 'flex', 'flex-direction', 'flex-shrink', 'grid-template-columns', 'gap', 'overflow', 'font-family', 'font-size', 'line-height', 'object-fit'];
  function copyVisible(original) {
    if (original.nodeType !== 1) return original.cloneNode(true);
    if (original.hidden) return null;
    const computed = getComputedStyle(original);
    if (computed.display === 'none') return null;
    if (original.classList.contains('soup-product-page')) {
      const bounds = original.getBoundingClientRect();
      const viewport = original.parentElement.getBoundingClientRect();
      if (bounds.right <= viewport.left + 1 || bounds.left >= viewport.right - 1) return null;
    }
    const copy = original.cloneNode(false);
    copy.removeAttribute('id');
    layoutProperties.forEach(property => copy.style.setProperty(property, computed.getPropertyValue(property)));
    original.childNodes.forEach(child => {
      const childCopy = copyVisible(child);
      if (childCopy) copy.append(childCopy);
    });
    return copy;
  }
  const sheet = copyVisible(page);
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
        get finished() { return animation.finished; },
        seek(progress) {
          animation.pause(); fold.pause();
          animation.currentTime = progress * options.duration;
          fold.currentTime = progress * options.duration;
        },
        play() { animation.playbackRate = 1; fold.playbackRate = 1; animation.play(); fold.play(); },
        reverse() { animation.reverse(); fold.reverse(); },
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
  let preview = null;

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
        const held = preview;
        preview = null;
        const sheet = held?.sheet || createSheet(page);
        let incomingSheet;
        let animation;
        try {
          update();
          // A returning page swings back onto the outgoing page from the spine.
          if (backwards && !held) incomingSheet = createSheet(page);
          animation = held?.animation || (incomingSheet || sheet).animate(
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
              duration: 450,
              easing: 'cubic-bezier(.32, 0, .18, 1)',
              fill: 'forwards',
            },
          );
          if (held) animation.play();
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

  function turnPage(update, { backwards = false } = {}) {
    pending = { update, backwards };
    if (!running) return flush();
  }
  turnPage.preview = progress => {
    if (running || reducedMotion() || typeof page.animate !== 'function') return;
    if (!preview) {
      const sheet = createSheet(page);
      const animation = sheet.animate([{ opacity: 1 }], {
        duration: 450, easing: 'linear', fill: 'both',
      });
      preview = { sheet, animation };
    }
    preview.animation.seek(Math.max(0, Math.min(0.98, progress)));
  };
  turnPage.cancelPreview = () => {
    if (!preview) return;
    const held = preview;
    preview = null;
    held.animation.reverse();
    held.animation.finished.catch(() => {}).finally(() => {
      held.animation.cancel();
      held.sheet.remove();
    });
  };
  return turnPage;
}
