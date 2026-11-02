import { watchProductViewport, alignProduct, pagesPerView, spreadStart, chipGroup } from './responsive.js?v=paired-chips';

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
  let selectedIndex = 0;
  function syncChips() {
    const count = pagesPerView(stage);
    const active = spreadStart(selectedIndex, count);
    buttons.forEach((button, index) => {
      button.hidden = index % count !== 0;
      const group = chipGroup(products, index, count);
      button.textContent = group.map(product => product.chip).join(' / ');
      button.setAttribute('aria-label', group.map(product => product.name).join(' / '));
      button.setAttribute('aria-controls', group.map((_, i) => `${id}-product-${index + i}`).join(' '));
      button.setAttribute('aria-pressed', String(index === active));
    });
  }
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
        alignProduct(stage, pages, index);
        selectedIndex = index;
        syncChips();
      }, { backwards: index < active });
    };
    buttons.push(button);
    selector.append(button);
    return page;
  });
  watchProductViewport(stage, pages, () => selectedIndex, ResizeObserver, syncChips);
  return catalogue;
}
