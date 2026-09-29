export interface WatermarkMeta {
  appName?: string;
  categoryTitle?: string; // e.g. "CHECK-IN SELFIE" | "CHECK-IN AREA FOTO"
  mode?: string; // "OFFICE" | "FIELD" | "HYBRID"
  employeeName?: string;
  employeeId?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  address?: string;
  timestamp?: Date;
  isFrontCamera?: boolean;
}

/**
 * Capture frame from HTMLVideoElement with compression and branded watermark
 */
export function captureWithWatermark(
  video: HTMLVideoElement,
  meta: WatermarkMeta
): string {
  const origWidth = video.videoWidth || 640;
  const origHeight = video.videoHeight || 480;

  // Scale down to max 1080px width for fast payload (<250KB) while preserving high detail
  const maxDimension = 1080;
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((origHeight / origWidth) * maxDimension);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((origWidth / origHeight) * maxDimension);
      targetHeight = maxDimension;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // Draw camera video frame (mirror if front camera)
  if (meta.isFrontCamera) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  // Draw Watermark Overlay Banner at the bottom
  const bannerHeight = Math.max(85, Math.round(canvas.height * 0.18));
  const bannerY = canvas.height - bannerHeight;

  // Gradient backdrop for maximum readability
  const gradient = ctx.createLinearGradient(0, bannerY - 15, 0, canvas.height);
  gradient.addColorStop(0, "rgba(15, 23, 42, 0)");
  gradient.addColorStop(0.2, "rgba(15, 23, 42, 0.75)");
  gradient.addColorStop(1, "rgba(15, 23, 42, 0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, bannerY - 15, canvas.width, bannerHeight + 15);

  // Watermark text styling
  const padLeft = Math.max(16, Math.round(canvas.width * 0.03));
  const dateObj = meta.timestamp || new Date();
  const dateStr = dateObj.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const baseFontSize = Math.max(11, Math.round(canvas.width * 0.022));
  const titleFontSize = Math.max(13, Math.round(canvas.width * 0.026));

  let currentY = bannerY + Math.round(titleFontSize * 1.3);

  // Header line: BRAND • MODE • TYPE
  ctx.fillStyle = "#38bdf8"; // Sky blue accent
  ctx.font = `bold ${titleFontSize}px system-ui, -apple-system, sans-serif`;
  const appBrand = meta.appName || "BASE HRIS";
  const cat = meta.categoryTitle || "ATTENDANCE EVIDENCE";
  const modeBadge = meta.mode ? `[${meta.mode}]` : "[OFFICE]";
  ctx.fillText(`● ${appBrand} • ${modeBadge} ${cat}`, padLeft, currentY);

  // Line 2: Time & Date
  currentY += Math.round(baseFontSize * 1.4);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${baseFontSize}px monospace, system-ui`;
  ctx.fillText(`🕒 ${dateStr} • ${timeStr} WIB`, padLeft, currentY);

  // Line 3: Coordinates & Accuracy
  if (meta.latitude !== undefined && meta.longitude !== undefined) {
    currentY += Math.round(baseFontSize * 1.35);
    ctx.fillStyle = "#cbd5e1"; // Slate 300
    ctx.font = `500 ${baseFontSize}px monospace, system-ui`;
    const accStr = meta.accuracyMeters ? ` (Akurasi: ±${Math.round(meta.accuracyMeters)}m)` : "";
    ctx.fillText(
      `📍 GPS: ${meta.latitude.toFixed(6)}, ${meta.longitude.toFixed(6)}${accStr}`,
      padLeft,
      currentY
    );
  }

  // Line 4: Employee & Location Address
  currentY += Math.round(baseFontSize * 1.35);
  ctx.fillStyle = "#94a3b8"; // Slate 400
  ctx.font = `normal ${Math.max(10, baseFontSize - 1)}px system-ui, sans-serif`;
  const empStr = meta.employeeName
    ? `👤 ${meta.employeeName}${meta.employeeId ? ` (${meta.employeeId})` : ""}`
    : "";
  const addrStr = meta.address ? ` • ${meta.address}` : "";
  const footerText = `${empStr}${addrStr}`;
  ctx.fillText(footerText.substring(0, 90), padLeft, currentY);

  // Compress to JPEG with 0.78 quality (~100-220KB per photo)
  return canvas.toDataURL("image/jpeg", 0.78);
}
