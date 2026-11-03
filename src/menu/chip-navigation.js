export function createChipNavigation(selector) {
  const wrapper = document.createElement('div');
  wrapper.className = 'soup-chip-nav';
  function arrow(direction) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip-scroll';
    button.textContent = direction < 0 ? '‹' : '›';
    button.setAttribute('aria-label', direction < 0 ? 'Scroll to earlier products' : 'Scroll to more products');
    button.hidden = true;
    button.onclick = () => selector.scrollBy({
      left: direction * Math.max(120, selector.clientWidth * 0.75),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    return button;
  }
  const previous = arrow(-1);
  const next = arrow(1);
  wrapper.append(previous, selector, next);

  function updateEdges() {
    if (!wrapper.clientWidth) return;
    const overflow = selector.scrollWidth > wrapper.clientWidth + 1;
    previous.hidden = next.hidden = !overflow;
    previous.disabled = selector.scrollLeft <= 1;
    next.disabled = selector.scrollLeft + selector.clientWidth >= selector.scrollWidth - 1;
  }
  function revealActive() {
    if (!selector.clientWidth) return;
    const active = selector.querySelector('[aria-pressed="true"]');
    if (!active || active.hidden) return;
    const bounds = selector.getBoundingClientRect();
    const chip = active.getBoundingClientRect();
    if (chip.left < bounds.left) selector.scrollLeft -= bounds.left - chip.left + 4;
    else if (chip.right > bounds.right) selector.scrollLeft += chip.right - bounds.right + 4;
  }
  let frame;
  function refresh() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      updateEdges();
      revealActive();
      updateEdges();
    });
  }
  selector.addEventListener('scroll', updateEdges, { passive: true });
  const resize = new ResizeObserver(refresh);
  resize.observe(wrapper);
  resize.observe(selector);
  const changes = new MutationObserver(refresh);
  changes.observe(selector, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed', 'hidden'] });
  return wrapper;
}
