import { useRef, useState } from 'react';
import { compressImage } from '../app/chat/constants';

export interface PendingMediaItem {
  file: File;
  previewUrl: string;
}

const FILTER_CSS: Record<string, string> = {
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(100%)',
  warm: 'sepia(50%) contrast(110%) brightness(105%)',
  cool: 'hue-rotate(180deg) saturate(120%)',
  invert: 'invert(100%)',
};

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  const buf = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
  return !buf.some((c) => c !== 0);
}

async function synthesizeEditedMedia(
  item: PendingMediaItem,
  filter: string,
  rotation: number,
  drawingCanvas: HTMLCanvasElement | null
): Promise<File> {
  if (!item.file.type.startsWith('image/')) return item.file;
  const hasDrawing = drawingCanvas && !isCanvasBlank(drawingCanvas);
  if (filter === 'none' && rotation === 0 && !hasDrawing) return item.file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const isRotatedQuarter = rotation === 90 || rotation === 270;
      const canvas = document.createElement('canvas');
      canvas.width = isRotatedQuarter ? height : width;
      canvas.height = isRotatedQuarter ? width : height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(item.file);

      if (FILTER_CSS[filter]) ctx.filter = FILTER_CSS[filter];
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();
      ctx.filter = 'none';

      if (hasDrawing && drawingCanvas) {
        ctx.drawImage(drawingCanvas, 0, 0, canvas.width, canvas.height);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(item.file);
          resolve(new File([blob], item.file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = () => resolve(item.file);
    img.src = item.previewUrl;
  });
}

export function useMediaEditor(
  activeConvo: any,
  token: string | null,
  socket: any,
  replyingTo: any,
  setReplyingTo: (v: any) => void,
  autoScrollBottomRef: React.MutableRefObject<boolean>
) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // State
  const [pendingMediaItems, setPendingMediaItems] = useState<PendingMediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mediaCaptions, setMediaCaptions] = useState<Record<number, string>>({});
  const [mediaFilters, setMediaFilters] = useState<Record<number, string>>({});
  const [mediaRotations, setMediaRotations] = useState<Record<number, number>>({});
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(6);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [showMediaPreviewModal, setShowMediaPreviewModal] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [qualityMode, setQualityMode] = useState<'standard' | 'hd'>('standard');

  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawMode || !drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / (rect.width || 1));
    const y = (clientY - rect.top) * (canvas.height / (rect.height || 1));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    isDrawingRef.current = true;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isDrawMode || !drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / (rect.width || 1));
    const y = (clientY - rect.top) * (canvas.height / (rect.height || 1));
    ctx.lineWidth = brushSize;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => { isDrawingRef.current = false; };

  const clearDrawing = () => {
    if (!drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeConvo) return;
    const newItems = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPendingMediaItems((prev) => [...prev, ...newItems]);
    setShowMediaPreviewModal(true);
    e.target.value = '';
  };

  const handleRemoveThumbnail = (indexToRemove: number) => {
    setPendingMediaItems((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (updated.length === 0) setShowMediaPreviewModal(false);
      return updated;
    });
    if (activeMediaIndex >= indexToRemove && activeMediaIndex > 0) {
      setActiveMediaIndex((prev) => prev - 1);
    }
  };

  const handleCancelMediaPreview = () => {
    pendingMediaItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPendingMediaItems([]);
    setActiveMediaIndex(0);
    setMediaCaptions({});
    setMediaFilters({});
    setMediaRotations({});
    setIsDrawMode(false);
    setShowFilterPicker(false);
    setShowMediaPreviewModal(false);
  };

  const handleSendMediaWithCaption = async () => {
    if (!pendingMediaItems.length || !activeConvo || !socket || sendingMedia) return;
    setSendingMedia(true);
    autoScrollBottomRef.current = true;

    try {
      const uploadPromises = pendingMediaItems.map(async (item, i) => {
        const filter = mediaFilters[i] || 'none';
        const rotation = mediaRotations[i] || 0;
        let editedFile = await synthesizeEditedMedia(
          item,
          filter,
          rotation,
          i === activeMediaIndex ? drawCanvasRef.current : null
        );
        if (qualityMode === 'standard' && editedFile.type.startsWith('image/')) {
          editedFile = await compressImage(editedFile, 0.75, 1600);
        }
        const formData = new FormData();
        formData.append('file', editedFile);
        const res = await fetch(`${API_URL}/chat/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        return { fileUrl: data.fileUrl as string, fileType: data.fileType as string };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const combinedUrls = uploadedFiles.map((f) => f.fileUrl).join(',');
      const combinedTypes = uploadedFiles.map((f) => f.fileType).join(',');
      const captionsArr = Object.values(mediaCaptions).map((c) => c.trim()).filter(Boolean);
      const combinedCaption = captionsArr.length > 0 ? captionsArr.join('\n') : undefined;

      socket.emit('send-message', {
        conversationId: activeConvo.id,
        content: combinedCaption,
        fileUrl: combinedUrls,
        fileType: combinedTypes,
        replyToId: replyingTo ? replyingTo.id : undefined,
      });

      setReplyingTo(null);
      handleCancelMediaPreview();
    } catch (err) {
      console.error(err);
      alert('File upload failed. Ensure storage keys are valid.');
    } finally {
      setSendingMedia(false);
    }
  };

  return {
    pendingMediaItems, setPendingMediaItems,
    activeMediaIndex, setActiveMediaIndex,
    mediaCaptions, setMediaCaptions,
    mediaFilters, setMediaFilters,
    mediaRotations, setMediaRotations,
    isDrawMode, setIsDrawMode,
    drawColor, setDrawColor,
    brushSize, setBrushSize,
    showFilterPicker, setShowFilterPicker,
    showMediaPreviewModal, setShowMediaPreviewModal,
    sendingMedia,
    qualityMode, setQualityMode,
    drawCanvasRef,
    isDrawingRef,
    startDrawing,
    draw,
    stopDrawing,
    clearDrawing,
    handleFileSelect,
    handleRemoveThumbnail,
    handleCancelMediaPreview,
    handleSendMediaWithCaption,
  };
}
