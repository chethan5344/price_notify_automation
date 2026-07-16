const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://www.bangalorerefinery.com/pages/todays-rates';
const CACHE_FILE = path.join(__dirname, 'cache', 'prices.json');

function normalizePrice(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function parsePrices(html) {
  const $ = cheerio.load(html);
  return {
    gold: normalizePrice($('td:contains("24K (9999) 10 g GoldBar")').next().text()),
    platinum: normalizePrice($('td:contains("999 Platinum 10g Bar")').next().text()),
    silver1kg: normalizePrice($('td:contains("Silver 1 kg Bar")').next().text()),
    silver250g: normalizePrice($('td:contains("Silver 250 g")').next().text()),
  };
}

function hasChanged(previousPrices, newPrices) {
  return JSON.stringify(previousPrices) !== JSON.stringify(newPrices);
}

function buildNotificationMessage(prices) {
  return [
    '📊 Bangalore Refinery Rates Updated:',
    '',
    `🔸 Gold 24K (10g): ${prices.gold}`,
    `🔹 Platinum (10g): ${prices.platinum}`,
    `🪙 Silver (1kg): ${prices.silver1kg}`,
    `🪙 Silver (250g): ${prices.silver250g}`,
  ].join('\n');
}

function loadCachedPrices() {
  if (!fs.existsSync(CACHE_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (error) {
    console.warn('Could not read cache file, starting fresh.', error.message);
    return {};
  }
}

function saveCachedPrices(prices) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(prices, null, 2));
}

async function sendTelegramNotification(message) {
  const botToken = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('Telegram credentials are not configured. Skipping notification.');
    return;
  }

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });

  if (!response.ok) {
    throw new Error(`Telegram request failed with status ${response.status}`);
  }
}

async function scrapeAndNotify() {
  try {
    const response = await fetch(TARGET_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch rates page: ${response.status}`);
    }

    const html = await response.text();
    const prices = parsePrices(html);
    const previousPrices = loadCachedPrices();

    if (!hasChanged(previousPrices, prices)) {
      console.log('No price changes detected.');
      return;
    }

    const message = buildNotificationMessage(prices);
    console.log('Prices changed! Sending notification...\n', message);
    await sendTelegramNotification(message);
    saveCachedPrices(prices);
    console.log('Saved new prices to cache.');
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

if (require.main === module) {
  scrapeAndNotify();
}

module.exports = {
  normalizePrice,
  parsePrices,
  hasChanged,
  buildNotificationMessage,
  scrapeAndNotify,
};