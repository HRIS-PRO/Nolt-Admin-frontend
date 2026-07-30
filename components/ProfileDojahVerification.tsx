import React, { useRef, useCallback } from 'react';
import Dojah from 'dojah-kyc-sdk-react';
import { motion } from 'motion/react';
import { extractDojahSelfieUrl } from '../utils/extractDojahSelfie';

export type ProfileDojahSdkSession = {
  reference_id: string;
  app_id: string;
  public_key: string;
  widget_id: string;
  user_data: Record<string, string>;
  gov_data: Record<string, string>;
  metadata: Record<string, string | number>;
};

export type ProfileDojahSuccess = {
  referenceId: string;
  selfieUrl?: string;
  dojahReferenceId?: string;
};

interface ProfileDojahVerificationProps {
  session: ProfileDojahSdkSession;
  onSuccess: (result: ProfileDojahSuccess) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

/**
 * Profile identity verification via official Dojah React SDK (not the loan iframe modal).
 * Enables webhook: true in widget config so Dojah POSTs to /api/webhooks/dojah.
 */
const ProfileDojahVerification: React.FC<ProfileDojahVerificationProps> = ({
  session,
  onSuccess,
  onClose,
  onError,
}) => {
  const finished = useRef(false);

  const finish = useCallback(
    (fn: () => void) => {
      if (finished.current) return;
      finished.current = true;
      fn();
    },
    [],
  );

  const handleResponse = useCallback(
    (type: string, data?: unknown) => {
      console.log('[ProfileDojahSDK]', type, data);

      if (type === 'success') {
        const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
        const selfieUrl = extractDojahSelfieUrl(payload);
        const dojahRef =
          typeof payload.reference_id === 'string' ? payload.reference_id : undefined;

        finish(() =>
          onSuccess({
            referenceId: session.reference_id,
            selfieUrl,
            dojahReferenceId:
              dojahRef && dojahRef !== session.reference_id ? dojahRef : undefined,
          }),
        );
        return;
      }

      if (type === 'error') {
        const message =
          (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
            ? (data as { message: string }).message
            : null) || 'Dojah verification failed. Please try again.';
        finish(() => onError(message));
        return;
      }

      if (type === 'close') {
        finish(onClose);
      }
    },
    [finish, onClose, onError, onSuccess, session.reference_id],
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 pointer-events-none"
      >
        <div className="text-center space-y-4">
          <div className="size-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-sm font-black text-white uppercase tracking-widest">
              Opening Dojah Verification
            </p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">
              Complete liveness in the popup — do not close this tab
            </p>
          </div>
        </div>
      </motion.div>

      <Dojah
        appID={session.app_id}
        publicKey={session.public_key}
        type="custom"
        config={{
          widget_id: session.widget_id,
          webhook: true,
        }}
        referenceId={session.reference_id}
        userData={session.user_data}
        govData={session.gov_data}
        metadata={session.metadata}
        response={handleResponse}
      />
    </>
  );
};

export default ProfileDojahVerification;
