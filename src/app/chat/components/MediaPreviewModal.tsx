'use client';
import React from 'react';
import {
  X, RotateCw, Sparkles, Pencil, Undo2, Send, Loader2, Plus, Paperclip,
} from 'lucide-react';
import type { PendingMediaItem } from '../../../hooks/useMediaEditor';

interface MediaPreviewModalProps {
  pendingMediaItems: PendingMediaItem[];
  activeMediaIndex: number;
  setActiveMediaIndex: (i: number) => void;
  mediaCaptions: Record<number, string>;
  setMediaCaptions: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  mediaFilters: Record<number, string>;
  setMediaFilters: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  mediaRotations: Record<number, number>;
  setMediaRotations: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  isDrawMode: boolean;
  setIsDrawMode: (v: boolean) => void;
  drawColor: string;
  setDrawColor: (c: string) => void;
  brushSize: number;
  setBrushSize: (s: number) => void;
  showFilterPicker: boolean;
  setShowFilterPicker: (v: boolean) => void;
  sendingMedia: boolean;
  qualityMode: 'standard' | 'hd';
  setQualityMode: React.Dispatch<React.SetStateAction<'standard' | 'hd'>>;
  drawCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  activeThemeColor: string;
  onClose: () => void;
  onSend: () => void;
  onRemoveThumbnail: (idx: number) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  clearDrawing: () => void;
}

export function MediaPreviewModal({
  pendingMediaItems, activeMediaIndex, setActiveMediaIndex,
  mediaCaptions, setMediaCaptions,
  mediaFilters, setMediaFilters,
  mediaRotations, setMediaRotations,
  isDrawMode, setIsDrawMode,
  drawColor, setDrawColor,
  brushSize, setBrushSize,
  showFilterPicker, setShowFilterPicker,
  sendingMedia, qualityMode, setQualityMode,
  drawCanvasRef, activeThemeColor,
  onClose, onSend, onRemoveThumbnail, onFileSelect,
  startDrawing, draw, stopDrawing, clearDrawing,
}: MediaPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-[5000] flex flex-col items-center justify-between text-[var(--text-primary)] p-0 bg-black/80 backdrop-blur-xl animate-in fade-in-0 duration-200">
      {/* Top Bar (Close, Title, Editor Toolbar Tools) */}
      <div className="h-[72px] px-6 border-b border-[var(--border-color)] flex items-center justify-between w-full bg-[var(--bg-secondary)]/85 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="bg-transparent border-none text-[var(--text-primary)] cursor-pointer p-2 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-center"
            onClick={onClose}
            title="Cancel"
          >
            <X size={22} />
          </button>
          <span className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
            {pendingMediaItems[activeMediaIndex]?.file.type.startsWith('image/')
              ? `Image ${activeMediaIndex + 1} of ${pendingMediaItems.length}`
              : 'Document Preview'}
          </span>
        </div>

        {/* Magic Toolbar Tools */}
        {pendingMediaItems[activeMediaIndex]?.file.type.startsWith('image/') && (
          <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] px-3.5 py-1.5 rounded-full border border-[var(--border-color)]">
            <button
              type="button"
              className="bg-transparent border-none text-[var(--text-primary)] cursor-pointer p-1 rounded-sm flex items-center justify-center hover:text-[var(--accent-primary)] transition-colors"
              onClick={() => {
                setMediaRotations((prev) => ({
                  ...prev,
                  [activeMediaIndex]: ((prev[activeMediaIndex] || 0) + 90) % 360,
                }));
              }}
              title="Rotate Image 90°"
            >
              <RotateCw size={18} />
            </button>

            <button
              type="button"
              className={`bg-transparent border-none text-[var(--text-primary)] cursor-pointer p-1 rounded-sm flex items-center justify-center hover:text-[var(--accent-primary)] transition-colors ${showFilterPicker ? 'text-[var(--accent-primary)] scale-110' : ''}`}
              onClick={() => {
                setShowFilterPicker(!showFilterPicker);
                setIsDrawMode(false);
              }}
              title="Image Filters"
            >
              <Sparkles size={18} />
            </button>

            <button
              type="button"
              className={`bg-transparent border-none text-[var(--text-primary)] cursor-pointer p-1 rounded-sm flex items-center justify-center hover:text-[var(--accent-primary)] transition-colors ${isDrawMode ? 'text-[var(--accent-primary)] scale-110' : ''}`}
              onClick={() => {
                setIsDrawMode(!isDrawMode);
                setShowFilterPicker(false);
              }}
              title="Freehand Pencil Draw"
            >
              <Pencil size={18} />
            </button>

            {isDrawMode && (
              <button
                type="button"
                className="bg-transparent border-none text-[var(--text-primary)] cursor-pointer p-1 rounded-sm flex items-center justify-center hover:text-[var(--accent-primary)] transition-colors"
                onClick={clearDrawing}
                title="Clear Drawings"
              >
                <Undo2 size={18} />
              </button>
            )}

            <button
              type="button"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                qualityMode === 'hd'
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
              onClick={() => setQualityMode((prev) => (prev === 'standard' ? 'hd' : 'standard'))}
              title={
                qualityMode === 'hd'
                  ? 'HD Quality (Original size)'
                  : 'Standard Quality (Compression)'
              }
            >
              <span className="border border-current px-1 py-px rounded-[3px] text-[10px] leading-none font-extrabold tracking-wide">HD</span>
              <span className="text-[10px] font-semibold">{qualityMode === 'hd' ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Color Swatches Popover */}
      {isDrawMode && (
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 z-[1010] backdrop-blur-[16px] shadow-2xl">
          {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ffffff', '#000000'].map((col) => (
            <div
              key={col}
              className={`w-5 h-5 rounded-full cursor-pointer border border-white/20 transition-all ${drawColor === col ? 'scale-125 border-white ring-2 ring-[var(--accent-primary)]' : ''}`}
              style={{ backgroundColor: col }}
              onClick={() => setDrawColor(col)}
            />
          ))}
          <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
          {[3, 6, 12, 20].map((size) => (
            <button
              key={size}
              type="button"
              className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border border-transparent transition-all ${brushSize === size ? 'border-[var(--accent-primary)] bg-[var(--bg-tertiary)] text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
              onClick={() => setBrushSize(size)}
              title={`Brush Size: ${size}px`}
            >
              <span
                className="bg-current rounded-full inline-block"
                style={{
                  width: `${Math.max(4, size * 0.7 + 2)}px`,
                  height: `${Math.max(4, size * 0.7 + 2)}px`,
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Filter Selector Popover */}
      {showFilterPicker && (
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 z-[1010] backdrop-blur-[16px] shadow-2xl">
          {[
            { id: 'none', label: 'Normal' },
            { id: 'grayscale', label: 'B&W' },
            { id: 'sepia', label: 'Vintage' },
            { id: 'warm', label: 'Warm' },
            { id: 'cool', label: 'Cool' },
            { id: 'invert', label: 'Invert' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-all border ${
                (mediaFilters[activeMediaIndex] || 'none') === f.id
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white font-semibold'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]'
              }`}
              onClick={() => {
                setMediaFilters((prev) => ({ ...prev, [activeMediaIndex]: f.id }));
              }}
            >
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Preview Area */}
      <div className="flex-grow flex items-center justify-center p-6 overflow-hidden w-full bg-transparent">
        {pendingMediaItems[activeMediaIndex]?.file.type.startsWith('image/') ? (
          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '90%', maxHeight: '65vh' }}>
            <img
              src={pendingMediaItems[activeMediaIndex]?.previewUrl}
              alt="Media Preview"
              className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl border border-white/10"
              style={{
                transform: `rotate(${mediaRotations[activeMediaIndex] || 0}deg)`,
                filter:
                  (mediaFilters[activeMediaIndex] || 'none') === 'grayscale'
                    ? 'grayscale(100%)'
                    : (mediaFilters[activeMediaIndex] || 'none') === 'sepia'
                    ? 'sepia(100%)'
                    : (mediaFilters[activeMediaIndex] || 'none') === 'warm'
                    ? 'sepia(50%) contrast(110%) brightness(105%)'
                    : (mediaFilters[activeMediaIndex] || 'none') === 'cool'
                    ? 'hue-rotate(180deg) saturate(120%)'
                    : (mediaFilters[activeMediaIndex] || 'none') === 'invert'
                    ? 'invert(100%)'
                    : 'none',
                transition: 'transform 0.25s ease, filter 0.25s ease',
              }}
            />
            <canvas
              ref={drawCanvasRef}
              width={640}
              height={480}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                cursor: isDrawMode ? 'crosshair' : 'default',
                pointerEvents: isDrawMode ? 'auto' : 'none',
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] text-[var(--text-primary)] shadow-2xl">
            <Paperclip size={48} className="text-[var(--accent-primary)]" />
            <span className="text-base font-semibold max-w-[280px] truncate">{pendingMediaItems[activeMediaIndex]?.file.name}</span>
            <span className="text-xs text-[var(--text-secondary)]">
              {(pendingMediaItems[activeMediaIndex]?.file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}
      </div>

      {/* Footer Column */}
      <div className="flex flex-col items-center gap-4 p-4 md:px-6 md:pb-6 w-full bg-[var(--bg-secondary)]/85 border-t border-[var(--border-color)] backdrop-blur-md">
        <div className="flex items-center gap-3 w-full max-w-[640px] bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-full pl-[18px] pr-1.5 py-1.5 shadow-inner">
          <input
            type="text"
            placeholder="Add a caption..."
            value={mediaCaptions[activeMediaIndex] || ''}
            onChange={(e) => {
              const val = e.target.value;
              setMediaCaptions((prev) => ({ ...prev, [activeMediaIndex]: val }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            className="flex-grow bg-transparent border-none text-[var(--text-primary)] text-sm outline-none placeholder:text-[var(--text-secondary)]"
            autoFocus
          />
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-white cursor-pointer disabled:opacity-60 transition-opacity bg-[var(--accent-primary)] shrink-0 shadow"
            onClick={onSend}
            disabled={sendingMedia}
            style={activeThemeColor ? { background: activeThemeColor } : undefined}
            title="Send message"
          >
            {sendingMedia ? <Loader2 className="animate-spin inline-block" size={18} /> : <Send size={18} />}
          </button>
        </div>

        {/* Thumbnail Carousel Tray */}
        <div className="flex items-center gap-2.5 overflow-x-auto max-w-[90vw] p-1">
          {pendingMediaItems.map((item, idx) => (
            <div
              key={idx}
              className={`relative w-[52px] h-[52px] rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition-transform hover:scale-105 ${idx === activeMediaIndex ? 'border-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary)]' : 'border-[var(--border-color)]'}`}
              onClick={() => {
                setActiveMediaIndex(idx);
                setIsDrawMode(false);
                setShowFilterPicker(false);
              }}
            >
              {item.file.type.startsWith('image/') ? (
                <img src={item.previewUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                  <Paperclip size={20} />
                </div>
              )}
              <button
                type="button"
                className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-black text-white border-none rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveThumbnail(idx);
                }}
                title="Remove media"
              >
                ✕
              </button>
            </div>
          ))}
          <label className="w-[52px] h-[52px] rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center cursor-pointer shrink-0 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors" title="Add more photos or files">
            <Plus size={22} />
            <input
              type="file"
              multiple
              onChange={onFileSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
