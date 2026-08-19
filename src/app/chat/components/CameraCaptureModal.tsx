'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, Zap } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  activeThemeColor?: string;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  activeThemeColor = '#2563eb',
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setErrorMsg('Could not access camera. Please allow camera permissions in your browser settings.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, capturedImage, startCamera]);

  if (!isOpen) return null;

  const handleTakeSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleSendPhoto = () => {
    if (!capturedImage) return;
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      });
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)] text-base">
            <Camera size={20} style={{ color: activeThemeColor }} />
            <span>Capture Photo</span>
          </div>
          <button
            onClick={() => {
              if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Display Viewport */}
        <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {/* Flash Effect */}
          {isFlashActive && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-200" />}

          {capturedImage ? (
            <img src={capturedImage} alt="Captured snap" className="w-full h-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {errorMsg && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center text-red-400 text-sm gap-3">
                  <p>{errorMsg}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-white/10 rounded-lg text-white text-xs font-semibold hover:bg-white/20 cursor-pointer"
                  >
                    Retry Camera
                  </button>
                </div>
              )}
            </>
          )}

          {/* Camera Flip Button */}
          {!capturedImage && !errorMsg && (
            <button
              onClick={toggleCameraFacing}
              className="absolute top-4 right-4 p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-black/80 transition-all active:scale-95 cursor-pointer"
              title="Switch Camera"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-center p-5 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] gap-4">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-medium text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw size={16} />
                Retake
              </button>
              <button
                onClick={handleSendPhoto}
                className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                style={{ backgroundColor: activeThemeColor }}
              >
                <Check size={18} />
                Attach Photo
              </button>
            </>
          ) : (
            <button
              onClick={handleTakeSnap}
              disabled={!!errorMsg}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl cursor-pointer"
              style={{ backgroundColor: activeThemeColor }}
              title="Take Photo"
            >
              <div className="w-12 h-12 rounded-full border-2 border-black/30 bg-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
