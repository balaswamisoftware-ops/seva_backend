import { Printer } from './printer.model';
import { Ticket } from '../tickets/ticket.model';
import { buildReceiptPayload } from '../printing/receipt.builder';
import { dispatchPrint, buildEscPosBytes, sendToNetworkPrinter } from './printer.transport';
import { NotFound, BadRequest } from '../../utils/errors';

// Only one printer can be the default; clear the flag on others when needed.
async function clearOtherDefaults(exceptId?: string) {
  const filter: any = { isDefault: true };
  if (exceptId) filter._id = { $ne: exceptId };
  await Printer.updateMany(filter, { $set: { isDefault: false } });
}

export async function createPrinter(input: any, createdBy?: string) {
  if (input.isDefault) await clearOtherDefaults();
  const doc = await Printer.create({ ...input, createdBy });
  return doc.toJSON();
}

export async function updatePrinter(id: string, input: any, updatedBy?: string) {
  const printer = await Printer.findById(id);
  if (!printer) throw NotFound('Printer not found');
  if (input.isDefault) await clearOtherDefaults(id);
  Object.assign(printer, input, { updatedBy });
  await printer.save();
  return printer.toJSON();
}

export async function deletePrinter(id: string) {
  const printer = await Printer.findById(id);
  if (!printer) throw NotFound('Printer not found');
  await printer.deleteOne();
  return { success: true };
}

export async function listPrinters() {
  return Printer.find().sort({ isDefault: -1, name: 1 });
}

export async function getDefaultPrinter() {
  return Printer.findOne({ isDefault: true, status: 'ACTIVE' });
}

export async function getPrinter(id: string) {
  const printer = await Printer.findById(id);
  if (!printer) throw NotFound('Printer not found');
  return printer;
}

// Resolve which printer to use for this job. Explicit id wins; otherwise the
// active default. Throws if neither is available so the caller can fall back
// to the agent / browser path.
async function resolvePrinter(printerId?: string) {
  if (printerId) {
    const p = await Printer.findById(printerId);
    if (!p) throw NotFound('Printer not found');
    if (p.status !== 'ACTIVE') throw BadRequest('Printer is INACTIVE');
    return p;
  }
  const def = await getDefaultPrinter();
  if (!def) throw BadRequest('No default printer configured');
  return def;
}

// Render a ticket → receipt payload → ESC/POS → printer. Used by both the
// frontend's "Print" button and any other receipt-emitting flow.
export async function printTicket(ticketId: string, printerId?: string) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw NotFound('Ticket not found');
  const printer = await resolvePrinter(printerId);
  const receipt = await buildReceiptPayload(ticket);
  const result = await dispatchPrint(printer, receipt);
  // Mark printed (fire-and-forget)
  Ticket.updateOne({ _id: ticket._id }, { $set: { printed: true, printedAt: new Date() } }).catch(() => {});
  return { ...result, printerId: String(printer._id), printerName: printer.name };
}

// "Test print" sends a one-line hello to verify connectivity.
export async function testPrint(printerId: string) {
  const printer = await getPrinter(printerId);
  if (printer.type === 'NETWORK') {
    if (!printer.ipAddress) throw BadRequest('Network printer has no ipAddress');
    const text = [
      '*** PRINTER TEST ***',
      `Name: ${printer.name}`,
      `When: ${new Date().toLocaleString('en-IN')}`,
      '',
      'If you can read this, the',
      'connection is working.',
      '',
    ].join('\n');
    const bytes = buildEscPosBytes(text, { feed: 4, cut: true });
    await sendToNetworkPrinter({
      host: printer.ipAddress,
      port: printer.port || 9100,
      bytes,
    });
    return { ok: true, method: 'network' as const };
  }
  // AGENT_USB: ask the agent for status — simpler than crafting a ticket.
  if (!printer.agentUrl) throw BadRequest('Agent printer has no agentUrl');
  const url = printer.agentUrl.replace(/\/+$/, '') + '/status';
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`Agent not reachable (${res.status})`);
  return { ok: true, method: 'agent' as const };
}
