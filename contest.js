const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');
const fs = require('fs');

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;
const MINT_ADDRESS = process.env.MINT_ADDRESS;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const DECIMALS = parseInt(process.env.DECIMALS) || 9;

const EXCLUDED = [
  '6HyvWR8zPy8WUDGTnwFcgU4nJnRxz2qJThjJCifeRnNH',
  'BxEabPd6tBB7WtNbVGNiDcB9Y8mosuJ8DaZcjvKeUwi6',
  'FtNYWPGtt25xmabUkgVzzHvJ97QaMA1wTGtCQqMXpQ3B',
  ...(process.env.EXCLUDED_ADDRESSES || '').split(',').map(a => a.trim()).filter(Boolean)
];

function getConnection() {
  if (HELIUS_API_KEY) {
    return new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, "confirmed");
  }
  return new Connection("https://api.mainnet-beta.solana.com", "confirmed");
}

async function announceWeeklyWinner() {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID || !MINT_ADDRESS) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync('contest.json', 'utf8'));
  if (!state.active) {
    console.log("Contest is not active. Skipping.");
    process.exit(0);
  }

  try {
    console.log("Fetching top holder for weekly winner...");

    const connection = getConnection();
    const mintPubKey = new PublicKey(MINT_ADDRESS);
    const largestAccounts = await connection.getTokenLargestAccounts(mintPubKey);

    if (!largestAccounts?.value || largestAccounts.value.length === 0) {
      throw new Error("No token accounts found.");
    }

    const winner = largestAccounts.value
      .map(acc => ({
        address: acc.address.toBase58(),
        amount: acc.uiAmount || (Number(acc.amount) / Math.pow(10, DECIMALS))
      }))
      .filter(acc => acc.amount >= 5000000 && !EXCLUDED.includes(acc.address))[0];

    if (!winner) {
      throw new Error("No qualifying holders found for weekly winner.");
    }

    const addr = `${winner.address.slice(0, 4)}...${winner.address.slice(-4)}`;
    const bal = winner.amount.toLocaleString();
    const now = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full' });

    const messageText =
      `🏆 <b>NEXUS WEEKLY TOP HOLDER CONTEST WINNER</b> 🏆\n\n` +
      `Congratulations to this week's top holder!\n\n` +
      `🥇 <b>Winner:</b> <code>${addr}</code>\n` +
      `💰 <b>Balance:</b> ${bal} NEXUS\n\n` +
      `📥 DM a team admin within 48 hours to claim your prize!\n\n` +
      `<i>${now}</i>\n` +
      `<i>CA: <code>${MINT_ADDRESS}</code></i>\n` +
      `#NEXUS #Solana #NexusTrade #WeeklyWinner`;

    console.log("Posting weekly winner to Telegram...");

    const response = await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      chat_id: TG_CHAT_ID,
      text: messageText,
      parse_mode: 'HTML'
    });

    if (!response.data.ok) {
      throw new Error(`Telegram error: ${JSON.stringify(response.data)}`);
    }

    console.log("Done! Weekly winner posted.");

  } catch (err) {
    if (err.response) console.error("API Error:", JSON.stringify(err.response.data));
    console.error("Error:", err.message || err);
    process.exit(1);
  }
}

announceWeeklyWinner();
