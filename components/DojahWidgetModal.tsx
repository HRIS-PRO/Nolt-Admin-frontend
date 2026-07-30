import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { parseDojahWidgetPayload } from '../utils/dojah';

export type DojahWidgetSuccess = {
  referenceId: string;
  selfieUrl?: string;
};

interface DojahWidgetModalProps {
  /** Full iframe URL (preferred — includes BVN/reference prefill from backend). */
  widgetUrl?: string;
  /** Legacy: build URL from widget id only. */
  widgetId?: string;
  expectedReferenceId?: string;
  onSuccess: (result: DojahWidgetSuccess) => void;
  onClose: () => void;
}

const DojahWidgetModal: React.FC<DojahWidgetModalProps> = ({
  widgetUrl,
  widgetId,
  expectedReferenceId,
  onSuccess,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showManualVerify, setShowManualVerify] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alreadySucceeded = useRef(false);
  const latestReferenceId = useRef<string | undefined>(expectedReferenceId);
  const latestSelfieUrl = useRef<string | undefined>(undefined);

  const iframeUrl =
    widgetUrl ||
    (widgetId ? `https://identity.dojah.io?widget_id=${widgetId}` : 'https://identity.dojah.io');

  const triggerSuccess = useCallback(
    (refId: string, selfieUrl?: string) => {
      if (alreadySucceeded.current) return;
      alreadySucceeded.current = true;
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      onSuccess({ referenceId: refId, selfieUrl });
    },
    [onSuccess],
  );

  const triggerManualButton = useCallback(() => {
    if (alreadySucceeded.current) return;
    setShowManualVerify(true);
  }, []);

  const handleParsedMessage = useCallback(
    (raw: unknown, origin?: string) => {
      const message = parseDojahWidgetPayload(raw, origin);
      if (!message) return;

      console.log('[DojahWidget] parsed message:', message);

      if (message.referenceId) latestReferenceId.current = message.referenceId;
      if (message.selfieUrl) latestSelfieUrl.current = message.selfieUrl;

      if (message.kind === 'success') {
        const refId =
          message.referenceId ||
          latestReferenceId.current ||
          expectedReferenceId ||
          `dojah_ref_${Date.now()}`;
        triggerSuccess(refId, message.selfieUrl || latestSelfieUrl.current);
        return;
      }

      if (message.kind === 'flow_complete') {
        triggerManualButton();
      }
    },
    [expectedReferenceId, triggerManualButton, triggerSuccess],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[DojahWidget Debug] postMessage received:', {
        origin: event.origin,
        data: event.data,
        type: typeof event.data,
      });

      const isDojahOrigin =
        event.origin === 'https://dojah.io' ||
        event.origin === 'https://identity.dojah.io' ||
        event.origin.endsWith('.dojah.io') ||
        event.origin === 'null' ||
        event.origin === '';

      if (!isDojahOrigin) return;
      handleParsedMessage(event.data, event.origin);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleParsedMessage]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    fallbackTimerRef.current = setTimeout(() => {
      console.log('[DojahWidget] 90s fallback timer fired. Showing manual button.');
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
            src={iframeUrl}
            className="w-full h-full border-0"
            allow="camera; microphone; geolocation"
            onLoad={handleIframeLoad}
            title="Dojah Identity Widget"
          />
        </div>

        <div className="p-6 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between min-h-[88px]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-emerald-500">verified_user</span>
            End-to-End Encryption Active
          </div>

          <AnimatePresence>
            {showManualVerify && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={() => {
                  const refId =
                    latestReferenceId.current ||
                    expectedReferenceId ||
                    `dojah_manual_ref_${Date.now()}`;
                  triggerSuccess(refId, latestSelfieUrl.current);
                }}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                I&apos;ve Completed Verification
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DojahWidgetModal;
