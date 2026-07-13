'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  FilePlus2,
  Loader2,
  Mail,
  MessageSquareText,
  Plus,
  ReceiptText,
  Send,
  Tags,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  sendFinanceInvoice,
  type FinanceInvoiceTag,
  type SendFinanceInvoiceInput,
} from '@/app/(dashboard)/finance-hub/actions';

type InvoiceLineDraft = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

const defaultRecipientEmail = 'tax@rermedapps.com';
const invoiceTags: Array<{ value: FinanceInvoiceTag; title: string; description: string; tone: string }> = [
  {
    value: 'Expenses',
    title: 'Expenses',
    description: 'Normal business expense invoice',
    tone: 'rose',
  },
  {
    value: 'Other expenses',
    title: 'Other Expenses',
    description: 'Non-standard or one-off cost',
    tone: 'violet',
  },
];

function todayIsoDate() {
  return format(new Date(), 'yyyy-MM-dd');
}

function createInvoiceNumber() {
  return `INV-${format(new Date(), 'yyyyMMdd')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function createEmptyLine(id: string): InvoiceLineDraft {
  return {
    id,
    description: '',
    quantity: '1',
    unitPrice: '',
  };
}

function parseMoney(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(amount: number, currency: 'USD' | 'LKR') {
  const prefix = currency === 'LKR' ? 'Rs ' : '$';
  return `${prefix}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function invoiceTotal(invoice: SendFinanceInvoiceInput) {
  return invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

type CreateInvoiceDialogProps = {
  trigger?: React.ReactNode;
  recipientEmail?: string;
};

export function CreateInvoiceDialog({ trigger, recipientEmail = defaultRecipientEmail }: CreateInvoiceDialogProps = {}) {
  const [open, setOpen] = React.useState(false);
  const [invoiceToConfirm, setInvoiceToConfirm] = React.useState<SendFinanceInvoiceInput | null>(null);
  const [invoiceNo, setInvoiceNo] = React.useState(() => createInvoiceNumber());
  const [vendorName, setVendorName] = React.useState('');
  const [invoiceDate, setInvoiceDate] = React.useState(() => todayIsoDate());
  const [dueDate, setDueDate] = React.useState('');
  const [currency, setCurrency] = React.useState<'USD' | 'LKR'>('LKR');
  const [tag, setTag] = React.useState<FinanceInvoiceTag>('Expenses');
  const [remark, setRemark] = React.useState('');
  const [lines, setLines] = React.useState<InvoiceLineDraft[]>(() => [createEmptyLine('line-1')]);
  const [isSending, setIsSending] = React.useState(false);
  const nextLineId = React.useRef(2);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const total = React.useMemo(
    () => lines.reduce((sum, line) => sum + parseMoney(line.quantity) * parseMoney(line.unitPrice), 0),
    [lines]
  );

  const resetForm = React.useCallback(() => {
    nextLineId.current = 2;
    setInvoiceNo(createInvoiceNumber());
    setVendorName('');
    setInvoiceDate(todayIsoDate());
    setDueDate('');
    setCurrency('LKR');
    setTag('Expenses');
    setRemark('');
    setLines([createEmptyLine('line-1')]);
    setInvoiceToConfirm(null);
  }, []);

  const addLine = () => {
    const id = `line-${nextLineId.current}`;
    nextLineId.current += 1;
    setLines((current) => [...current, createEmptyLine(id)]);
  };

  const removeLine = (id: string) => {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  };

  const updateLine = (id: string, patch: Partial<InvoiceLineDraft>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const buildPayload = (): SendFinanceInvoiceInput | null => {
    const preparedLines = lines
      .filter((line) => line.description.trim() || line.unitPrice.trim())
      .map((line) => ({
        description: line.description.trim(),
        quantity: parseMoney(line.quantity),
        unitPrice: parseMoney(line.unitPrice),
      }));

    if (!invoiceNo.trim() || !vendorName.trim() || !invoiceDate) {
      toast({
        title: 'Missing invoice details',
        description: 'Invoice number, vendor, and invoice date are required.',
        variant: 'destructive',
      });
      return null;
    }

    if (!preparedLines.length || preparedLines.some((line) => !line.description || line.quantity <= 0 || line.unitPrice < 0)) {
      toast({
        title: 'Check line items',
        description: 'Add at least one valid line with description, quantity, and amount.',
        variant: 'destructive',
      });
      return null;
    }

    if (preparedLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) <= 0) {
      toast({
        title: 'Invoice total is zero',
        description: 'Add an amount before sending the invoice.',
        variant: 'destructive',
      });
      return null;
    }

    return {
      invoiceNo: invoiceNo.trim(),
      vendorName: vendorName.trim(),
      invoiceDate,
      dueDate: dueDate || undefined,
      currency,
      tag,
      remark: remark.trim() || undefined,
      lines: preparedLines,
    };
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSending) {
      setInvoiceToConfirm(null);
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    setInvoiceToConfirm(payload);
  };

  const handleConfirmSend = async () => {
    if (!invoiceToConfirm) return;

    setIsSending(true);
    const idToken = await getToken();
    const result = await sendFinanceInvoice(invoiceToConfirm, idToken);
    setIsSending(false);

    if (result.error) {
      toast({
        title: 'Invoice send failed',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Invoice sent',
      description: `Sent to ${result.recipient || recipientEmail}.`,
    });
    setInvoiceToConfirm(null);
    setOpen(false);
    resetForm();
  };

  const selectedTag = invoiceTags.find((item) => item.value === tag) || invoiceTags[0];

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-11 rounded-full border border-emerald-300/25 bg-gradient-to-r from-emerald-400 to-cyan-300 px-5 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_18px_38px_rgba(16,185,129,0.18)] hover:from-emerald-300 hover:to-cyan-200">
            <FilePlus2 className="h-4 w-4" />
            Create Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-hidden rounded-[2rem] border-white/10 bg-[#090A0F] p-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] sm:max-w-6xl">
        <DialogHeader className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.13] text-emerald-200">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black italic tracking-tight text-white">Create Invoice</DialogTitle>
              <DialogDescription className="mt-1 text-white/45">
                Build a clean invoice and send it to the tax mailbox.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid max-h-[calc(92vh-96px)] overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5 border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Invoice No</label>
                <Input
                  value={invoiceNo}
                  onChange={(event) => setInvoiceNo(event.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] font-bold text-white"
                  placeholder="INV-20260703-1001"
                  disabled={isSending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Vendor / Payee</label>
                <Input
                  value={vendorName}
                  onChange={(event) => setVendorName(event.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] font-bold text-white"
                  placeholder="Vendor name"
                  disabled={isSending}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Invoice Date</label>
                <Input
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  type="date"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] font-bold text-white"
                  disabled={isSending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Due Date</label>
                <Input
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  type="date"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] font-bold text-white"
                  disabled={isSending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Currency</label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as 'USD' | 'LKR')} disabled={isSending}>
                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.04] font-bold text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LKR">LKR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                <Tags className="h-3.5 w-3.5" />
                Tax Tag
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {invoiceTags.map((item) => {
                  const active = item.value === tag;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={isSending}
                      onClick={() => setTag(item.value)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60',
                        active
                          ? item.tone === 'rose'
                            ? 'border-rose-300/40 bg-rose-400/[0.14] shadow-[0_16px_38px_rgba(244,63,94,0.13)]'
                            : 'border-violet-300/40 bg-violet-400/[0.14] shadow-[0_16px_38px_rgba(139,92,246,0.13)]'
                          : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]'
                      )}
                    >
                      <span className="block text-sm font-black text-white">{item.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-white/42">{item.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Line Items</p>
                  <p className="mt-1 text-xs font-semibold text-white/35">Add invoice rows one by one.</p>
                </div>
                <Button type="button" onClick={addLine} disabled={isSending} className="h-9 rounded-full bg-white text-xs font-black uppercase tracking-widest text-black hover:bg-white/90">
                  <Plus className="h-4 w-4" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-2">
                <div className="hidden grid-cols-[minmax(0,1fr)_86px_122px_116px_38px] gap-2 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/28 md:grid">
                  <span>Description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Total</span>
                  <span />
                </div>
                {lines.map((line) => {
                  const lineTotal = parseMoney(line.quantity) * parseMoney(line.unitPrice);
                  return (
                    <div key={line.id} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[minmax(0,1fr)_86px_122px_116px_38px] md:items-center">
                      <Input
                        value={line.description}
                        onChange={(event) => updateLine(line.id, { description: event.target.value })}
                        className="h-10 min-w-0 rounded-xl border-white/10 bg-black/20 text-sm font-semibold text-white"
                        placeholder="Description"
                        disabled={isSending}
                      />
                      <Input
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-10 rounded-xl border-white/10 bg-black/20 text-right text-sm font-semibold text-white"
                        placeholder="1"
                        disabled={isSending}
                      />
                      <Input
                        value={line.unitPrice}
                        onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-10 rounded-xl border-white/10 bg-black/20 text-right text-sm font-semibold text-white"
                        placeholder="0.00"
                        disabled={isSending}
                      />
                      <div className="flex h-10 items-center justify-end rounded-xl bg-black/20 px-3 text-sm font-black italic text-white/80">
                        {formatMoney(lineTotal, currency)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.id)}
                        disabled={isSending || lines.length === 1}
                        className="h-10 w-10 rounded-xl text-white/45 hover:bg-rose-500/15 hover:text-rose-200"
                        aria-label="Remove invoice line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                <MessageSquareText className="h-3.5 w-3.5" />
                Remark
              </div>
              <Textarea
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                className="min-h-[96px] rounded-2xl border-white/10 bg-white/[0.04] text-sm font-semibold text-white placeholder:text-white/25"
                placeholder="Add tax note, payment method, or approval remark..."
                disabled={isSending}
              />
            </div>
          </div>

          <div className="bg-[#0D0D11] p-6">
            <div className="sticky top-0 space-y-4">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-white/55">
                <Mail className="h-4 w-4 text-emerald-300" />
                Sending to <span className="text-white">{recipientEmail}</span>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] bg-white text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
                <div className="bg-slate-950 px-6 py-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">RER MedApps</p>
                      <h3 className="mt-2 text-3xl font-black italic tracking-tight">Invoice</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{invoiceNo || 'INV-0000'}</p>
                      <p className="mt-1 text-xs font-semibold text-white/55">{invoiceDate || todayIsoDate()}</p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'mt-5 inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white',
                      tag === 'Expenses' ? 'bg-rose-500' : 'bg-violet-500'
                    )}
                  >
                    {selectedTag.title}
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Vendor</p>
                      <p className="mt-2 truncate text-base font-black">{vendorName || 'Vendor name'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Mailbox</p>
                      <p className="mt-2 truncate text-base font-black">{recipientEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {lines.map((line, index) => {
                      const lineTotal = parseMoney(line.quantity) * parseMoney(line.unitPrice);
                      return (
                        <div key={`preview-${line.id}`} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0">
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{index + 1}</div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">{line.description || 'Line item description'}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {parseMoney(line.quantity) || 0} x {formatMoney(parseMoney(line.unitPrice), currency)}
                            </p>
                          </div>
                          <p className="text-right text-sm font-black italic">{formatMoney(lineTotal, currency)}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-3xl bg-slate-950 p-5 text-white">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                      <span>Total</span>
                      <span>{currency}</span>
                    </div>
                    <p className="mt-2 text-right text-3xl font-black italic tracking-tight">{formatMoney(total, currency)}</p>
                  </div>

                  {remark.trim() && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Remark</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{remark}</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-3 sm:space-x-0">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSending} className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSending} className="h-11 rounded-xl bg-emerald-400 px-5 font-black text-black hover:bg-emerald-300">
                  <Send className="h-4 w-4" />
                  Send Invoice
                </Button>
              </DialogFooter>
            </div>
          </div>
        </form>
        <AlertDialog
          open={Boolean(invoiceToConfirm)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !isSending) {
              setInvoiceToConfirm(null);
            }
          }}
        >
          <AlertDialogContent className="max-h-[92vh] overflow-hidden rounded-[2rem] border-white/10 bg-[#090A0F] p-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.6)] sm:max-w-4xl">
            <AlertDialogHeader className="border-b border-white/10 bg-white/[0.035] px-6 py-5 text-left">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.12] text-cyan-100">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <AlertDialogTitle className="text-xl font-black italic tracking-tight text-white">Confirm Invoice Before Sending</AlertDialogTitle>
                  <AlertDialogDescription className="mt-1 text-white/45">
                    Review every detail below. The email will be sent only after confirmation.
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            {invoiceToConfirm && (
              <div className="max-h-[calc(92vh-178px)] overflow-y-auto px-6 py-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Invoice No</p>
                    <p className="mt-2 break-words text-sm font-black text-white">{invoiceToConfirm.invoiceNo}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Vendor</p>
                    <p className="mt-2 break-words text-sm font-black text-white">{invoiceToConfirm.vendorName}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Invoice Date</p>
                    <p className="mt-2 text-sm font-black text-white">{invoiceToConfirm.invoiceDate}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Due Date</p>
                    <p className="mt-2 text-sm font-black text-white">{invoiceToConfirm.dueDate || 'Not set'}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Tax Tag</p>
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white',
                        invoiceToConfirm.tag === 'Expenses' ? 'bg-rose-500' : 'bg-violet-500'
                      )}
                    >
                      {invoiceToConfirm.tag === 'Expenses' ? 'Expenses' : 'Other Expenses'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Recipient</p>
                    <p className="mt-2 break-words text-sm font-black text-white">{recipientEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.10] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/65">Final Total</p>
                    <p className="mt-2 text-right text-2xl font-black italic tracking-tight text-emerald-100">
                      {formatMoney(invoiceTotal(invoiceToConfirm), invoiceToConfirm.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                  <div className="hidden grid-cols-[42px_minmax(0,1fr)_72px_112px_126px] gap-2 border-b border-white/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/35 md:grid">
                    <span>#</span>
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                    <span className="text-right">Line Total</span>
                  </div>
                  <div className="divide-y divide-white/10">
                    {invoiceToConfirm.lines.map((line, index) => (
                      <div key={`${line.description}-${index}`} className="px-4 py-4 text-sm">
                        <div className="hidden grid-cols-[42px_minmax(0,1fr)_72px_112px_126px] gap-2 md:grid">
                          <span className="font-black text-white/45">{index + 1}</span>
                          <span className="min-w-0 break-words font-bold text-white">{line.description}</span>
                          <span className="text-right font-bold text-white/70">{line.quantity}</span>
                          <span className="text-right font-bold text-white/70">{formatMoney(line.unitPrice, invoiceToConfirm.currency)}</span>
                          <span className="text-right font-black italic text-white">{formatMoney(line.quantity * line.unitPrice, invoiceToConfirm.currency)}</span>
                        </div>
                        <div className="space-y-3 md:hidden">
                          <div className="flex items-start gap-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white/55">{index + 1}</span>
                            <p className="min-w-0 flex-1 break-words font-bold text-white">{line.description}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 rounded-xl bg-black/20 p-3 text-xs font-bold text-white/65">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Qty</p>
                              <p className="mt-1 text-white">{line.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Rate</p>
                              <p className="mt-1 text-white">{formatMoney(line.unitPrice, invoiceToConfirm.currency)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">Total</p>
                              <p className="mt-1 font-black italic text-white">{formatMoney(line.quantity * line.unitPrice, invoiceToConfirm.currency)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Remark</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-white/75">
                    {invoiceToConfirm.remark || 'No remark added.'}
                  </p>
                </div>
              </div>
            )}

            <AlertDialogFooter className="gap-3 border-t border-white/10 bg-white/[0.03] px-6 py-5 sm:space-x-0">
              <AlertDialogCancel disabled={isSending} className="h-11 rounded-xl border-white/10 bg-white/[0.04] px-5 text-white/70 hover:bg-white/10 hover:text-white">
                Back to Edit
              </AlertDialogCancel>
              <Button type="button" onClick={handleConfirmSend} disabled={isSending || !invoiceToConfirm} className="h-11 rounded-xl bg-emerald-400 px-5 font-black text-black hover:bg-emerald-300">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSending ? 'Sending...' : 'Confirm & Send'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
