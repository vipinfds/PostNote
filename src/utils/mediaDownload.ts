/**
 * Utility to download media files directly to user's device
 */
export const downloadMediaFile = async (url: string, filename: string = 'post-media') => {
  if (!url) return;

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Fetch failed');
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;

    let extension = '';
    if (!filename.includes('.')) {
      if (blob.type.includes('png')) extension = '.png';
      else if (blob.type.includes('video') || blob.type.includes('mp4')) extension = '.mp4';
      else if (blob.type.includes('webp')) extension = '.webp';
      else if (blob.type.includes('gif')) extension = '.gif';
      else extension = '.jpg';
    }

    a.download = `${filename}${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1500);
  } catch {
    // Fallback: direct download link or open in new tab
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
