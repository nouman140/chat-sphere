// ─── Cloudinary Upload Utility ───────────────────────────────────────────────
// Replaces Firebase Storage entirely. No API secret needed — unsigned uploads.

const CLOUD_NAME = "du3uiwybs";
const UPLOAD_PRESET = "chatsphere_uploads";
const BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

/**
 * Upload a single file to Cloudinary with progress tracking.
 * @param {File} file - The file to upload
 * @param {function} onProgress - Callback with progress 0–100
 * @returns {Promise<{ url: string, publicId: string, resourceType: string }>}
 */
export const uploadToCloudinary = (file, onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    const resourceType = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
        ? "video" // Cloudinary uses 'video' for audio too
        : "image";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "chat_media");

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          resourceType: data.resource_type,
        });
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during upload")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", `${BASE_URL}/${resourceType}/upload`);
    xhr.send(formData);
  });
};

/**
 * Upload multiple files concurrently with combined progress.
 * @param {File[]} files
 * @param {function} onProgress - Combined progress 0–100
 * @returns {Promise<Array<{ url, publicId, resourceType, file }>>}
 */
export const uploadMultipleToCloudinary = async (
  files,
  onProgress = () => {},
) => {
  const progresses = new Array(files.length).fill(0);

  const updateCombined = () => {
    const avg = progresses.reduce((a, b) => a + b, 0) / files.length;
    onProgress(Math.round(avg));
  };

  const results = await Promise.all(
    files.map((file, i) =>
      uploadToCloudinary(file, (pct) => {
        progresses[i] = pct;
        updateCombined();
      }).then((res) => ({ ...res, file })),
    ),
  );

  return results;
};

/**
 * Detect media type from file MIME type.
 */
export const getMediaType = (file) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

/**
 * Validate file before upload.
 */
export const validateFile = (file, maxMB = 50) => {
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `"${file.name}" is too large. Max ${maxMB} MB.`;
  }
  const allowed = ["image/", "video/", "audio/"];
  if (!allowed.some((t) => file.type.startsWith(t))) {
    return `"${file.name}" is not a supported file type.`;
  }
  return null; // valid
};
