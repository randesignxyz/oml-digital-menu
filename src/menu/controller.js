import { createPageTurn } from '../book/page-turn.js?v=stable-frame';
import { initMenuLayout } from './layout.js';
import { createMenuChapters } from './view.js';
import { filterDishes, money } from './model.js';
import { loadMenu } from './repository.js';
import { readFavourites, writeFavourites } from './storage.js';
import { createSoupCatalogue } from './soup.js?v=sauce-catalogue';

export async function initMenu() {
  let loaded = false;
  let items = [],
    category = 'Cover',
    activeDish = null;
  const categories = [
    'All dishes',
    'Starters',
    'Pasta',
    'Pizza',
  ];
  const navigation = ['Cover', ...categories, 'Back Cover'];
  const saved = readFavourites();
  const $ = (id) => document.getElementById(id);
  initMenuLayout({ dishes: $('dishes'), controls: $('menuView') });
  const turnPage = createPageTurn(document.querySelector('.book-page'));
  const soup = createSoupCatalogue({ turnPage });
  $('dishes').before(soup);
  document.querySelector('.controls').append(soup.querySelector('.soup-selector'));
  const sauce = createSoupCatalogue({
    turnPage,
    id: 'sauceCatalogue',
    title: 'Sauce',
    products: ['Oyster Sauce', 'Chicken Stock', 'Chili Sauce', 'Fish Sauce', 'Soy Sauce', 'Hoisin Sauce', 'Tomato Sauce', 'Vinegar', 'Fermented Soybean', 'Vegetable Oil'].map((name, index) => {
      const number = index + 2;
      return { name, chip: name, path: `Source /OMLArtboard 1 copy ${number}@3x` };
    }),
  });
  $('dishes').before(sauce);
  document.querySelector('.controls').append(sauce.querySelector('.soup-selector'));
  const jebjub = createSoupCatalogue({
    turnPage,
    id: 'jebjubCatalogue',
    title: 'Jeb Jub',
    products: [
      { name: 'Jeb Jub Cover', chip: 'Cover', path: 'Jeb Jub/Jeb Jub Cover' },
      { name: 'Grilled Shrimp and Hot Spicy', chip: 'Grilled Shrimp & Hot Spicy', path: 'Jeb Jub/Grilled Shrimp and Hot Spicy' },
    ],
  });
  $('dishes').before(jebjub);
  document.querySelector('.controls').append(jebjub.querySelector('.soup-selector'));
  const meeChiet = createSoupCatalogue({
    turnPage,
    id: 'meeChietCatalogue',
    title: 'Mee Chiet',
    products: [{ name: 'Mee Chiet Cover', chip: 'Cover', path: 'Mee Chiet/Mee Chiet Cover' }, ...['Beef Stew Original', 'Minced Pork', 'Chicken Egg', 'Shrimp Sour Soup', 'Machu Kroeung Beef', 'Duck Stew', 'Lobster Sour Creamy Soup', 'Stir Fried Spicy Seafood', 'Stir Fried Salted Egg', 'Kuy Teav Minced Pork', 'Instant Vermicelli Minced Pork'].map((name, index) => ({
      name, chip: name, path: `Mee Chiet/OMLArtboard 1 copy ${index + 1}@3x`,
    }))],
  });
  $('dishes').before(meeChiet);
  document.querySelector('.controls').append(meeChiet.querySelector('.soup-selector'));
  let toastTimer;
  function toast(s) {
    $('toast').textContent = s;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2200);
  }
  function store() {
    writeFavourites(saved);
  }
  function toggle(id) {
    saved.has(id) ? saved.delete(id) : saved.add(id);
    store();
    render();
    if (activeDish) syncDetail();
    toast(
      saved.has(id) ? 'Saved to your favourites' : 'Removed from favourites',
    );
  }
  function render() {
    if (!loaded) return;
    const isCover = category === 'Cover' || category === 'Back Cover';
    if (isCover) {
      const isBackCover = category === 'Back Cover';
      const coverImage = $('coverPage').querySelector('img');
      coverImage.src = isBackCover ? 'assets/images/The last page or back cover.webp' : 'assets/images/oml-booklet-cover.webp';
      coverImage.alt = isBackCover ? 'One More Cooking Essentials back cover' : 'One More Cooking Essentials. OML booklet cover.';
      $('coverPage').setAttribute('aria-label', isBackCover ? 'One More Cooking Essentials back cover' : 'One More Cooking Essentials cover');
    }
    const isSoup = category === 'All dishes';
    const isSauce = category === 'Starters';
    const isJebJub = category === 'Pasta';
    const isMeeChiet = category === 'Pizza';
    document.querySelector('.book-page').classList.toggle('show-soup', isSoup || isSauce || isJebJub || isMeeChiet);
    document.querySelector('.book-page').classList.toggle('show-sauce', isSauce || isJebJub || isMeeChiet);
    soup.hidden = !isSoup;
    sauce.hidden = !isSauce;
    jebjub.hidden = !isJebJub;
    meeChiet.hidden = !isMeeChiet;
    document.querySelector('[data-catalogue="soupCatalogue"]').hidden = !isSoup;
    document.querySelector('[data-catalogue="sauceCatalogue"]').hidden = !isSauce;
    document.querySelector('[data-catalogue="jebjubCatalogue"]').hidden = !isJebJub;
    document.querySelector('[data-catalogue="meeChietCatalogue"]').hidden = !isMeeChiet;
    document.querySelector('.book-page').classList.toggle('show-cover', isCover);
    $('coverPage').hidden = !isCover;
    let q = $('search').value.trim().toLocaleLowerCase(),
      filtered = filterDishes(items, { category, saved, query: q });
    $('categories')
      .querySelectorAll('button')
      .forEach((button) => {
        const active = button.dataset.category === category;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    if (isCover) return;
    if (isSoup || isSauce || isJebJub || isMeeChiet) {
      $('categoryTitle').textContent = isMeeChiet ? 'Mee Chiet' : isJebJub ? 'Jeb Jub' : isSauce ? 'Sauce' : 'Soup Powder';
      $('categoryTitle').lang = 'en';
      $('resultCount').textContent = '';
      $('empty').hidden = true;
      return;
    }
    $('categoryTitle').removeAttribute('lang');
    $('categoryTitle').textContent = q
      ? 'Search results'
      : category === 'All dishes' ? 'Soup Powder' : category === 'Starters' ? 'Sauce' : category;
    $('resultCount').textContent =
      `${filtered.length} ${filtered.length === 1 ? 'dish' : 'dishes'}`;
    $('dishes').replaceChildren(
      ...createMenuChapters(
        filtered,
        categories.slice(1),
        { saved, onToggle: toggle, onDetail: detail },
        { showHeadings: category === 'All dishes' || Boolean(q) },
      ),
    );
    $('empty').hidden = filtered.length > 0;
  }
  function syncDetail() {
    let d = activeDish;
    $('detailSave').textContent = saved.has(d.id) ? '♥ Saved' : '♡ Save dish';
    $('detailSave').setAttribute('aria-pressed', String(saved.has(d.id)));
  }
  function detail(d) {
    activeDish = d;
    $('detailCategory').textContent = d.category;
    $('detailName').textContent = d.name;
    $('detailDescription').textContent =
      d.description ||
      'Please ask our team for the ingredients and preparation details.';
    $('detailPrice').textContent = money(d.price);
    syncDetail();
    $('detail').showModal();
  }
  $('search').oninput = render;
  $('reset').onclick = () => {
    category = 'All dishes';
    $('search').value = '';
    render();
  };
  document.querySelector('.close').onclick = () => $('detail').close();
  $('detail').onclick = (e) => {
    if (e.target === $('detail')) {
      let r = $('detail').getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        $('detail').close();
    }
  };
  $('detailSave').onclick = () => toggle(activeDish.id);
  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      !['INPUT', 'TEXTAREA', 'SELECT'].includes(
        document.activeElement.tagName,
      ) &&
      !document.activeElement.isContentEditable &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !$('detail').open
    ) {
      e.preventDefault();
      $('search').focus();
    }
  });
  function selectCategory(name) {
    category = name;
    $('dishes').scrollTop = 0;
    $('search').value = '';
    render();
  }
  $('categories').replaceChildren(
    ...navigation.map((name) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-controls', name === 'Cover' || name === 'Back Cover' ? 'coverPage' : name === 'All dishes' ? 'soupCatalogue' : name === 'Starters' ? 'sauceCatalogue' : name === 'Pasta' ? 'jebjubCatalogue' : name === 'Pizza' ? 'meeChietCatalogue' : 'dishes');
      b.dataset.category = name;
      b.textContent = name === 'All dishes' ? 'Soup Powder' : name === 'Starters' ? 'Sauce' : name === 'Pasta' ? 'Jeb Jub' : name === 'Pizza' ? 'Mee Chiet' : name;
      b.classList.toggle('active', category === name);
      b.setAttribute('aria-pressed', String(category === name));
      b.onclick = () => {
        if (!loaded) return;
        if (
          name === category &&
          !document
            .querySelector('.book-page')
            .classList.contains('page-turning')
        )
          return;
        const backwards =
          navigation.indexOf(name) < navigation.indexOf(category);
        $('menu').scrollIntoView({ block: 'start', behavior: 'instant' });
        turnPage(
          () => {
            category = name;
            render();
            $('dishes').scrollTop = 0;
          },
          { backwards },
        );
      };
      return b;
    }),
  );
  $('dishes').setAttribute('aria-busy', 'true');
  $('resultCount').textContent = 'Loading menu…';
  try {
    items = await loadMenu();
    loaded = true;
    render();
  } catch (error) {
    $('resultCount').textContent = 'Menu unavailable';
    $('dishes').textContent =
      'We couldn’t load the menu. Please refresh the page or ask our team for a menu.';
    console.error('Unable to load menu:', error);
  } finally {
    $('dishes').setAttribute('aria-busy', 'false');
  }
  return { selectCategory };
}
