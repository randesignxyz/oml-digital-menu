import { money, groupWines } from './model.js';

function make(tag, cls, text) {
  let e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
export function createDishCard(d, { saved, onToggle }) {
  let c = make('article', 'dish'),
    top = make('div', 'dish-top'),
    label = make('span', 'category-label', d.category === 'Starters' ? 'Sauce' : d.category),
    s = make('button', 'save', saved.has(d.id) ? '♥' : '♡');
  s.type = 'button';
  s.setAttribute(
    'aria-label',
    `${saved.has(d.id) ? 'Remove' : 'Save'} ${d.name}${saved.has(d.id) ? ' from favourites' : ' to favourites'}`,
  );
  s.setAttribute('aria-pressed', String(saved.has(d.id)));
  s.onclick = () => onToggle(d.id);
  top.append(label, s);
  let title = make('h5', 'dish-name', d.name);
  let desc = make('p', '', d.description || 'Ask our team for more details.');
  let bottom = make('div', 'dish-bottom');
  if (d.price !== null) {
    const price = d.serving
      ? `${money(d.servingPrice)} / ${d.serving}`
      : d.glassPrice === undefined
      ? `${money(d.price)}${d.category === 'Wine' ? ' / bottle' : ''}`
      : `${money(d.price)} / bottle · ${money(d.glassPrice)} / glass`;
    bottom.append(make('span', 'price', price));
  }
  const imageContainer = make('div', 'dish-image-button');
  const image = document.createElement('img');
  image.className = 'dish-image';
  image.width = 800;
  image.height = 600;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.draggable = false;
  image.alt = d.imageAlt || d.name;
  const fallback = new URL(
    '../../assets/images/dish-placeholder.svg',
    import.meta.url,
  ).href;
  image.addEventListener(
    'error',
    () => {
      image.srcset = '';
      image.src = fallback;
      image.alt = 'La Pizza — photo unavailable';
    },
    { once: true },
  );
  image.src = d.image || fallback;
  imageContainer.append(image);
  const content = make('div', 'dish-content');
  content.append(top, title, desc, bottom);
  c.append(imageContainer, content);
  return c;
}

// Group filtered dishes without losing the menu's category order.
export function createMenuChapters(
  items,
  categories,
  actions,
  { showHeadings = true } = {},
) {
  return categories.flatMap((category, index) => {
    const dishes = items.filter((dish) => dish.category === category);
    if (!dishes.length) return [];
    const chapter = make('section', 'menu-chapter');
    const heading = make('h4', 'chapter-title', category === 'Starters' ? 'Sauce' : category);
    heading.id = `chapter-${index}`;
    if (showHeadings) {
      chapter.setAttribute('aria-labelledby', heading.id);
    } else {
      chapter.setAttribute('aria-label', category === 'Starters' ? 'Sauce' : category);
    }
    if (showHeadings) chapter.append(heading);
    if (category === 'Wine') {
      for (const [groupIndex, group] of groupWines(dishes).entries()) {
        const section = make('section', 'menu-chapter');
        const groupHeading = make('h4', 'chapter-title', group.name);
        groupHeading.id = `wine-group-${groupIndex}`;
        section.setAttribute('aria-labelledby', groupHeading.id);
        const list = make('div', 'chapter-dishes');
        list.append(...group.items.map((dish) => createDishCard(dish, actions)));
        section.append(groupHeading, list);
        chapter.append(section);
      }
    } else {
      const list = make('div', 'chapter-dishes');
      list.append(...dishes.map((dish) => createDishCard(dish, actions)));
      chapter.append(list);
    }
    return [chapter];
  });
}
