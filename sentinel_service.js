import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { ethers } from 'ethers';

/**
 * Sentinel Service (updated)
 * - Generates sentinel commits (salt + keccak256)
 * - Tracks PoolCreated where this service is the sentinel
 * - Auto-reveals before sentinelRevealDeadline - REVEAL_SAFETY_SECONDS
 * - Persists salts to disk (salts.json)
 * - Extra endpoints: /commit, /import, /status, /schedule/:poolId, /salts
 */

// ---------- ENV ----------
const RPC_URL = process.env.RPC_URL;
const VAULT = process.env.VAULT_ADDRESS;
const PK = process.env.PRIVATE_KEY;
const CHAIN_ID = Number(process.env.CHAIN_ID || 8453); // Base mainnet default
const DATA_DIR = process.env.DATA_DIR || './data';
const PORT = Number(process.env.PORT || 8787);
const REVEAL_SAFETY_SECONDS = Number(process.env.REVEAL_SAFETY_SECONDS || 60);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // 'info' | 'debug' | 'warn' | 'error'

// ---------- Minimal ABI ----------
// Includes PoolCreated, pools(), revealSentinel(). (createPool struct not needed here.)
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
  try {
    if (!fs.existsSync(storePath)) return { commits: {}, pools: {} };
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    // ensure shape
    return { commits: parsed.commits || {}, pools: parsed.pools || {} };
  } catch {
    return { commits: {}, pools: {} };
  }
}
function saveStore(db) {
  fs.writeFileSync(storePath, JSON.stringify(db, null, 2));
}

const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
const wallet = new ethers.Wallet(PK, provider);
const contract = new ethers.Contract(VAULT, VAULT_ABI, wallet);

let DB = loadStore(); // { commits: { [commitHashLower]: { saltHex, poolId?, revealed?:true, label? } }, pools: { [poolId]: commitHashLower } }

// ---------- Helpers ----------
function log(level, ...args) {
  const levels = ['debug','info','warn','error'];
  if (levels.indexOf(level) >= levels.indexOf(LOG_LEVEL)) {
    console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](`[${level}]`, ...args);
  }
}
function isHex32(s) {
  return typeof s === 'string' && /^0x[0-9a-fA-F]{64}$/.test(s);
}
function randomSalt32() {
  return ethers.hexlify(ethers.randomBytes(32));
}
function commitOf(saltHex) {
  return ethers.keccak256(ethers.getBytes(saltHex)).toLowerCase();
}
async function getNowTs() {
  const b = await provider.getBlock('latest');
  return Number(b?.timestamp ?? Math.floor(Date.now()/1000));
}

// ---------- Auto-reveal engine ----------
async function scheduleOrReveal(poolId) {
  try {
    const p = await contract.pools(poolId);
    const sentinelAddr = String(p[12] || '').toLowerCase();
    if (!sentinelAddr || sentinelAddr === '0x0000000000000000000000000000000000000000') return;
    if (sentinelAddr !== wallet.address.toLowerCase()) return;

    const sentinelCommitHash = String(p[11]).toLowerCase();
    const revealTs = Number(p[4]); // sentinelRevealDeadline
    const revealed = Boolean(p[17]); // sentinelRevealed

    const entry = DB.commits[sentinelCommitHash];
    if (!entry) {
      log('warn', `[pool ${poolId}] No salt found for sentinelCommitHash ${sentinelCommitHash}`);
      DB.pools[String(poolId)] = sentinelCommitHash;
      saveStore(DB);
      return;
    }

    DB.pools[String(poolId)] = sentinelCommitHash;
    saveStore(DB);

    if (revealed) {
      DB.commits[sentinelCommitHash].revealed = true;
      DB.commits[sentinelCommitHash].poolId = Number(poolId);
      saveStore(DB);
      log('info', `[pool ${poolId}] Already revealed.`);
      return;
    }

    const now = await getNowTs();
    const eta = Math.max(revealTs - REVEAL_SAFETY_SECONDS - now, 0);
    if (eta === 0) {
      try {
        const tx = await contract.revealSentinel(poolId, entry.saltHex);
        log('info', `[pool ${poolId}] revealSentinel submitted: ${tx.hash}`);
        const rcpt = await tx.wait();
        log('info', `[pool ${poolId}] revealSentinel confirmed in block ${rcpt.blockNumber}`);
        DB.commits[sentinelCommitHash].revealed = true;
        DB.commits[sentinelCommitHash].poolId = Number(poolId);
        saveStore(DB);
      } catch (e) {
        log('error', `[pool ${poolId}] revealSentinel error:`, e?.message || e);
      }
    } else {
      log('info', `[pool ${poolId}] Scheduling reveal in ~${eta}s (deadline ${revealTs})`);
      setTimeout(() => scheduleOrReveal(poolId).catch(()=>{}), eta * 1000);
    }
  } catch (e) {
    log('error', `scheduleOrReveal error for pool ${poolId}:`, e?.message || e);
  }
}

// Watch PoolCreated events and react if we are the sentinel
function attachPoolCreatedListener() {
  contract.on("PoolCreated", async (poolId, creator, deadline, revealDeadline, sentinelRevealDeadline, maxEntries, minEntries, entryPrice, builderFeeBps, protocolFeeBps, hasSentinel) => {
    try {
      const pId = Number(poolId);
      const has = Boolean(hasSentinel);
      if (!has) return;
      const p = await contract.pools(pId);
      const sentAddr = String(p[12]).toLowerCase();
      if (sentAddr !== wallet.address.toLowerCase()) return;

      const sentCommit = String(p[11]).toLowerCase();
      if (!DB.commits[sentCommit]) {
        log('warn', `[pool ${pId}] WARNING: creator used unknown sentinelCommitHash ${sentCommit}`);
      }
      DB.pools[String(pId)] = sentCommit;
      saveStore(DB);

      log('info', `[pool ${pId}] Tracked. Scheduling reveal...`);
      scheduleOrReveal(pId);
    } catch (e) {
      log('error', 'PoolCreated handler error:', e?.message || e);
    }
  });
}

// ---------- HTTP API ----------
const app = express();
app.use(express.json());

// Mint a new sentinel commit
app.get('/commit', (_req, res) => {
  try {
    const saltHex = randomSalt32();
    const commit = commitOf(saltHex);
    DB.commits[commit] = { saltHex, createdAt: Date.now() };
    saveStore(DB);
    res.json({ sentinelAddress: wallet.address, sentinelCommitHash: commit, saltBytes32: saltHex });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Import an existing commit + salt (e.g., migrated from another box)
app.post('/import', (req, res) => {
  try {
    const { saltBytes32, label } = req.body || {};
    if (!isHex32(saltBytes32)) return res.status(400).json({ error: 'saltBytes32 must be 0x-prefixed 32-byte hex' });
    const commit = commitOf(saltBytes32);
    DB.commits[commit] = { saltHex: saltBytes32, label, importedAt: Date.now() };
    saveStore(DB);
    res.json({ ok: true, sentinelCommitHash: commit });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Manual schedule trigger for a specific pool
app.post('/schedule/:poolId', async (req, res) => {
  const poolId = Number(req.params.poolId);
  if (!Number.isFinite(poolId) || poolId <= 0) return res.status(400).json({ error: 'invalid poolId' });
  try {
    await scheduleOrReveal(poolId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Status page
app.get('/status', async (_req, res) => {
  try {
    const now = await getNowTs();
    res.json({
      address: wallet.address,
      chainId: CHAIN_ID,
      vault: VAULT,
      trackedCommits: Object.keys(DB.commits).length,
      trackedPools: Object.keys(DB.pools).length,
      now
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Export salts (DO NOT EXPOSE PUBLICLY IN PRODUCTION)
app.get('/salts', (_req, res) => {
  res.json(DB);
});

async function main() {
  if (!ethers.isAddress(VAULT)) {
    console.error('VAULT_ADDRESS is not a valid address');
    process.exit(1);
  }
  if (!ethers.isHexString(PK, 32)) {
    console.error('PRIVATE_KEY must be 0x-prefixed 32-byte hex');
    process.exit(1);
  }

  console.log(`Sentinel address: ${wallet.address}`);
  console.log(`Connected to chainId=${CHAIN_ID}. Vault=${VAULT}`);

  // Attach listener
  attachPoolCreatedListener();

  // Start server
  app.listen(PORT, () => {
    console.log(`Sentinel HTTP listening on :${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGINT', () => { console.log('SIGINT received, exiting.'); process.exit(0); });
process.on('SIGTERM', () => { console.log('SIGTERM received, exiting.'); process.exit(0); });

main().catch((e) => { console.error(e); process.exit(1); });
