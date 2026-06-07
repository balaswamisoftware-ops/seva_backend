import QRCode from 'qrcode';
import { OrgSettings } from '../org/orgSettings.model';
import { labeledLines } from './receipt.builder';

export interface DonationReceiptPayload {
  type: 'DONATION';
  width: 58 | 80;
  columns: number;
  alignment: 'left' | 'center' | 'right';
  fontSize: 'small' | 'normal' | 'large';
  org: { name: string; address: string; contact: string; gst: string; logoUrl?: string };
  receiptHeader: string;
  printLogo: boolean;
  printQrCode: boolean;
  qrDataUrl?: string;
  donation: {
    receiptNumber: string;
    bookingNumber: string;
    donationId: string;
    purpose: string;
    eventName?: string;
    devoteeName: string;
    mobileNumber?: string;
    panNumber?: string;
    amount: number;
    paymentMode: string;
    transactionRef?: string;
    is80GEligible: boolean;
    soldByName: string;
    soldAt: string | Date;
  };
  footer: { thankYou: string; quote: string; custom: string };
  lineSpacing: number;
}

export async function buildDonationReceipt(donation: any): Promise<DonationReceiptPayload> {
  const org = (await OrgSettings.findOne()) ?? (await OrgSettings.create({ orgName: 'Spiritual Organization' }));
  const columns = org.printerWidth === 80 ? 48 : 32;

  // QR removed from receipts per product decision.
  const qrDataUrl: string | undefined = undefined;

  return {
    type: 'DONATION',
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
    donation: {
      receiptNumber: donation.receiptNumber,
      bookingNumber: donation.bookingNumber,
      donationId: donation.donationId,
      purpose: donation.purpose,
      eventName: donation.eventName,
      devoteeName: donation.devoteeName,
      mobileNumber: donation.mobileNumber,
      panNumber: donation.panNumber,
      amount: Number(donation.amount),
      paymentMode: donation.paymentMode,
      transactionRef: donation.transactionRef,
      is80GEligible: !!donation.is80GEligible,
      soldByName: donation.soldByName,
      soldAt: donation.soldAt,
    },
    footer: {
      thankYou: org.thankYouMessage ?? '',
      quote: org.spiritualQuote ?? '',
      custom: org.receiptFooter ?? '',
    },
    lineSpacing: org.lineSpacing ?? 1,
  };
}

// Text rendering helpers (same as seva receipt, but with DONATION header)
const center = (s: string, w: number) => {
  if (s.length >= w) return s.slice(0, w);
  const pad = Math.floor((w - s.length) / 2);
  return ' '.repeat(pad) + s + ' '.repeat(w - s.length - pad);
};
const line = (w: number, ch = '-') => ch.repeat(w);
const kv = (k: string, v: string, w: number) => {
  const space = w - k.length - v.length;
  return space > 0 ? `${k}${' '.repeat(space)}${v}` : `${k}: ${v}`;
};
const wrap = (s: string, w: number) => {
  const out: string[] = []; const words = (s || '').split(/\s+/); let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > w) { if (cur) out.push(cur); cur = word; } else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) out.push(cur);
  return out;
};

export function renderDonationReceiptText(p: DonationReceiptPayload): string {
  const w = p.columns;
  const out: string[] = [];
  out.push(center(p.org.name, w));
  if (p.org.address) wrap(p.org.address, w).forEach((l) => out.push(center(l, w)));
  if (p.org.contact) out.push(center(`Ph: ${p.org.contact}`, w));
  if (p.org.gst)     out.push(center(`GST: ${p.org.gst}`, w));
  if (p.receiptHeader) wrap(p.receiptHeader, w).forEach((l) => out.push(center(l, w)));
  out.push(line(w));
  out.push(center('DONATION RECEIPT', w));
  if (p.donation.is80GEligible) out.push(center('(80G Eligible)', w));
  out.push(line(w));
  out.push(kv('Receipt', p.donation.receiptNumber, w));
  out.push(kv('Donation', p.donation.donationId, w));
  out.push(kv('Date', new Date(p.donation.soldAt).toLocaleString('en-IN'), w));
  out.push(line(w));
  labeledLines('Purpose', p.donation.purpose,    w, 7).forEach((l) => out.push(l));
  if (p.donation.eventName)    labeledLines('Event', p.donation.eventName,    w, 7).forEach((l) => out.push(l));
  labeledLines('Name',    p.donation.devoteeName, w, 7).forEach((l) => out.push(l));
  if (p.donation.mobileNumber) labeledLines('Mob',   p.donation.mobileNumber, w, 7).forEach((l) => out.push(l));
  if (p.donation.panNumber)    labeledLines('PAN',   p.donation.panNumber,    w, 7).forEach((l) => out.push(l));
  out.push(line(w));
  out.push(kv('Amount', '₹' + p.donation.amount.toFixed(2), w));
  out.push(kv('Payment', p.donation.paymentMode, w));
  if (p.donation.transactionRef) out.push(kv('Ref', p.donation.transactionRef, w));
  out.push(line(w));
  out.push(`Received By: ${p.donation.soldByName}`);
  out.push(line(w));
  if (p.donation.is80GEligible) {
    out.push(center('Tax-exempt under Section 80G', w));
  }
  if (p.footer.thankYou) out.push(center(p.footer.thankYou, w));
  if (p.footer.quote)    out.push(center(p.footer.quote, w));
  if (p.footer.custom)   wrap(p.footer.custom, w).forEach((l) => out.push(center(l, w)));
  return out.join('\n');
}

/**
 * Build an 80G certificate payload (A4 format) — for PDF generation / email.
 * This is a formal tax document, not a thermal receipt.
 */
export async function render80GCertificate(donation: any) {
  const org = await OrgSettings.findOne();
  if (!org) throw new Error('Org settings not configured');

  const fy = financialYear(new Date(donation.soldAt));
  const inWords = numberToIndianWords(Math.floor(donation.amount));

  return {
    type: '80G_CERTIFICATE',
    certNumber: donation.cert80GNumber ?? '(not yet issued)',
    issued: donation.cert80GIssued,
    financialYear: fy,
    org: {
      name: org.orgName,
      address: org.address ?? '',
      contact: org.contactNumber ?? '',
      email: org.email ?? '',
      pan: org.gstNumber ?? '', // store org PAN here or add a dedicated field
      logoUrl: org.logoUrl,
      // NOTE: a real implementation must also store the org's 80G registration number and date
    },
    donor: {
      name: donation.devoteeName,
      address: donation.address ?? '',
      pan: donation.panNumber ?? '',
      mobile: donation.mobileNumber,
    },
    donation: {
      receiptNumber: donation.receiptNumber,
      donationId: donation.donationId,
      date: donation.soldAt,
      purpose: donation.purpose,
      amount: Number(donation.amount),
      amountInWords: inWords,
      paymentMode: donation.paymentMode,
      transactionRef: donation.transactionRef,
    },
    issuedDate: new Date(),
  };
}

function financialYear(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

/** Indian numbering system: lakhs / crores */
function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const twoDigit = (n: number): string =>
    n < 20 ? a[n] : (b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ''));
  const threeDigit = (n: number): string => {
    const h = Math.floor(n / 100), r = n % 100;
    return (h ? a[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoDigit(r) : '');
  };
  const cr = Math.floor(num / 10000000);
  const lk = Math.floor((num % 10000000) / 100000);
  const th = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;
  let str = '';
  if (cr) str += threeDigit(cr) + ' Crore ';
  if (lk) str += threeDigit(lk) + ' Lakh ';
  if (th) str += threeDigit(th) + ' Thousand ';
  if (rest) str += threeDigit(rest);
  return str.trim() + ' Rupees Only';
}
