import test from 'node:test';
import assert from 'node:assert/strict';
import { swipeDirection, onSwipe } from '../src/book/swipe.js';

test('horizontal swipes navigate in both directions and ignore taps and vertical gestures', () => {
  const start = { x: 100, y: 100 };
  assert.equal(swipeDirection(start, { x: 20, y: 110 }), 1);
  assert.equal(swipeDirection(start, { x: 180, y: 90 }), -1);
  assert.equal(swipeDirection(start, { x: 80, y: 100 }), 0);
  assert.equal(swipeDirection(start, { x: 160, y: 200 }), 0);
});

test('swiping suppresses the image link click; cancelled and ignored gestures do not navigate', () => {
  const handlers = {};
  const directions = [];
  onSwipe({ addEventListener: (name, handler) => { handlers[name] = handler; } },
    direction => directions.push(direction), { ignore: target => target === 'chip' });
  const down = target => handlers.pointerdown({ isPrimary: true, button: 0, pointerId: 1, clientX: 100, clientY: 100, target });
  const up = () => handlers.pointerup({ pointerId: 1, clientX: 10, clientY: 100 });
  down('image');
  up();
  let prevented = false;
  handlers.click({ isTrusted: false, preventDefault: () => { prevented = true; }, stopPropagation() {} });
  assert.equal(prevented, false);
  handlers.click({ isTrusted: true, preventDefault: () => { prevented = true; }, stopPropagation() {} });
  assert.equal(prevented, true);
  down('image');
  handlers.pointercancel();
  up();
  down('chip');
  up();
  assert.deepEqual(directions, [1]);
});

test('paper follows horizontal movement and returns when the drag is too short', () => {
  const handlers = {};
  const moves = [];
  const releases = [];
  onSwipe({ addEventListener: (name, handler) => { handlers[name] = handler; } },
    () => assert.fail('short drags must not turn the page'), {
      onDrag: dx => moves.push(dx),
      onRelease: committed => releases.push(committed),
    });
  handlers.pointerdown({ isPrimary: true, button: 0, pointerId: 1, clientX: 100, clientY: 100 });
  handlers.pointermove({ pointerId: 1, clientX: 100, clientY: 140 });
  assert.deepEqual(moves, []);
  handlers.pointermove({ pointerId: 1, clientX: 70, clientY: 100 });
  handlers.pointerup({ pointerId: 1, clientX: 70, clientY: 100 });
  assert.deepEqual(moves, [-30]);
  assert.deepEqual(releases, [false]);
});
