export const soupProducts = ['Chicken Powder', 'Pork Powder', 'Vegetable Powder', 'Prahok Powder'];

export function createSoupCatalogue({ turnPage, id = 'soupCatalogue', title = 'Soup Powder', products = soupProducts.map(name => ({ name, chip: name.replace(' Powder', ''), path: `Soup Powder/${name}` })) }) {
  const catalogue = document.createElement('section');
  catalogue.id = id;
  catalogue.className = 'soup-catalogue';
  catalogue.setAttribute('aria-label', `${title} products`);
  catalogue.hidden = true;
  const selector = document.createElement('div');
  selector.className = 'soup-selector';
  selector.setAttribute('role', 'group');
  selector.dataset.catalogue = id;
  selector.setAttribute('aria-label', `Jump to a ${title} product`);
  const stage = document.createElement('div');
  stage.className = 'soup-stage';
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', `Scroll through ${title} products`);
  catalogue.append(selector, stage);
  const buttons = [];
  const pages = products.map(({ name, chip, path }, index) => {
    const page = document.createElement('article');
    page.className = 'soup-product-page';
    page.id = `${id}-product-${index}`;
    page.setAttribute('aria-label', name);
    const artwork = document.createElement('a');
    artwork.className = 'soup-artwork';
    artwork.target = '_blank';
    artwork.rel = 'noopener';
    artwork.href = new URL(`../../assets/images/${path}.png`, import.meta.url).href;
    artwork.setAttribute('aria-label', `View ${name} full size in a new tab`);
    const image = document.createElement('img');
    image.src = new URL(`../../assets/images/${path}.webp`, import.meta.url).href;
    image.alt = `${name} — One More product sheet with packaging, sizes and Khmer product information`;
    image.width = 1400;
    image.height = 1989;
    image.loading = index === 0 ? 'eager' : 'lazy';
    image.decoding = 'async';
    artwork.append(image);
    page.append(artwork);
    stage.append(page);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = chip;
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-controls', page.id);
    button.setAttribute('aria-pressed', String(index === 0));
    button.onclick = () => {
      const active = buttons.findIndex((item) => item.getAttribute('aria-pressed') === 'true');
      if (index === active) return;
      turnPage(() => {
        // Move beneath the curling sheet; all products remain in the scroll area.
        stage.scrollTo({
          top: page.getBoundingClientRect().top - stage.getBoundingClientRect().top + stage.scrollTop,
          behavior: 'instant',
        });
        buttons.forEach((item, position) => item.setAttribute('aria-pressed', String(position === index)));
      }, { backwards: index < active });
    };
    buttons.push(button);
    selector.append(button);
    return page;
  });
  // Keep the header chips in sync with the product nearest the viewport centre.
  stage.addEventListener('scroll', () => {
    const centre = stage.getBoundingClientRect().top + stage.clientHeight / 2;
    let active = 0;
    let distance = Infinity;
    pages.forEach((page, index) => {
      const rect = page.getBoundingClientRect();
      const nextDistance = Math.abs(rect.top + rect.height / 2 - centre);
      if (nextDistance < distance) { active = index; distance = nextDistance; }
    });
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === active)));
  }, { passive: true });
  return catalogue;
}
