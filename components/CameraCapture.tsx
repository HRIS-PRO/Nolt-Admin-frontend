import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  label?: string;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, label = "Selfie Verification", onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startCamera = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions.");
    } finally {
      setIsStarting(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        // Set canvas dimensions to match video stream
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Flip horizontal for natural selfie feel if needed, but Zeeh might expect normal
        // Generally, we show mirror in preview but capture normal
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      // Convert dataUrl to File
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
          onCapture(file);
        });
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
    >
      <div className="relative w-full max-w-xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        
        {/* Header */}
        <div className="p-6 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">{label}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-black group">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-rose-500 text-6xl mb-4">videocam_off</span>
              <p className="text-slate-300 font-medium mb-6">{error}</p>
              <button 
                onClick={startCamera}
                className="px-6 py-2 bg-[#fbbf24] text-slate-900 rounded-xl font-bold uppercase text-xs tracking-widest"
              >
                Try Again
              </button>
            </div>
          ) : capturedImage ? (
            <div className="absolute inset-0">
              <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-8 gap-4">
                <button 
                  onClick={handleRetake}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 border border-white/20 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Retake
                </button>
                <button 
                  onClick={handleConfirm}
                  className="px-10 py-3 bg-[#fbbf24] hover:bg-amber-400 text-slate-900 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Verify Identity
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black">
                  <div className="size-12 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover scale-x-[-1]" // Flip mirrored for user comfort
              />
              <div className="absolute inset-x-0 bottom-8 flex justify-center">
                <button 
                  onClick={capturePhoto}
                  className="size-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white backdrop-blur-sm group-active:scale-95 transition-all shadow-xl"
                  title="Capture Photo"
                >
                  <div className="size-14 bg-white rounded-full group-hover:scale-90 transition-transform"></div>
                </button>
              </div>
              <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Position your face in the center</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-8 bg-slate-900">
           <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                 <span className="material-symbols-outlined text-amber-500 text-lg">light_mode</span>
                 <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase">Ensure your face is well-lit and clearly visible.</p>
              </div>
              <div className="flex items-start gap-3">
                 <span className="material-symbols-outlined text-amber-500 text-lg">face</span>
                 <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase">Remove glasses or anything covering your face.</p>
              </div>
           </div>
        </div>
      </div>
      
      {/* Hidden canvas for capture processing */}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
};

export default CameraCapture;
