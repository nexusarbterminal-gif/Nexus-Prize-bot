const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;
const MINT_ADDRESS = process.env.MINT_ADDRESS;
const DECIMALS = parseInt(process.env.DECIMALS) || 9;

const connection = new Connection("https://rpc.ankr.com/solana", "confirmed");

async function postTopHolders() {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID || !MINT_ADDRESS) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  try {
    console.log(`Fetching top holders for: ${MINT_ADDRESS}`);

    const mintPubKey = new PublicKey(MINT_ADDRESS);
    const largestAccounts = await connection.getTokenLargestAccounts(mintPubKey);

    if (!largestAccounts?.value || largestAccounts.value.length === 0) {
      throw new Error("No token accounts found for this mint address.");
    }

    const top10 = largestAccounts.value.slice(0, 10).map(acc => ({
      address: acc.address.toBase58(),
      amount: acc.uiAmount || (Number(acc.amount) / Math.pow(10, DECIMALS))
    }));

    const medals = ['🥇', '🥈', '🥉'];
    const holderLines = top10.map((h, i) => {
      const rank = medals[i] || `${i + 1}.`;
      const addr = `${h.address.slice(0, 4)}...${h.address.slice(-4)}`;
      const bal = h.amount.toLocaleString();
      return `${rank} <code>${addr}</code> — ${bal} NEXUS`;
    }).join('\n');

    const now = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full' });

    const messageText =
      `🏆 <b>NEXUS Daily Top 10 Holders</b> 🏆\n` +
      `<i>${now}</i>\n\n` +
      `${holderLines}\n\n` +
      `<i>CA: <code>${MINT_ADDRESS}</code></i>\n` +
      `#NEXUS #Solana #NexusTrade`;

    console.log("Posting top 10 to Telegram...");

    const response = await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      chat_id: TG_CHAT_ID,
      text: messageText,
      parse_mode: 'HTML'
    });

    if (!response.data.ok) {
      throw new Error(`Telegram error: ${JSON.stringify(response.data)}`);
    }

    console.log("Done! Top 10 posted.");

  } catch (err) {
    if (err.response) {
      console.error("API Error:", JSON.stringify(err.response.data));
    }
    console.error("Error:", err.message || err);
    process.exit(1);
  }
}

postTopHolders();
