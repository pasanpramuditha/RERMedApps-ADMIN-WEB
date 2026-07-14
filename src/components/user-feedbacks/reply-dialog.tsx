
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Feedback } from '@/app/(dashboard)/user-feedbacks/data';
import { DialogClose } from '@radix-ui/react-dialog';
import { translateText } from '@/ai/flows/translate-flow';
import { draftReply } from '@/ai/flows/draft-reply-flow';
import { Spinner } from '../ui/spinner';
import { getAppReplyKnowledge, sendReply } from '@/app/(dashboard)/user-feedbacks/actions';
import Image from 'next/image';
import { Languages, Mail, MessageSquareText, MonitorSmartphone, Send, Smartphone, Wand2 } from 'lucide-react';

interface ReplyDialogProps {
  feedback: Feedback;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReplyDialog({ feedback, isOpen, onOpenChange }: ReplyDialogProps) {
  const [reply, setReply] = React.useState('');
  const [translatedFeedback, setTranslatedFeedback] = React.useState<string | null>(null);
  const [translatedReply, setTranslatedReply] = React.useState('');
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [isTranslatingReply, setIsTranslatingReply] = React.useState(false);
  const [isDrafting, setIsDrafting] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();
  
  const needsTranslation = feedback.languageCode.toUpperCase() !== 'EN' && feedback.languageCode.toUpperCase() !== 'N/A';
  const sendButtonText = needsTranslation ? `Send ${feedback.languageCode} Reply` : 'Send Reply';

  const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : String(error);
  };

  React.useEffect(() => {
    if (isOpen) {
        // Reset states on open
        setReply('');
        setTranslatedFeedback(null);
        setTranslatedReply('');
        if (needsTranslation) {
            const getTranslation = async () => {
                setIsTranslating(true);
                try {
                const result = await translateText({ text: feedback.feedback, sourceLanguage: feedback.languageCode, targetLanguage: 'EN' });
                setTranslatedFeedback(result.translation);
                } catch (error) {
                const message = getErrorMessage(error);
                console.error("Translation failed:", error);
                setTranslatedFeedback(`Could not translate feedback. ${message}`);
                toast({ title: 'Translation Error', description: message, variant: 'destructive' });
                } finally {
                setIsTranslating(false);
                }
            };
            getTranslation();
        }
    }
  }, [isOpen, needsTranslation, feedback.feedback, feedback.languageCode]);

  const handleDraftReply = async () => {
    setIsDrafting(true);
    try {
        const contentToDraftFrom = translatedFeedback || feedback.feedback;
        const operatorDraft = reply.trim();
        const { knowledge } = await getAppReplyKnowledge(feedback.appName, feedback.platform);
        const result = await draftReply({
          feedback: contentToDraftFrom,
          feedbackLanguage: 'English',
          appName: feedback.appName,
          platform: feedback.platform,
          appContext: knowledge?.app_context,
          commonRules: knowledge?.common_rules || undefined,
          knownLimitations: knowledge?.known_limitations || undefined,
          replyTone: knowledge?.reply_tone || undefined,
          maxReplyChars: knowledge?.max_reply_chars || undefined,
          operatorDraft: operatorDraft || undefined,
        });
        setReply(result.reply);
        setTranslatedReply('');
    } catch (error) {
        toast({ title: 'Draft Reply Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
        setIsDrafting(false);
    }
  }

  const handleTranslateReply = async () => {
    if (!reply.trim()) return;

    setIsTranslatingReply(true);
    try {
        const translationResult = await translateText({ text: reply, sourceLanguage: 'EN', targetLanguage: feedback.languageCode });
        setTranslatedReply(translationResult.translation);
    } catch (error) {
        toast({ title: 'Translation Error', description: getErrorMessage(error), variant: 'destructive'});
    } finally {
        setIsTranslatingReply(false);
    }
  };

  const handleSendReply = async () => {
    setIsSending(true);
    const finalReply = needsTranslation ? translatedReply : reply;

    const result = await sendReply(feedback.id, feedback.appId, feedback.email, finalReply);
    
    if (result.error) {
       toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
        toast({
            title: result.warning ? 'Reply Sent, Notification Not Queued' : 'Reply Sent',
            description: result.warning || `Your reply to ${feedback.email} has been sent and a feedback notification was queued.`,
            variant: result.warning ? 'destructive' : undefined,
        });
        setReply('');
        setTranslatedReply('');
        onOpenChange(false);
        window.dispatchEvent(new Event('user-feedbacks:refresh'));
    }
    setIsSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="h-[88vh] max-h-[820px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-white/10 bg-card/95 p-0 shadow-2xl sm:max-w-4xl">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.12] to-transparent" />
          <div className="flex flex-col gap-4 pr-8">
            <div className="relative flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-400/25 bg-sky-500/[0.15] text-sky-100">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
              <DialogTitle className="text-xl">Reply to Feedback</DialogTitle>
              <DialogDescription>
                Review the message and send a response to the user.
              </DialogDescription>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="h-9 gap-2 rounded-xl border-white/10 bg-white/[0.05] px-2.5 text-foreground">
                <Image src={feedback.appIcon} alt={feedback.appName} width={22} height={22} className="rounded" data-ai-hint="app icon" />
                <span className="max-w-[180px] truncate">{feedback.appName}</span>
              </Badge>
              <Badge variant="outline" className="h-9 gap-2 rounded-xl border-white/10 bg-white/[0.05] px-2.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="max-w-[260px] truncate text-foreground">{feedback.email}</span>
              </Badge>
              <Badge
                variant="outline"
                className={`h-9 gap-2 rounded-xl px-2.5 ${
                  feedback.platform === 'iOS'
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                }`}
              >
                {feedback.platform === 'iOS' ? <Smartphone className="h-3.5 w-3.5" /> : <MonitorSmartphone className="h-3.5 w-3.5" />}
                {feedback.platform}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold">Original Feedback</Label>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.05] px-2.5">{feedback.languageCode}</Badge>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-foreground shadow-inner">
              {feedback.feedback}
            </div>
          </section>

          {needsTranslation && (
            <section className="space-y-2">
              <Label className="text-sm font-semibold">Translated to English</Label>
              <div className="rounded-2xl border border-white/10 bg-background/70 p-4 text-sm leading-6">
                {isTranslating ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner size="small" />
                    <span>Translating...</span>
                  </div>
                ) : (
                  translatedFeedback || 'Could not translate feedback.'
                )}
              </div>
            </section>
          )}

          <section className="flex min-h-[260px] flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="reply-message" className="text-sm font-semibold">Your Reply</Label>
                <p className="text-xs text-muted-foreground">Type your rough answer first, then draft will polish it. Leave blank to draft from feedback.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDraftReply} disabled={isDrafting || isTranslating || isSending} className="rounded-xl border-white/10 bg-white/[0.04]">
                <Wand2 className="h-4 w-4" />
                {isDrafting ? 'Drafting...' : 'Draft Reply'}
              </Button>
            </div>

            <Textarea
              id="reply-message"
              value={reply}
              onChange={(e) => {
                setReply(e.target.value);
                setTranslatedReply('');
              }}
              placeholder="Type your reply..."
              className="min-h-[220px] flex-1 resize-none rounded-2xl border-white/10 bg-background/80 p-4 text-sm leading-6 focus-visible:ring-1 focus-visible:ring-primary"
              disabled={isSending || isDrafting}
            />
          </section>

          {needsTranslation && (
            <section className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="translated-reply-message" className="text-sm font-semibold">
                    Reply in {feedback.languageCode}
                  </Label>
                  <p className="text-xs text-muted-foreground">Translate the English reply before sending it to the user.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTranslateReply}
                  disabled={!reply.trim() || isTranslatingReply || isSending || isDrafting}
                  className="rounded-xl border-white/10 bg-white/[0.04]"
                >
                  {isTranslatingReply ? <Spinner size="small" /> : <Languages className="h-4 w-4" />}
                  {isTranslatingReply ? 'Translating...' : `Translate to ${feedback.languageCode}`}
                </Button>
              </div>
              <Textarea
                id="translated-reply-message"
                value={translatedReply}
                readOnly
                placeholder={`Translated ${feedback.languageCode} reply will appear here...`}
                className="min-h-[120px] resize-none rounded-2xl border-white/10 bg-black/20 p-4 text-sm leading-6 text-foreground shadow-inner focus-visible:ring-0"
              />
            </section>
          )}
        </div>

        <DialogFooter className="border-t border-white/10 bg-background/95 px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSending} className="rounded-xl border-white/10">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSendReply} disabled={isSending || (needsTranslation ? !translatedReply.trim() : !reply.trim())} className="rounded-xl bg-blue-600 text-white hover:bg-blue-500">
            {isSending ? (
              <>
                <Spinner size="small" />
                Sending
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {sendButtonText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
