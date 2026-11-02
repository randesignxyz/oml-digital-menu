import test from 'node:test';
import assert from 'node:assert/strict';
import { watchProductViewport, spreadStart, chipGroup } from '../src/menu/responsive.js';

test('paired chip names follow spread order and retain an unpaired final product', () => {
  const products = ['Cover', 'BSO', 'MP'].map(chip => ({ chip }));
  const label = (index, count) => chipGroup(products, index, count).map(product => product.chip).join(' / ');
  assert.equal(label(0, 2), 'Cover / BSO');
  assert.equal(label(2, 2), 'MP');
  assert.equal(label(1, 1), 'BSO');
});

test('two-page spreads keep both chip targets in the same pair', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(index => spreadStart(index, 2)), [0, 0, 2, 2, 4]);
  assert.equal(spreadStart(3, 1), 3);
});

test('rotation keeps the chosen product aligned at the new page width', () => {
  let resize;
  let selected = 2;
  const positions = [];
  const stage = { clientWidth: 768, scrollTo: options => positions.push(options.left) };
  const pages = [{ offsetLeft: 0 }, { offsetLeft: 768 }, { offsetLeft: 1536 }];
  class Observer {
    constructor(callback) { resize = callback; }
    observe(element) { assert.equal(element, stage); }
  }
  watchProductViewport(stage, pages, () => selected, Observer);
  resize();
  assert.equal(positions.at(-1), 1536);
  stage.clientWidth = 1024;
  pages.forEach((page, index) => { page.offsetLeft = index * 1024; });
  resize();
  assert.equal(positions.at(-1), 2048);
  // Hidden categories must not lose their selection while rotating.
  stage.clientWidth = 0;
  resize();
  assert.equal(positions.length, 2);
  stage.clientWidth = 540;
  selected = 1;
  pages.forEach((page, index) => { page.offsetLeft = index * 540; });
  resize();
  assert.equal(positions.at(-1), 540);
});
