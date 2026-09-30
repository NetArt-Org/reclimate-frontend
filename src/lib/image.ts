/** Longest side and JPEG quality. "Slow internet mode" trades detail for much smaller uploads. */
export const photoSize = (slow: boolean) => (slow ? { max: 1024, quality: 0.6 } : { max: 1600, quality: 0.82 })

type Drawable = HTMLVideoElement | ImageBitmap

function draw(source: Drawable, width: number, height: number, max: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, max / Math.max(width, height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
}

/** Current frame of a live camera preview, as a JPEG. */
export const frameToJpeg = (video: HTMLVideoElement, slow: boolean) => {
  const { max, quality } = photoSize(slow)
  return draw(video, video.videoWidth, video.videoHeight, max, quality)
}

/** Shrink a photo picked from the gallery / native camera. Falls back to the original file. */
export async function fileToJpeg(file: Blob, slow: boolean): Promise<Blob> {
  const { max, quality } = photoSize(slow)
  try {
    const bitmap = await createImageBitmap(file)
    const out = await draw(bitmap, bitmap.width, bitmap.height, max, quality)
    bitmap.close()
    return out ?? file
  } catch {
    return file
  }
}
