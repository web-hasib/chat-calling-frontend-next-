'use client';
import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Lightbox({ images, index, onClose, onPrev, onNext }: LightboxProps) {
  if (images.length === 0) return null;
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-[20px] z-[2000] flex items-center justify-center animate-in fade-in-0 duration-200" onClick={onClose}>
      <button
        className="absolute top-6 right-6 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:scale-105 rounded-full w-11 h-11 flex items-center justify-center cursor-pointer transition-all z-[2010] shadow-xl"
        onClick={onClose}
        title="Close Preview"
      >
        <X size={20} />
      </button>

      {images.length > 1 && (
        <>
          <button
            className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center cursor-pointer hover:scale-105 transition-all z-[2010] shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            title="Previous image"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            className="absolute right-6 md:right-8 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center cursor-pointer hover:scale-105 transition-all z-[2010] shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            title="Next image"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}
      <div className="relative max-w-[85vw] max-h-[85vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[index]}
          alt={`View ${index + 1}`}
          className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
        />
        {images.length > 1 && (
          <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[var(--text-primary)] text-xs font-semibold border border-[var(--border-color)] shadow-xl">
            Image {index + 1} of {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
