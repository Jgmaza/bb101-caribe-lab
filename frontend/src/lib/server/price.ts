import "server-only";

// Tasa XLM→COP de CoinGecko (precio de mainnet: en testnet es solo una referencia).
// Caché en memoria de 60 s. Si CoinGecko falla, se usa la última tasa conocida hasta por
// una hora; después la operación falla en vez de inventar un precio.
// Cada pago, recarga y retiro guarda la tasa con la que se hizo (se congela).

const URL = "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=cop";
const FRESH_MS = 60_000;
const STALE_MS = 60 * 60_000;

let cached: { rate: number; at: number } | undefined;
let inflight: Promise<number> | undefined;

async function fetchRate(): Promise<number> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  const res = await fetch(URL, { headers, cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`CoinGecko respondió ${res.status}`);
  const rate = Number((await res.json())?.stellar?.cop);
  if (!(rate > 0)) throw new Error("CoinGecko no devolvió la tasa XLM/COP");
  return rate;
}

/** Pesos colombianos por 1 XLM. */
export async function getCopPerXlm(): Promise<number> {
  const now = Date.now();
  if (cached && now - cached.at < FRESH_MS) return cached.rate;

  inflight ??= fetchRate().finally(() => {
    inflight = undefined;
  });
  try {
    const rate = await inflight;
    cached = { rate, at: Date.now() };
    return rate;
  } catch (err) {
    if (cached && now - cached.at < STALE_MS) {
      console.error("Usando la última tasa XLM/COP conocida:", err);
      return cached.rate;
    }
    throw new Error("No pudimos consultar el precio en pesos. Intenta de nuevo en un momento.");
  }
}

/** Igual que getCopPerXlm pero null si no hay tasa (para mostrar "no disponible"). */
export async function tryCopPerXlm(): Promise<number | null> {
  try {
    return await getCopPerXlm();
  } catch {
    return null;
  }
}
