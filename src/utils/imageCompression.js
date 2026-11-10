export const compressImageFile = (file, { maxDimension = 1200, quality = 0.85 } = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const originalDataUrl = reader.result;
      const img = new globalThis.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(originalDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const outputType = file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
        const compressed = canvas.toDataURL(outputType, quality);
        resolve(compressed.length < originalDataUrl.length ? compressed : originalDataUrl);
      };
      img.onerror = () => resolve(originalDataUrl);
      img.src = originalDataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read selected image'));
    reader.readAsDataURL(file);
  });
};

