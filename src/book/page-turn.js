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
      if (bounds.right <= viewport.left + 1 || bounds.left >= viewport.right - 1 ||
          bounds.bottom <= viewport.top + 1 || bounds.top >= viewport.bottom - 1) return null;
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
      const backwards = Boolean(options.backwards);
      // Both directions use identical timing; only the fold geometry changes.
      const timing = {
        ...options,
        direction: 'normal',
      };
      const curlFrames = [
        { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 100% 100%, 0 100%)', offset: 0 },
        { clipPath: 'polygon(0 0, 100% 0, 100% 68%, 68% 100%, 0 100%)', offset: .25 },
        { clipPath: 'polygon(0 0, 100% 0, 100% 15%, 15% 100%, 0 100%)', offset: .55 },
        { clipPath: 'polygon(0 0, 40% 0, 0 40%, 0 40%, 0 40%)', offset: .85 },
        { clipPath: 'polygon(0 0, 0 0, 0 0, 0 0, 0 0)', offset: 1 },
      ];
      if (backwards) {
        // Mirror the fold geometry, while keeping artwork and text readable.
        curlFrames.forEach(frame => {
          frame.clipPath = frame.clipPath.replace(/(\d+)%? (\d+)%?/g,
            (_, x, y) => `${100 - Number(x)}% ${y}%`);
        });
        curl.style.left = '0';
        curl.style.right = 'auto';
        curl.style.transform = 'scaleX(-1)';
      }
      const animation = sheet.animate(curlFrames, timing);
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

// Opposite navigation directions lift opposite corners of the outgoing sheet.
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
  let activeAnimation = null;

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
        let animation;
        try {
          update();
          // Reveal the destination beneath the outgoing sheet in either direction.
          animation = held?.animation || sheet.animate(
            [
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
              backwards,
              easing: 'cubic-bezier(.32, 0, .18, 1)',
              fill: 'forwards',
            },
          );
          if (held) animation.play();
          activeAnimation = animation;
          await animation.finished;
        } catch {
          // The live page is already updated if an animation is cancelled.
        } finally {
          animation?.cancel();
          activeAnimation = null;
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
  turnPage.preview = (progress, { backwards = false, update, restore } = {}) => {
    if (running || reducedMotion() || typeof page.animate !== 'function') return;
    if (preview && preview.backwards !== backwards) turnPage.resize();
    if (!preview) {
      const sheet = createSheet(page);
      update?.();
      const animation = sheet.animate([{ opacity: 1 }], {
        duration: 450, easing: 'linear', fill: 'both', backwards,
      });
      preview = { sheet, animation, backwards, restore };
    }
    preview.animation.seek(Math.max(0, Math.min(0.98, progress)));
  };
  turnPage.restorePreview = () => {
    if (!preview?.restore) return;
    const restore = preview.restore;
    preview.restore = null;
    restore();
  };
  turnPage.cancelPreview = () => {
    if (!preview) return;
    turnPage.restorePreview();
    const held = preview;
    preview = null;
    held.animation.reverse();
    held.animation.finished.catch(() => {}).finally(() => {
      held.animation.cancel();
      held.sheet.remove();
    });
  };
  turnPage.resize = () => {
    activeAnimation?.cancel();
    if (!preview) return;
    turnPage.restorePreview();
    preview.animation.cancel();
    preview.sheet.remove();
    preview = null;
  };
  return turnPage;
}
