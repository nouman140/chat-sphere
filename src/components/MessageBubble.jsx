import React, { useState, useRef, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatMessageTime } from "../utils/helpers";

/* ─── Voice note player ─────────────────────────────────────────────────────── */
const VoicePlayer = ({ url, isOwn }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    playing ? audio.pause() : audio.play();
  };

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2.5 min-w-[190px] max-w-[260px]">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => {
          setCurrentTime(e.target.currentTime);
          setProgress((e.target.currentTime / e.target.duration) * 100 || 0);
        }}
      />
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isOwn
            ? "bg-white/20 hover:bg-white/30"
            : "bg-[#818cf8]/20 hover:bg-[#818cf8]/30"
        }`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#e2e8f0]">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#e2e8f0]">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="h-1.5 rounded-full bg-white/20 cursor-pointer overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (audioRef.current)
              audioRef.current.currentTime =
                ((e.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <div
            className={`h-full rounded-full transition-all ${isOwn ? "bg-white/70" : "bg-[#818cf8]"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-[#94a3b8] font-mono">
          {fmtTime(playing ? currentTime : duration)}
        </span>
      </div>
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#94a3b8] flex-shrink-0">
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
      </svg>
    </div>
  );
};

/* ─── Fullscreen lightbox ────────────────────────────────────────────────────── */
const Lightbox = ({ items, startIndex = 0, onClose }) => {
  const [current, setCurrent] = useState(startIndex);
  const item = items[current];

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight")
        setCurrent((i) => Math.min(i + 1, items.length - 1));
      if (e.key === "ArrowLeft") setCurrent((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, items.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      {items.length > 1 && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {current + 1} / {items.length}
        </span>
      )}

      {current > 0 && (
        <button
          onClick={() => setCurrent((i) => i - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
      )}

      <div
        className="flex items-center justify-center w-full h-full px-16"
        onClick={onClose}
      >
        {item?.type === "video" ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[85vh] rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={item?.url}
            alt="media"
            className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {current < items.length - 1 && (
        <button
          onClick={() => setCurrent((i) => i + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      )}

      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrent(i);
              }}
              className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-colors ${i === current ? "border-[#818cf8]" : "border-white/20"}`}
            >
              {it.type === "video" ? (
                <div className="w-full h-full bg-black/60 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : (
                <img
                  src={it.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Multi-media grid ───────────────────────────────────────────────────────── */
const MediaGrid = ({ items, onOpenLightbox }) => {
  const count = items.length;

  if (count === 1) {
    const item = items[0];
    return (
      <button
        className="block w-full focus:outline-none"
        onClick={() => onOpenLightbox(0)}
      >
        {item.type === "video" ? (
          <div className="relative">
            <video
              src={item.url}
              className="max-w-full max-h-64 w-full object-cover"
              preload="metadata"
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <img
            src={item.url}
            alt="Flowers"
            className="max-w-full max-h-72 object-cover w-full"
            loading="lazy"
          />
        )}
      </button>
    );
  }

  const visible = items.slice(0, 4);
  const overflow = count > 4 ? count - 4 : 0;
  const gridClass = "grid grid-cols-2 gap-0.5";

  return (
    <div className={gridClass}>
      {visible.map((item, i) => {
        const isLast = i === 3 && overflow > 0;
        return (
          <button
            key={i}
            className={`relative focus:outline-none overflow-hidden ${count === 3 && i === 0 ? "col-span-2" : ""}`}
            style={{ aspectRatio: count === 3 && i === 0 ? "16/9" : "1" }}
            onClick={() => onOpenLightbox(i)}
          >
            {item.type === "video" ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            ) : (
              <img
                src={item.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
            {isLast && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  +{overflow}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ─── Main MessageBubble ─────────────────────────────────────────────────────── */
const MessageBubble = ({ message, chatId, isGroup = false }) => {
  const { user } = useAuth();
  const isOwn = message.senderId === user.uid;
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // ✅ Check if message has media
  const hasMedia = () => {
    if (message.deleted) return false;
    if (message.mediaUrl && message.mediaType !== "multi") return true;
    if (message.mediaType === "multi" && message.mediaItems?.length > 0)
      return true;
    return false;
  };

  // ✅ Get media URL for download
  const getMediaUrl = () => {
    if (message.mediaUrl && message.mediaType !== "multi") {
      return message.mediaUrl;
    }
    if (message.mediaItems && message.mediaItems.length > 0) {
      return message.mediaItems[0].url;
    }
    return null;
  };

  // ✅ Get filename for download
  const getFilename = () => {
    const url = getMediaUrl();
    if (!url) return "download";

    const ext = url.split(".").pop()?.split("?")[0] || "file";
    const type = message.mediaType || "file";

    if (type === "image") return `image_${Date.now()}.${ext}`;
    if (type === "video") return `video_${Date.now()}.${ext}`;
    if (type === "audio") return `voice_${Date.now()}.${ext}`;
    return `file_${Date.now()}.${ext}`;
  };

  // ✅ Download function
  const handleDownload = async () => {
    const url = getMediaUrl();
    if (!url) {
      console.error("No media to download");
      return;
    }

    setMenuOpen(false);
    setDownloading(true);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = getFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      console.log("✅ Download complete");
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (deleteFor = "me") => {
    setMenuOpen(false);
    setDeleting(true);
    try {
      const collPath = isGroup
        ? `groups/${chatId}/messages`
        : `chats/${chatId}/messages`;
      if (deleteFor === "everyone" && isOwn) {
        await updateDoc(doc(db, collPath, message.id), {
          text: null,
          mediaUrl: null,
          mediaType: null,
          mediaItems: null,
          deleted: true,
          deletedAt: new Date(),
        });
      } else {
        await updateDoc(doc(db, collPath, message.id), {
          deletedFor: [...(message.deletedFor || []), user.uid],
        });
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
    setDeleting(false);
  };

  if (message.deletedFor?.includes(user.uid)) return null;

  const isDeleted = message.deleted;
  const hasMultiMedia =
    !isDeleted &&
    message.mediaType === "multi" &&
    message.mediaItems?.length > 0;
  const hasSingleMedia =
    !isDeleted && message.mediaUrl && message.mediaType !== "multi";
  const hasText = !isDeleted && message.text;
  const bubbleBg = isOwn ? "#3730a3" : "#1a1635";

  const getLightboxItems = () => {
    if (hasMultiMedia)
      return message.mediaItems.map((m) => ({ url: m.url, type: m.type }));
    if (hasSingleMedia && message.mediaType !== "audio")
      return [{ url: message.mediaUrl, type: message.mediaType }];
    return [];
  };

  return (
    <>
      {lightbox && (
        <Lightbox
          items={getLightboxItems()}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      <div
        className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-0.5 px-3 group`}
      >
        <div className="relative max-w-[72%] sm:max-w-[58%]">
          {isGroup && !isOwn && !isDeleted && (
            <p
              className="text-xs font-semibold mb-0.5 ml-2"
              style={{ color: getSenderColor(message.senderId) }}
            >
              {message.senderName || "Unknown"}
            </p>
          )}

          <div
            className={`
              relative rounded-2xl shadow-sm overflow-hidden
              ${isOwn ? "rounded-tr-sm" : "rounded-tl-sm"}
              ${isDeleted || deleting ? "opacity-60" : ""}
            `}
            style={{ background: bubbleBg }}
          >
            {/* Tail */}
            {isOwn ? (
              <div className="absolute top-0 -right-[6px] pointer-events-none">
                <svg
                  viewBox="0 0 8 13"
                  className="w-2 h-[13px]"
                  style={{ fill: bubbleBg }}
                >
                  <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
                </svg>
              </div>
            ) : (
              <div className="absolute top-0 -left-[6px] pointer-events-none">
                <svg
                  viewBox="0 0 8 13"
                  className="w-2 h-[13px]"
                  style={{ fill: bubbleBg }}
                >
                  <path d="M2.812 1H8v11.193L1.533 3.568C.474 2.156 1.042 1 2.812 1z" />
                </svg>
              </div>
            )}

            {/* ── Deleted ── */}
            {isDeleted && (
              <div className="px-3.5 py-2.5">
                <p className="text-[#94a3b8] text-sm italic flex items-center gap-1.5">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 fill-current flex-shrink-0"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  This message was deleted
                </p>
                <TimeRow isOwn={isOwn} message={message} />
              </div>
            )}

            {/* ── Multi-media grid ── */}
            {hasMultiMedia && (
              <div>
                <MediaGrid
                  items={message.mediaItems}
                  onOpenLightbox={(i) => setLightbox({ startIndex: i })}
                />
                {hasText && (
                  <p className="text-[#e2e8f0] text-sm leading-relaxed break-words px-3.5 pt-2 pb-1 whitespace-pre-wrap">
                    {message.text}
                  </p>
                )}
                <div className="px-3.5 pb-2">
                  <TimeRow isOwn={isOwn} message={message} />
                </div>
              </div>
            )}

            {/* ── Single image ── */}
            {hasSingleMedia && message.mediaType === "image" && (
              <div>
                <button
                  className="block w-full focus:outline-none"
                  onClick={() => setLightbox({ startIndex: 0 })}
                >
                  <img
                    src={message.mediaUrl}
                    alt="photo"
                    className="max-w-full max-h-72 object-cover w-full"
                    loading="lazy"
                  />
                </button>
                {hasText && (
                  <p className="text-[#e2e8f0] text-sm leading-relaxed break-words px-3.5 pt-2 pb-1 whitespace-pre-wrap">
                    {message.text}
                  </p>
                )}
                <div className="px-3.5 pb-2">
                  <TimeRow isOwn={isOwn} message={message} />
                </div>
              </div>
            )}

            {/* ── Single video ── */}
            {hasSingleMedia && message.mediaType === "video" && (
              <div>
                <button
                  className="block w-full focus:outline-none relative"
                  onClick={() => setLightbox({ startIndex: 0 })}
                >
                  <video
                    src={message.mediaUrl}
                    className="max-w-full max-h-64 w-full object-cover"
                    preload="metadata"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6 fill-white ml-0.5"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
                {hasText && (
                  <p className="text-[#e2e8f0] text-sm leading-relaxed break-words px-3.5 pt-2 pb-1 whitespace-pre-wrap">
                    {message.text}
                  </p>
                )}
                <div className="px-3.5 pb-2">
                  <TimeRow isOwn={isOwn} message={message} />
                </div>
              </div>
            )}

            {/* ── Voice note ── */}
            {hasSingleMedia && message.mediaType === "audio" && (
              <div className="px-3.5 py-2.5">
                <VoicePlayer url={message.mediaUrl} isOwn={isOwn} />
                <TimeRow isOwn={isOwn} message={message} />
              </div>
            )}

            {/* ── Text only ── */}
            {!isDeleted && !hasMultiMedia && !hasSingleMedia && hasText && (
              <div className="px-3.5 py-2">
                <p className="text-[#e2e8f0] text-sm leading-relaxed break-words pr-10 whitespace-pre-wrap">
                  {message.text}
                </p>
                <TimeRow isOwn={isOwn} message={message} />
              </div>
            )}
          </div>

          {/* Context menu */}
          {!isDeleted && (
            <div
              ref={menuRef}
              className={`absolute top-1 ${isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} z-10`}
            >
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`w-6 h-6 rounded-full bg-[#211d3a] flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-[#2d2a4a] transition-all ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  className={`absolute top-7 ${isOwn ? "right-0" : "left-0"} rounded-xl shadow-2xl border border-white/10 z-20 min-w-[170px] overflow-hidden py-1`}
                  style={{ background: "#1c1833" }}
                >
                  {/* ✅ Download Button - Only shows if message has media */}
                  {hasMedia() && (
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#e2e8f0] hover:bg-white/10 transition-colors flex items-center gap-2.5"
                    >
                      {downloading ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className="w-4 h-4 fill-[#94a3b8]"
                        >
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                      )}
                      {downloading ? "Downloading..." : "Download Media"}
                    </button>
                  )}

                  {/* Delete for me */}
                  <button
                    onClick={() => handleDelete("me")}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#e2e8f0] hover:bg-white/10 transition-colors flex items-center gap-2.5"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#94a3b8]">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    Delete for me
                  </button>

                  {/* Delete for everyone - Only for own messages */}
                  {isOwn && (
                    <button
                      onClick={() => handleDelete("everyone")}
                      className="w-full text-left px-4 py-2.5 text-sm text-rose-400 hover:bg-white/10 transition-colors flex items-center gap-2.5"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                      Delete for everyone
                    </button>
                  )}

                  {/* Copy text - Only if message has text */}
                  {message.text && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(message.text);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#e2e8f0] hover:bg-white/10 transition-colors flex items-center gap-2.5"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 fill-[#94a3b8]"
                      >
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                      </svg>
                      Copy text
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ─── Time + read-tick row ─── */
const TimeRow = ({ isOwn, message }) => (
  <div className="flex items-center justify-end gap-1 mt-1">
    <span className="text-[#94a3b8] text-[10px] leading-none">
      {formatMessageTime(message.createdAt)}
    </span>
    {isOwn && !message.deleted && (
      <svg
        viewBox="0 0 18 18"
        className={`w-3.5 h-3.5 flex-shrink-0 ${message.read ? "fill-[#a5b4fc]" : "fill-[#94a3b8]"}`}
      >
        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L2.891 8.71a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l1.999 1.926c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.064-.512z" />
      </svg>
    )}
  </div>
);

const SENDER_COLORS = [
  "#f87171",
  "#60a5fa",
  "#86efac",
  "#fbbf24",
  "#c084fc",
  "#34d399",
  "#fb923c",
];
const getSenderColor = (uid = "") => {
  const idx =
    uid.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    SENDER_COLORS.length;
  return SENDER_COLORS[idx];
};

export default MessageBubble;
