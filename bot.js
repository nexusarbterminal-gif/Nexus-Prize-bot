const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;
const MINT_ADDRESS = process.env.MINT_ADDRESS;
const DECIMALS = parseInt(process.env.DECIMALS) || 9;

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function postTopHolders() {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID || !MINT_ADDRESS) {
    console.error("❌ Missing required environment variables.");
    process.exit(1);
  }

  try {
    console.log(`📡 Fetching top holders for: ${MINT_ADDRESS}`);

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
      return `${rank} \`${addr}\` — ${bal} NEXUS`;
    }).join('\n');

    const now = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full' });

    const messageText =
      `🏆 *NEXUS Daily Top 10 Holders* 🏆\n` +
      `_${now}_\n\n` +
      `${holderLines}\n\n` +
      `_CA: \`${MINT_ADDRESS}\`_\n` +
      `#NEXUS #Solana #NexusTrade`;

    console.log("✉️ Posting top 10 to Telegram...");

    await axios.post(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      chat_id: TG_CHAT_ID,
      text: messageText,
      parse_mode: 'Markdown'
    });

    console.log("✅ Done! Top 10 posted.");

  } catch (err) {
    console.error("❌ Error:", err.message || err);
    process.exit(1);
  }
}

postTopHolders();
