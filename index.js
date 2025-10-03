import 'dotenv/config';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true })

await bot.setMyCommands(
    [
        { command: 'help', description: 'Usage instructions' }
    ],
    // (optional) only show on private chats
    { scope: { type: 'all_private_chats' } }
);

const helpMessage =
    `Welcome to currency converter bot.

Usage instructions:
/usd <amount> <target_currency>

Example:
/usd 100 eur

Supported codes: All in floatrates.com
`
const currency = "usd";

async function getUsdRates(targetCurr) {
    const sourceURL = `https://www.floatrates.com/daily/${currency}.json`

    const { data } = await axios.get(sourceURL, { timeout: 10_000 })

    return data[targetCurr]
}

function parseUsdCommand(text) {
    // /usd 100 eur
    const parts = text.trim().split(/\s+/);

    // parts[0] = /usd command
    const amount = parseFloat(parts[1]);
    const targetCurr = (parts[2] || "").toLowerCase();

    if (isNaN(amount) || !targetCurr) return null;
    return { amount, targetCurr };
}

bot.onText(/^\/start$/i, (msg) => {
    bot.sendMessage(msg.chat.id, helpMessage);
});
bot.onText(/^\/help$/i, (msg) => {
    bot.sendMessage(msg.chat.id, helpMessage);
});

bot.onText(/^\/usd(?:\s+.*)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match?.input || msg.text;

    const parsed = parseUsdCommand(text);
    if (!parsed) {
        return bot.sendMessage(chatId, "Incorrect command, please see /help.")
    }

    const { amount, targetCurr } = parsed;

    try {
        const currency_info = await getUsdRates(targetCurr);
        const entry = currency_info;

        if (!entry) {
            return bot.sendMessage(chatId, `Invalid currency code: ${targetCurr.toUpperCase()}`)
        }

        const result = amount * entry.rate;
        const reply = `💵 ${amount} ${currency.toUpperCase()} = ${result.toFixed(2)} ${targetCurr.toUpperCase()}

Currency: 1 USD = ${entry.rate.toFixed(2)} ${targetCurr}
Source: FloatRates.com`

        bot.sendMessage(chatId, reply);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "⚠️ Couldn't reach currency data at this moment, please try again.");
    }
});

console.log('Currency Converter Bot is Running…');
