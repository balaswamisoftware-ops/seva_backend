import net from 'net';
import { renderReceiptText, type ReceiptPayload } from '../printing/receipt.builder';

// --- ESC/POS encoding ------------------------------------------------------
// Most cheap thermal printers don't have a glyph for ₹ (U+20B9). Map it to
// "Rs." so the receipt is legible everywhere. Also drop other non-ASCII to
// avoid blank squares.
function sanitizeForEscPos(text: string): string {
  return text
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x00-\x7F]/g, '?'); // keep printable ASCII
}

// ESC @  (1B 40)      printer initialise
// ESC d  (1B 64 n)    feed n lines
// GS V 0 (1D 56 00)   full cut
export function buildEscPosBytes(text: string, opts: { cut?: boolean; feed?: number } = {}): Buffer {
  const init = Buffer.from([0x1b, 0x40]);
  const body = Buffer.from(sanitizeForEscPos(text), 'ascii');
  const newline = Buffer.from([0x0a]);
  const feed = opts.feed && opts.feed > 0 ? Buffer.from([0x1b, 0x64, opts.feed & 0xff]) : Buffer.alloc(0);
  const cut = opts.cut ? Buffer.from([0x1d, 0x56, 0x00]) : Buffer.alloc(0);
  return Buffer.concat([init, body, newline, feed, cut]);
}

// --- NETWORK transport: open TCP socket, write, close ----------------------
export interface NetworkPrintOptions {
  host: string;
  port: number;
  bytes: Buffer;
  timeoutMs?: number;
}

export function sendToNetworkPrinter({ host, port, bytes, timeoutMs = 5000 }: NetworkPrintOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch { /* ignore */ }
      err ? reject(err) : resolve();
    };
    sock.setTimeout(timeoutMs);
    sock.once('error', (e) => finish(e));
    sock.once('timeout', () => finish(new Error(`Timed out connecting to ${host}:${port}`)));
    sock.connect(port, host, () => {
      sock.write(bytes, (err) => {
        if (err) return finish(err);
        // Give the printer a beat to chew through the buffer before we close.
        setTimeout(() => finish(), 150);
      });
    });
  });
}

// --- AGENT_USB transport: POST to the local print-agent --------------------
export async function sendToAgent(
  agentUrl: string,
  payload: any,
  agentKey?: string,
): Promise<void> {
  const url = agentUrl.replace(/\/+$/, '') + '/print';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(agentKey ? { 'x-agent-key': agentKey } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Print agent rejected: ${res.status} ${detail}`);
  }
  const data: any = await res.json().catch(() => ({}));
  if (data && data.ok === false) throw new Error(data.error ?? 'Agent print failed');
}

// --- High-level dispatcher --------------------------------------------------
export interface DispatchResult { method: 'network' | 'agent'; via: string }

export async function dispatchPrint(
  printer: any,
  receipt: ReceiptPayload,
): Promise<DispatchResult> {
  if (printer.type === 'NETWORK') {
    if (!printer.ipAddress) throw new Error('Network printer has no ipAddress');
    const text = renderReceiptText(receipt);
    const bytes = buildEscPosBytes(text, { feed: 3, cut: true });
    await sendToNetworkPrinter({
      host: printer.ipAddress,
      port: printer.port || 9100,
      bytes,
    });
    return { method: 'network', via: `${printer.ipAddress}:${printer.port || 9100}` };
  }

  if (printer.type === 'AGENT_USB') {
    if (!printer.agentUrl) throw new Error('Agent printer has no agentUrl');
    // The existing print-agent expects the receipt payload shape it always
    // has — forward it as-is so we don't need any agent change.
    await sendToAgent(printer.agentUrl, receipt, printer.agentKey);
    return { method: 'agent', via: printer.agentUrl };
  }

  throw new Error(`Unsupported printer type: ${printer.type}`);
}
