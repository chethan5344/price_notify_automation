const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizePrice,
  parsePrices,
  hasChanged,
  buildNotificationMessage,
} = require('../scrapper');

test('normalizePrice trims and collapses whitespace', () => {
  assert.equal(normalizePrice('  ₹ 1,200   '), '₹ 1,200');
});

test('parsePrices extracts the tracked values from HTML', () => {
  const html = `
    <table>
      <tr><td>24K (9999) 10 g GoldBar</td><td>₹ 3,500</td></tr>
      <tr><td>999 Platinum 10g Bar</td><td>₹ 1,200</td></tr>
      <tr><td>Silver 1 kg Bar</td><td>₹ 95,000</td></tr>
      <tr><td>Silver 250 g</td><td>₹ 24,500</td></tr>
    </table>
  `;

  const parsed = parsePrices(html);
  assert.deepEqual(parsed, {
    gold: '₹ 3,500',
    platinum: '₹ 1,200',
    silver1kg: '₹ 95,000',
    silver250g: '₹ 24,500',
  });
});

test('hasChanged detects when prices differ', () => {
  const prev = {
    gold: '₹ 3,500',
    platinum: '₹ 1,200',
    silver1kg: '₹ 95,000',
    silver250g: '₹ 24,500',
  };
  const next = {
    gold: '₹ 3,600',
    platinum: '₹ 1,200',
    silver1kg: '₹ 95,000',
    silver250g: '₹ 24,500',
  };

  assert.equal(hasChanged(prev, next), true);
  assert.equal(hasChanged(prev, prev), false);
});

test('buildNotificationMessage formats a Telegram message', () => {
  const message = buildNotificationMessage({
    gold: '₹ 3,500',
    platinum: '₹ 1,200',
    silver1kg: '₹ 95,000',
    silver250g: '₹ 24,500',
  });

  assert.match(message, /Gold 24K \(10g\): ₹ 3,500/);
  assert.match(message, /Silver \(250g\): ₹ 24,500/);
});
