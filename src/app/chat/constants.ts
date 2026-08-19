// Chat page constants — shared across components
export const THEME_PRESETS = [
  { id: 'blue', color: '#2563eb', label: 'Slate Blue' },
  { id: 'indigo', color: '#4f46e5', label: 'Deep Indigo' },
  { id: 'emerald', color: '#059669', label: 'Emerald' },
  { id: 'teal', color: '#0d9488', label: 'Teal' },
  { id: 'charcoal', color: '#4b5563', label: 'Charcoal' },
  { id: 'rose', color: '#e11d48', label: 'Rose' },
  { id: 'amber', color: '#d97706', label: 'Amber' },
  { id: 'sky', color: '#0284c7', label: 'Sky' },
];

export const BG_PRESETS = [
  { id: 'none', url: '', label: 'Default' },
  { id: 'galaxy', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80', label: 'Galaxy' },
  { id: 'abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', label: 'Abstract' },
  { id: 'cyberpunk', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', label: 'Neon City' },
  { id: 'minimal', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80', label: 'Dark Mesh' },
  { id: 'waves', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80', label: 'Silk Wave' },
];

export const DEFAULT_EMOJI_PRESETS = ['👍', '❤️', '🔥', '😂', '⚡', '🎉', '💩', '💯', '👏', '🥳', '😍', '🚀'];

/** Compress and resize an image File before upload. */
export const compressImage = async (
  file: File,
  quality: number = 0.75,
  maxDimension: number = 1600
): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          resolve(
            new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
          );
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
};
