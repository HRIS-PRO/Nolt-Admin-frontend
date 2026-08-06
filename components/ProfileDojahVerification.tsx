import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { parseDojahWidgetPayload } from '../utils/dojah';
import type { ProfileDojahSuccess } from './ProfileDojahVerification.types';

export type { ProfileDojahSuccess } from './ProfileDojahVerification.types';

interface ProfileDojahVerificationProps {
  widgetUrl: string;
  expectedReferenceId: string;
  onSuccess: (result: ProfileDojahSuccess) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

/** Profile Dojah — identity.dojah.io iframe (widget 6a64f7ff…), not the loan modal or React SDK. */
const ProfileDojahVerification: React.FC<ProfileDojahVerificationProps> = ({
  widgetUrl,
  expectedReferenceId,
  onSuccess,
  onClose,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showManualVerify, setShowManualVerify] = useState(false);
  const finished = useRef(false);
  const latestSelfieUrl = useRef<string | undefined>(undefined);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback((fn: () => void) => {
    if (finished.current) return;
    finished.current = true;
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fn();
  }, []);

  const triggerSuccess = useCallback(
    (selfieUrl?: string, dojahReferenceId?: string) => {
      finish(() =>
        onSuccess({
          referenceId: expectedReferenceId,
          selfieUrl,
          dojahReferenceId,
        }),
      );
    },
    [expectedReferenceId, finish, onSuccess],
  );

  const handleParsedMessage = useCallback(
    (raw: unknown, origin?: string) => {
      const message = parseDojahWidgetPayload(raw, origin);
      if (!message) return;

      console.log('[ProfileDojah]', message);

      if (message.selfieUrl) latestSelfieUrl.current = message.selfieUrl;

      if (message.kind === 'success') {
        triggerSuccess(
          message.selfieUrl || latestSelfieUrl.current,
          message.referenceId && message.referenceId !== expectedReferenceId
            ? message.referenceId
            : undefined,
        );
        return;
      }

      if (message.kind === 'flow_complete') {
        setShowManualVerify(true);
      }
    },
    [expectedReferenceId, triggerSuccess],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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

  useEffect(
    () => () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    },
    [],
  );

  const handleIframeLoad = () => {
    setIsLoading(false);
    fallbackTimerRef.current = setTimeout(() => setShowManualVerify(true), 90_000);
  };

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
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[750px]"
      >
        <div className="p-6 flex justify-between items-center bg-slate-900/80 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Identity Verification</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Powered by Dojah</p>
          </div>
          <button
            type="button"
            onClick={() => finish(onClose)}
            className="size-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="relative flex-1 bg-slate-950 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-4 z-10">
              <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Dojah…</p>
            </div>
          )}
          <iframe
            src={widgetUrl}
            className="w-full h-full border-0"
            allow="camera; microphone; geolocation"
            onLoad={handleIframeLoad}
            title="Dojah Profile Verification"
          />
        </div>

        <div className="p-6 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between min-h-[88px]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complete all steps in the widget</p>
          <AnimatePresence>
            {showManualVerify && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                type="button"
                onClick={() => triggerSuccess(latestSelfieUrl.current)}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest"
              >
                I&apos;ve Completed Verification
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileDojahVerification;
