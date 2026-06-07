import QRCode from 'qrcode';
import { OrgSettings } from '../org/orgSettings.model';

export interface ReceiptPayload {
  width: 58 | 80;
  columns: number;          // characters per line for monospace
  alignment: 'left' | 'center' | 'right';
  fontSize: 'small' | 'normal' | 'large';
  org: {
    name: string; address: string; contact: string; gst: string; logoUrl?: string;
  };
  receiptHeader: string;
  printLogo: boolean;
  printQrCode: boolean;
  qrDataUrl?: string;
  ticket: {
    receiptNumber: string;
    bookingNumber: string;
    ticketId: string;
    eventName: string;
    sevaName: string;
    devoteeName: string;
    mobileNumber?: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    paymentMode: string;
    soldByName: string;
    soldAt: Date;
  };
  footer: {
    thankYou: string;
    quote: string;
    custom: string;
  };
  lineSpacing: number;
}

/**
 * Build a structured receipt payload from a ticket + org settings.
 * Frontend can use this for browser printing; backend can convert to ESC/POS.
 */
export async function buildReceiptPayload(ticket: any): Promise<ReceiptPayload> {
  const org = (await OrgSettings.findOne()) ?? (await OrgSettings.create({ orgName: 'Spiritual Organization' }));
  const columns = org.printerWidth === 80 ? 48 : 32;

  // QR removed from receipts per product decision.
  const qrDataUrl: string | undefined = undefined;

  return {
    width: (org.printerWidth === 80 ? 80 : 58) as 58 | 80,
    columns,
    alignment: (org.textAlignment as any) ?? 'center',
    fontSize:  (org.fontSize as any) ?? 'normal',
    org: {
      name: org.orgName,
      address: org.address ?? '',
      contact: org.contactNumber ?? '',
      gst: org.gstNumber ?? '',
      logoUrl: org.printLogo ? org.logoUrl ?? undefined : undefined,
    },
    receiptHeader: org.receiptHeader ?? '',
    printLogo: !!org.printLogo,
    printQrCode: false,
    qrDataUrl,
    ticket: {
      receiptNumber: ticket.receiptNumber,
      bookingNumber: ticket.bookingNumber,
      ticketId: ticket.ticketId,
      eventName: ticket.eventName,
      sevaName: ticket.sevaName,
      devoteeName: ticket.devoteeName,
      mobileNumber: ticket.mobileNumber,
      quantity: ticket.quantity,
      unitPrice: Number(ticket.unitPrice),
      totalAmount: Number(ticket.totalAmount),
      paymentMode: ticket.paymentMode,
      soldByName: ticket.soldByName,
      soldAt: ticket.soldAt,
    },
    footer: {
      thankYou: org.thankYouMessage ?? '',
      quote: org.spiritualQuote ?? '',
      custom: org.receiptFooter ?? '',
    },
    lineSpacing: org.lineSpacing ?? 1,
  };
}

// --- Plain-text rendering (for browser preview / fallback printing) ---

const center = (s: string, w: number) => {
  if (s.length >= w) return s.slice(0, w);
  const pad = Math.floor((w - s.length) / 2);
  return ' '.repeat(pad) + s + ' '.repeat(w - s.length - pad);
};
const right = (s: string, w: number) => (s.length >= w ? s.slice(-w) : ' '.repeat(w - s.length) + s);
const line  = (w: number, ch = '-') => ch.repeat(w);
const wrap  = (s: string, w: number) => {
  const out: string[] = []; const words = s.split(/\s+/); let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > w) { if (cur) out.push(cur); cur = word; }
    else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) out.push(cur); return out;
};

const kv = (k: string, v: string, w: number) => {
  const space = w - k.length - v.length;
  return space > 0 ? `${k}${' '.repeat(space)}${v}` : `${k}: ${v}`;
};

// "Label : value..." — wraps value to printer width with continuation lines
// indented to align with the value column. labelPad is the padded label width
// (excluding the trailing ": "), e.g. 6 → "Label : value".
export const labeledLines = (label: string, value: string, w: number, labelPad = 6): string[] => {
  const prefix = `${label.padEnd(labelPad)}: `;
  const valueWidth = Math.max(8, w - prefix.length);
  const parts = wrap(value, valueWidth);
  if (parts.length === 0) return [`${prefix}`];
  return parts.map((p, i) => (i === 0 ? `${prefix}${p}` : `${' '.repeat(prefix.length)}${p}`));
};

export function renderReceiptText(p: ReceiptPayload): string {
  const w = p.columns;
  const out: string[] = [];
  // header
  out.push(center(p.org.name, w));
  if (p.org.address) wrap(p.org.address, w).forEach((l) => out.push(center(l, w)));
  if (p.org.contact) out.push(center(`Ph: ${p.org.contact}`, w));
  if (p.org.gst)     out.push(center(`GST: ${p.org.gst}`, w));
  if (p.receiptHeader) wrap(p.receiptHeader, w).forEach((l) => out.push(center(l, w)));
  out.push(line(w));
  out.push(center('SEVA RECEIPT', w));
  out.push(line(w));
  out.push(kv('Receipt', p.ticket.receiptNumber, w));
  out.push(kv('Booking', p.ticket.bookingNumber, w));
  out.push(kv('Date', new Date(p.ticket.soldAt).toLocaleString('en-IN'), w));
  out.push(line(w));
  labeledLines('Event', p.ticket.eventName,   w).forEach((l) => out.push(l));
  labeledLines('Seva',  p.ticket.sevaName,    w).forEach((l) => out.push(l));
  labeledLines('Name',  p.ticket.devoteeName, w).forEach((l) => out.push(l));
  if (p.ticket.mobileNumber) labeledLines('Mob', p.ticket.mobileNumber, w).forEach((l) => out.push(l));
  out.push(line(w));
  out.push(kv('Qty', String(p.ticket.quantity), w));
  out.push(kv('Unit Price', p.ticket.unitPrice.toFixed(2), w));
  out.push(kv('TOTAL', '₹' + p.ticket.totalAmount.toFixed(2), w));
  out.push(kv('Payment', p.ticket.paymentMode, w));
  out.push(line(w));
  out.push(`Sold By: ${p.ticket.soldByName}`);
  out.push(line(w));
  if (p.footer.thankYou) out.push(center(p.footer.thankYou, w));
  if (p.footer.quote)    out.push(center(p.footer.quote, w));
  if (p.footer.custom)   wrap(p.footer.custom, w).forEach((l) => out.push(center(l, w)));
  out.push('');
  return out.join('\n');
}
