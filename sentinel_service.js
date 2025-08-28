import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { ethers } from 'ethers';

// ---------- ENV ----------
const RPC_URL = process.env.RPC_URL;
const VAULT = process.env.VAULT_ADDRESS;
const PK = process.env.PRIVATE_KEY;
const CHAIN_ID = Number(process.env.CHAIN_ID || 8453);
const DATA_DIR = process.env.DATA_DIR || './data';
const PORT = Number(process.env.PORT || 8787);
const REVEAL_SAFETY_SECONDS = Number(process.env.REVEAL_SAFETY_SECONDS || 60);

// ---------- Minimal ABI ----------
const VAULT_ABI = [
  // events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "poolId","type": "uint256"},
      {"indexed": true,"internalType": "address","name": "creator","type": "address"},
      {"indexed": false,"internalType": "uint64","name": "deadline","type": "uint64"},
      {"indexed": false,"internalType": "uint64","name": "revealDeadline","type": "uint64"},
      {"indexed": false,"internalType": "uint64","name": "sentinelRevealDeadline","type": "uint64"},
      {"indexed": false,"internalType": "uint32","name": "maxEntries","type": "uint32"},
      {"indexed": false,"internalType": "uint32","name": "minEntries","type": "uint32"},
      {"indexed": false,"internalType": "uint96","name": "entryPrice","type": "uint96"},
      {"indexed": false,"internalType": "uint16","name": "builderFeeBps","type": "uint16"},
      {"indexed": false,"internalType": "uint16","name": "protocolFeeBps","type": "uint16"},
      {"indexed": false,"internalType": "bool","name": "hasSentinel","type": "bool"}
    ],
    "name": "PoolCreated",
    "type": "event"
  },
  // reads
  {
    "inputs": [{"internalType":"uint256","name":"poolId","type":"uint256"}],
    "name": "pools",
    "outputs": [
      {"internalType":"address","name":"creator","type":"address"},
      {"internalType":"address","name":"builderFeeRecipient","type":"address"},
      {"internalType":"uint64","name":"deadline","type":"uint64"},
      {"internalType":"uint64","name":"revealDeadline","type":"uint64"},
      {"internalType":"uint64","name":"sentinelRevealDeadline","type":"uint64"},
      {"internalType":"uint32","name":"maxEntries","type":"uint32"},
      {"internalType":"uint32","name":"minEntries","type":"uint32"},
      {"internalType":"uint96","name":"entryPrice","type":"uint96"},
      {"internalType":"uint16","name":"builderFeeBps","type":"uint16"},
      {"internalType":"uint16","name":"protocolFeeBps","type":"uint16"},
      {"internalType":"bytes32","name":"creatorCommitHash","type":"bytes32"},
      {"internalType":"bytes32","name":"sentinelCommitHash","type":"bytes32"},
      {"internalType":"address","name":"sentinel","type":"address"},
      {"internalType":"uint96","name":"creatorBond","type":"uint96"},
      {"internalType":"uint96","name":"sentinelBond","type":"uint96"},
      {"internalType":"uint32","name":"entries","type":"uint32"},
      {"internalType":"bool","name":"creatorRevealed","type":"bool"},
      {"internalType":"bool","name":"sentinelRevealed","type":"bool"},
      {"internalType":"bool","name":"drawn","type":"bool"},
      {"internalType":"bool","name":"canceled","type":"bool"},
      {"internalType":"address","name":"winner","type":"address"},
      {"internalType":"bytes32","name":"_creatorSalt","type":"bytes32"},
      {"internalType":"bytes32","name":"_sentinelSalt","type":"bytes32"},
      {"internalType":"uint128","name":"grossCollected","type":"uint128"}
    ],
    "stateMutability":"view","type":"function"
  },
  // writes
  {
    "inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"bytes32","name":"salt","type":"bytes32"}],
    "name":"revealSentinel","outputs":[],"stateMutability":"nonpayable","type":"function"
  }
];

// ---------- Setup ----------
if (!RPC_URL || !VAULT || !PK) {
  console.error("Missing RPC_URL, VAULT_ADDRESS or PRIVATE_KEY in env");
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const storePath = path.join(DATA_DIR, 'salts.json');

function loadStore() {
  if (!fs.existsSync(storePath)) return {};
  try { return JSON.parse(fs.readFileSync(storePath, 'utf8')); } catch { return {}; }
}
function saveStore(db) {
  fs.writeFileSync(storePath, JSON.stringify(db, null, 2));
}

const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
const wallet = new ethers.Wallet(PK, provider);
const contract = new ethers.Contract(VAULT, VAULT_ABI, wallet);

let DB = loadStore(); // { [commitHashLower]: { saltHex, poolId?, revealed?:true } }

// ---------- Helpers ----------
function randomSalt32() {
  // 32 bytes random; return 0x-prefixed hex
  return ethers.hexlify(ethers.randomBytes(32));
}
function commitOf(saltHex) {
  return ethers.keccak256(ethers.getBytes(saltHex)).toLowerCase();
}
async function getNowTs() {
  const b = await provider.getBlock('latest');
  return Number(b.timestamp);
}

// ---------- Auto-reveal engine ----------
async function scheduleOrReveal(poolId) {
  const p = await contract.pools(poolId);
  const sentinel = (p[12]).toLowerCase();
  if (sentinel !== wallet.address.toLowerCase()) return;

  const sentinelCommitHash = String(p[11]).toLowerCase();
  const revealTs = Number(p[4]); // sentinelRevealDeadline
  const revealed = Boolean(p[17]); // sentinelRevealed

  const entry = DB[sentinelCommitHash];
  if (!entry) {
    console.warn(`[pool ${poolId}] No salt found for sentinelCommitHash ${sentinelCommitHash}`);
    return;
  }

  if (revealed) {
    DB[sentinelCommitHash].revealed = true;
    DB[sentinelCommitHash].poolId = Number(poolId);
    saveStore(DB);
    console.log(`[pool ${poolId}] Already revealed.`);
    return;
  }

  const now = await getNowTs();
  const eta = Math.max(revealTs - REVEAL_SAFETY_SECONDS - now, 0);
  if (eta === 0) {
    // reveal now
    try {
      const tx = await contract.revealSentinel(poolId, entry.saltHex);
      console.log(`[pool ${poolId}] revealSentinel submitted: ${tx.hash}`);
      const rcpt = await tx.wait();
      console.log(`[pool ${poolId}] revealSentinel confirmed in block ${rcpt.blockNumber}`);
      DB[sentinelCommitHash].revealed = true;
      DB[sentinelCommitHash].poolId = Number(poolId);
      saveStore(DB);
    } catch (e) {
      console.error(`[pool ${poolId}] revealSentinel error:`, e.message);
    }
  } else {
    console.log(`[pool ${poolId}] Scheduling reveal in ~${eta}s (deadline ${revealTs})`);
    setTimeout(() => scheduleOrReveal(poolId), eta * 1000);
  }
}

// Watch PoolCreated events and react if we are the sentinel
contract.on("PoolCreated", async (poolId, creator, deadline, revealDeadline, sentinelRevealDeadline, maxEntries, minEntries, entryPrice, builderFeeBps, protocolFeeBps, hasSentinel) => {
  try {
    const pId = Number(poolId);
    const p = await contract.pools(pId);
    const has = Boolean(hasSentinel);
    if (!has) return;

    const sentAddr = String(p[12]).toLowerCase();
    if (sentAddr !== wallet.address.toLowerCase()) return;

    const sentCommit = String(p[11]).toLowerCase();
    if (!DB[sentCommit]) {
      console.warn(`[pool ${pId}] WARNING: creator used unknown sentinelCommitHash ${sentCommit}`);
      // We still try to schedule; but we cannot reveal without salt
    } else {
      DB[sentCommit].poolId = pId;
      saveStore(DB);
    }
    console.log(`[pool ${pId}] Tracked. Scheduling reveal...`);
    scheduleOrReveal(pId);
  } catch (e) {
    console.error('PoolCreated handler error:', e.message);
  }
});

// ---------- HTTP API ----------
const app = express();
app.get('/commit', (req, res) => {
  try {
    const label = (req.query.label || '').toString();
    const saltHex = randomSalt32();
    const commit = commitOf(saltHex);
    DB[commit] = { saltHex, label, createdAt: Date.now() };
    saveStore(DB);
    // Creator will put `sentinelCommitHash = commit` in createPool()
    res.json({ sentinelAddress: wallet.address, sentinelCommitHash: commit, saltBytes32: saltHex });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/status', async (_req, res) => {
  res.json({ address: wallet.address, trackedCommits: Object.keys(DB).length });
});

async function main() {
  const arg = process.argv[2];
  if (arg === 'new-commit') {
    const saltHex = randomSalt32();
    const commit = commitOf(saltHex);
    DB[commit] = { saltHex, createdAt: Date.now() };
    saveStore(DB);
    console.log(JSON.stringify({ sentinelAddress: wallet.address, sentinelCommitHash: commit, saltBytes32: saltHex }, null, 2));
    process.exit(0);
  }
  console.log(`Sentinel address: ${wallet.address}`);
  console.log(`Listening on :${PORT} ...`);
  app.listen(PORT);
}

main().catch((e) => { console.error(e); process.exit(1); });
