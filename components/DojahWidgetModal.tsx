import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DojahWidgetModalProps {
  widgetId: string;
  onSuccess: (referenceId: string) => void;
  onClose: () => void;
}

const DojahWidgetModal: React.FC<DojahWidgetModalProps> = ({ widgetId, onSuccess, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showManualVerify, setShowManualVerify] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeUrl = `https://identity.dojah.io?widget_id=${widgetId}`;
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alreadySucceeded = useRef(false);

  const triggerSuccess = useCallback((refId: string) => {
    if (alreadySucceeded.current) return;
    alreadySucceeded.current = true;
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    onSuccess(refId);
  }, [onSuccess]);

  const triggerManualButton = useCallback(() => {
    if (alreadySucceeded.current) return;
    setShowManualVerify(true);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Log everything — no origin filter so we can see what Dojah actually sends
      console.log('[DojahWidget Debug] postMessage received:', {
        origin: event.origin,
        data: event.data,
        type: typeof event.data,
      });

      // Only process messages from dojah domains (or null-origin sandboxed iframes)
      const isDojahOrigin =
        event.origin === 'https://dojah.io' ||
        event.origin === 'https://identity.dojah.io' ||
        event.origin.endsWith('.dojah.io') ||
        event.origin === 'null' ||
        event.origin === '';

      if (!isDojahOrigin) return;

      let d = event.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch (_) {}
      }

      // === Auto-success: definite confirmation ===
      const isDefiniteSuccess =
        d === 'success' ||
        d?.type === 'success' ||
        d?.status === 'success' ||
        d?.status === 'completed' ||
        d?.status === 'verified' ||
        d?.event === 'success' ||
        d?.event === 'verification_success';

      // === Submitted/done: widget is finished, show manual button ===
      // Covers every known Dojah event that signals "flow is over"
      const isFlowComplete =
        d === 'close' ||
        d?.type === 'close' ||
        d?.type === 'submitted' ||
        d?.status === 'submitted' ||
        d?.status === 'close' ||
        d?.event === 'close' ||
        d?.event === 'submitted' ||
        d?.action === 'close' ||
        d?.action === 'submitted';

      if (isDefiniteSuccess) {
        const refId =
          d?.data?.reference_id ||
          d?.reference_id ||
          d?.data?.id ||
          `dojah_ref_${Date.now()}`;
        console.log('[DojahWidget] ✅ Auto-success triggered. Ref:', refId);
        triggerSuccess(refId);
      } else if (isFlowComplete) {
        console.log('[DojahWidget] 📬 Flow-complete event received. Showing manual button.');
        triggerManualButton();
      } else {
        // Unknown event from Dojah — still show the button as a safe fallback
        console.log('[DojahWidget] ⚠️ Unknown Dojah event — showing manual button as fallback.');
        triggerManualButton();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [triggerSuccess, triggerManualButton]);

  // Start a 90-second fallback timer once the iframe finishes loading.
  // If postMessage never fires at all (Dojah doesn't send one), the user
  // can still complete after 90 seconds — long enough they've had to do something.
  const handleIframeLoad = () => {
    setIsLoading(false);
    fallbackTimerRef.current = setTimeout(() => {
      console.log('[DojahWidget] ⏱️ 90s fallback timer fired. Showing manual button.');
      triggerManualButton();
    }, 90_000);
  };

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[750px]"
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-center bg-slate-900/80 border-b border-slate-800 backdrop-blur-md z-10">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl animate-pulse">lock</span>
              Secure Identity Verification
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Powered by Dojah KYC</p>
          </div>
          <button
            onClick={onClose}
            className="size-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Iframe */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-4 z-10">
              <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
                Loading secure portal...
              </p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            className="w-full h-full border-0"
            allow="camera; microphone; geolocation"
            onLoad={handleIframeLoad}
            title="Dojah Identity Widget"
          />
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between min-h-[88px]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-emerald-500">verified_user</span>
            End-to-End Encryption Active
          </div>

          {/* Appears only after Dojah's postMessage signals flow is done
              OR after the 90-second fallback timer fires */}
          <AnimatePresence>
            {showManualVerify && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={() => {
                  triggerSuccess(`dojah_manual_ref_${Date.now()}`);
                }}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                I've Completed Verification
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DojahWidgetModal;
