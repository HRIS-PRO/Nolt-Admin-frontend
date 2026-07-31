import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { selfieVerificationService } from '../services/selfieVerificationService';

export type SelfieVerificationSuccess = {
  selfieUrl: string;
  confidence: number;
  lastSelfieVerifiedAt?: string;
};

type VerificationStep = 'capture' | 'liveness' | 'bvn_face' | 'success' | 'error';

interface SelfieVerificationCaptureProps {
  bvn: string;
  context?: 'profile' | 'vault';
  onSuccess: (result: SelfieVerificationSuccess) => void;
  onClose: () => void;
}

const SelfieVerificationCapture: React.FC<SelfieVerificationCaptureProps> = ({
  bvn,
  context = 'vault',
  onSuccess,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('capture');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('[SelfieVerification] Camera error:', err);
      setCameraError('Unable to access camera. Allow camera permission and try again.');
    } finally {
      setIsStarting(false);
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context2d = canvas.getContext('2d');
    if (!context2d) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context2d.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setVerificationError(null);
    setVerificationStep('capture');
    void startCamera();
  };

  const runVerification = async () => {
    if (!capturedImage) return;

    setVerificationError(null);
    setVerificationStep('liveness');
    setVerificationMessage('Checking liveness…');

    const stepTimer = window.setTimeout(() => {
      setVerificationStep('bvn_face');
      setVerificationMessage('Matching face to BVN…');
    }, 1800);

    try {
      const result = await selfieVerificationService.verifySelfie(bvn, capturedImage, context);
      window.clearTimeout(stepTimer);

      if (!result.success) {
        setVerificationStep('error');
        setVerificationError(result.message || 'Verification failed. Please try again.');
        return;
      }

      setVerificationStep('success');
      setVerificationMessage('Identity verified successfully');
      stopCamera();
      await new Promise((r) => setTimeout(r, 600));

      try {
        onSuccess({
          selfieUrl: result.selfie_url || capturedImage,
          confidence: result.confidence ?? 0,
          lastSelfieVerifiedAt: result.last_selfie_verified_at,
        });
      } finally {
        onClose();
      }
    } catch (err: unknown) {
      window.clearTimeout(stepTimer);
      const message =
        axiosIsError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
            ? err.message
            : 'Verification failed. Please try again.';
      setVerificationStep('error');
      setVerificationError(message);
    }
  };

  const isVerifying = verificationStep === 'liveness' || verificationStep === 'bvn_face';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-5 flex justify-between items-center border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">Selfie Verification</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="size-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center disabled:opacity-40"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="relative aspect-[4/5] bg-black overflow-hidden">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-rose-500 text-6xl mb-4">videocam_off</span>
              <p className="text-slate-300 font-medium mb-6">{cameraError}</p>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="px-6 py-2 bg-primary text-slate-950 rounded-xl font-bold uppercase text-xs tracking-widest"
              >
                Try Again
              </button>
            </div>
          ) : capturedImage ? (
            <>
              <img src={capturedImage} alt="Captured selfie preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 ring-4 ring-primary/30 ring-inset pointer-events-none" />
            </>
          ) : (
            <>
              {isStarting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                  <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[62%] aspect-[3/4] rounded-[999px] border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] animate-pulse" />
              </div>
              <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">
                    Center your face in the oval
                  </p>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="size-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white backdrop-blur-sm active:scale-95 transition-all"
                  title="Capture selfie"
                >
                  <div className="size-14 bg-white rounded-full" />
                </button>
              </div>
            </>
          )}

          <AnimatePresence>
            {verificationStep === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-8 text-center"
              >
                <div className="size-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-emerald-400">verified_user</span>
                </div>
                <p className="text-sm font-black text-white uppercase tracking-widest">{verificationMessage}</p>
              </motion.div>
            )}
            {isVerifying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-5 p-8 text-center"
              >
                <div className="size-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-widest">{verificationMessage}</p>
                  <p className="text-xs text-slate-400 mt-2 font-bold">
                    {verificationStep === 'liveness'
                      ? 'Step 1 of 2 — live face detection'
                      : 'Step 2 of 2 — BVN face validation'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-slate-900 border-t border-slate-800 space-y-4">
          {verificationError && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
              <span className="material-symbols-outlined text-red-400 text-base">error</span>
              <p className="text-sm font-bold text-red-300 leading-relaxed">{verificationError}</p>
            </div>
          )}

          {!capturedImage ? (
            <div className="grid grid-cols-2 gap-4">
              <Tip icon="light_mode" text="Use good, even lighting on your face." />
              <Tip icon="face" text="Remove glasses, hats, or face coverings." />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isVerifying}
                className="px-5 py-3 rounded-2xl border border-slate-700 text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 disabled:opacity-40"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={() => void runVerification()}
                disabled={isVerifying}
                className="px-8 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-[10px] tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Verify Identity
              </button>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </motion.div>
  );
};

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
      <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase">{text}</p>
    </div>
  );
}

function axiosIsError(err: unknown): err is { response?: { data?: { message?: string } } } {
  return typeof err === 'object' && err !== null && 'response' in err;
}

export default SelfieVerificationCapture;
