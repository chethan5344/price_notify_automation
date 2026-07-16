# Price Notify Automation

This project scrapes the Bangalore Refinery rate page, compares the latest values against the previous run, and sends a Telegram notification when any tracked price changes.

## Features

- Fetches the current gold, platinum, and silver prices from the target page
- Stores the previously seen values in a local cache file
- Sends a Telegram message only when prices change
- Runs on a schedule through GitHub Actions

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a local environment file if you want to test notifications locally:
   ```bash
   cp .env.example .env
   ```
   Then add your Telegram credentials:
   ```env
   TELEGRAM_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

3. Run the scraper:
   ```bash
   npm start
   ```

## GitHub Actions

This repository includes a workflow in [.github/workflows/price-notify.yml](.github/workflows/price-notify.yml) that runs every 30 minutes and can also be triggered manually.

### Required GitHub Secrets

Add these secrets in your repository settings:

- TELEGRAM_TOKEN
- TELEGRAM_CHAT_ID

## Notes

- The cache file is stored in the cache directory and is ignored by git.
- The workflow uses npm caching for faster installs.
