const fs = require('fs');
const path = require('path');

// Appending a dynamic timestamp forces the CDN to serve the absolute newest file
const TARGET_URL = `https://www.bangalorerefinery.com/cdn/shop/files/rates.txt?v=${Date.now()}`;
const CACHE_FILE = path.join(__dirname, 'cache', 'prices.json');

function normalizePrice(value) {
  if (!value) return 'N/A';
  return value.replace(/\s+/g, ' ').trim();
}

function parsePrices(rawData) {
  // Clean up their custom formatting wrapper so it parses as standard JSON array of arrays
  const cleanJsonString = rawData.replace(/\]\]/g, ']]').replace(/\]\[/g, '],[');
  
  let ratesArray = [];
  try {
    ratesArray = JSON.parse(cleanJsonString);
  } catch (error) {
    console.error('Failed to parse the rates text file. Format may have changed.', error.message);
    return { gold: 'N/A', platinum: 'N/A', silver1kg: 'N/A', silver250g: 'N/A' };
  }

  // Helper function to strip all spacing and casing for bulletproof matching
  const cleanKey = (str) => str.toLowerCase().replace(/\s+/g, '');

  const getPrice = (targetKeyFragment) => {
    const cleanedTarget = cleanKey(targetKeyFragment);
    const item = ratesArray.find(row => row[0] && cleanKey(row[0]).includes(cleanedTarget));
    return item ? normalizePrice(item[1]) : 'N/A';
  };

  return {
    gold: getPrice("24K(9999)10gGoldBar"),
    platinum: getPrice("999Platinum10gBar"),
    silver1kg: getPrice("Silver1kgBar"),
    silver250g: getPrice("999SilverBar250gm"), 
  };
}

function hasChanged(previousPrices, newPrices) {
  return JSON.stringify(previousPrices) !== JSON.stringify(newPrices);
}

function buildNotificationMessage(prices) {
  const formatPrice = (value) => {
    const cleanedValue = normalizePrice(value ?? '').replace(/^₹\s*/, '');
    if (cleanedValue === 'N/A') return 'N/A';

    const numericValue = Number(cleanedValue.replace(/,/g, ''));
    if (Number.isNaN(numericValue)) return cleanedValue;

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  return [
    '📊 Bangalore Refinery Rates Updated:',
    '',
    `🔸 Gold 24K (10g): ${formatPrice(prices.gold)}`,
    `🔹 Platinum (10g): ${formatPrice(prices.platinum)}`,
    `🪙 Silver (1kg): ${formatPrice(prices.silver1kg)}`,
    `🪙 Silver (250g): ${formatPrice(prices.silver250g)}`,
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
      throw new Error(`Failed to fetch rates data: ${response.status}`);
    }

    const rawData = await response.text();
    const prices = parsePrices(rawData);
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