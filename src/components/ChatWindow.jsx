import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { formatLastSeen, groupMessagesByDate } from "../utils/helpers";
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  getMediaType,
  validateFile,
} from "../cloudinary/upload";
import toast from "react-hot-toast";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";

const ACCEPTED_MEDIA = "image/*,video/*,audio/*";
const MAX_FILE_MB = 50;
// No MAX_FILES limit — users can send as many files as they want

const ChatWindow = () => {
  const { user } = useAuth();
  const { activeChatId, activePeer, activeGroup, chatType, closeChat } =
    useChat();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [peer, setPeer] = useState(activePeer);
  const [group, setGroup] = useState(activeGroup);
  const [sending, setSending] = useState(false);

  // ── Multi-media state ──
  const [stagedFiles, setStagedFiles] = useState([]); // Array of { file, preview, id }
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Voice recording state ──
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // ── Cancellation ref ──
  const cancelUploadRef = useRef(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isGroup = chatType === "group";

  /* ─── Live peer / group status ─── */
  useEffect(() => {
    if (!activePeer?.uid || isGroup) return;
    const unsub = onSnapshot(doc(db, "users", activePeer.uid), (d) => {
      if (d.exists()) setPeer(d.data());
    });
    return unsub;
  }, [activePeer?.uid, isGroup]);

  useEffect(() => {
    if (!activeGroup?.id || !isGroup) return;
    const unsub = onSnapshot(doc(db, "groups", activeGroup.id), (d) => {
      if (d.exists()) setGroup({ id: d.id, ...d.data() });
    });
    return unsub;
  }, [activeGroup?.id, isGroup]);

  useEffect(() => {
    setPeer(activePeer);
    setGroup(activeGroup);
    setText("");
    clearAllMedia();
  }, [activeChatId, activePeer, activeGroup]);

  /* ─── Messages subscription ─── */
  useEffect(() => {
    if (!activeChatId) return;
    const collPath = isGroup
      ? collection(db, "groups", activeChatId, "messages")
      : collection(db, "chats", activeChatId, "messages");
    const q = query(collPath, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      if (!isGroup) markMessagesRead(msgs);
    });
    return unsub;
  }, [activeChatId, isGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markMessagesRead = async (msgs) => {
    if (!activeChatId || !user) return;
    const chatRef = doc(db, "chats", activeChatId);
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      await updateDoc(chatRef, { [`unreadCount.${user.uid}`]: 0 });
    }
    msgs
      .filter((m) => m.senderId !== user.uid && !m.read && !m.deleted)
      .forEach(async (m) => {
        await updateDoc(doc(db, "chats", activeChatId, "messages", m.id), {
          read: true,
        });
      });
  };

  /* ─── Stage multiple files (no limit) ─── */
  const callClicked = () => {
    toast.success("Coming Soon...");
  };
  /* ─── Stage multiple files (no limit) ─── */
  const stageFiles = (files) => {
    const incoming = Array.from(files);
    const errors = [];
    const valid = [];

    incoming.forEach((file) => {
      const err = validateFile(file, MAX_FILE_MB);
      if (err) errors.push(err);
      else
        valid.push({
          id: `${Date.now()}_${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
          type: getMediaType(file),
        });
    });

    if (errors.length) alert(errors.join("\n"));
    if (valid.length) setStagedFiles((prev) => [...prev, ...valid]);
  };

  const removeStagedFile = (id) => {
    setStagedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAllMedia = () => {
    setStagedFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview));
      return [];
    });
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Cancel the current upload ──
  const handleCancelUpload = () => {
    cancelUploadRef.current = true;
    setSending(false);
    setUploadProgress(0);
    clearAllMedia();
  };

  /* ─── Save message to Firestore ─── */
  const saveMessage = async (msgData, previewText) => {
    if (cancelUploadRef.current) return; // Don't save if cancelled
    if (isGroup) {
      await addDoc(collection(db, "groups", activeChatId, "messages"), msgData);
      await updateDoc(doc(db, "groups", activeChatId), {
        lastMessage: previewText,
        lastSenderName: user.displayName,
        updatedAt: serverTimestamp(),
      });
    } else {
      const chatRef = doc(db, "chats", activeChatId);
      const chatDoc = await getDoc(chatRef);
      await addDoc(collection(db, "chats", activeChatId, "messages"), msgData);
      const chatUpdate = {
        participants: [user.uid, activePeer.uid],
        lastMessage: previewText,
        lastSenderUid: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        chatUpdate[`unreadCount.${activePeer.uid}`] =
          (data.unreadCount?.[activePeer.uid] || 0) + 1;
        await updateDoc(chatRef, chatUpdate);
      } else {
        chatUpdate.unreadCount = { [activePeer.uid]: 1, [user.uid]: 0 };
        await setDoc(chatRef, chatUpdate);
      }
    }
  };

  /* ─── Send message ─── */
  const sendMessage = async () => {
    const trimmed = text.trim();
    if ((!trimmed && stagedFiles.length === 0) || sending || !activeChatId)
      return;

    setSending(true);
    cancelUploadRef.current = false; // Reset cancellation flag
    const savedText = trimmed;
    setText("");
    inputRef.current?.focus();

    try {
      // ── Send text-only message ──
      if (stagedFiles.length === 0) {
        await saveMessage(
          {
            text: savedText,
            mediaUrl: null,
            mediaType: null,
            mediaName: null,
            mediaItems: null,
            senderId: user.uid,
            senderName: user.displayName,
            createdAt: serverTimestamp(),
            read: false,
            deleted: false,
            deletedFor: [],
          },
          savedText,
        );
        setSending(false);
        return;
      }

      // ── Upload all staged files to Cloudinary ──
      const filesToUpload = stagedFiles.map((s) => s.file);

      const uploaded = await uploadMultipleToCloudinary(
        filesToUpload,
        (pct) => {
          if (cancelUploadRef.current) return; // Don't update progress if cancelled
          setUploadProgress(pct);
        },
      );

      // Check if cancelled during upload
      if (cancelUploadRef.current) {
        clearAllMedia();
        return;
      }

      clearAllMedia();

      // ── If single file → single message (backward compatible) ──
      if (uploaded.length === 1) {
        const u = uploaded[0];
        const mediaType = getMediaType(u.file);
        const previewText = mediaType === "video" ? "🎬 Video" : "📷 Photo";
        await saveMessage(
          {
            text: savedText || null,
            mediaUrl: u.url,
            mediaType,
            mediaName: u.file.name,
            mediaItems: null,
            senderId: user.uid,
            senderName: user.displayName,
            createdAt: serverTimestamp(),
            read: false,
            deleted: false,
            deletedFor: [],
          },
          previewText,
        );
      } else {
        // ── Multiple files → one message with mediaItems array ──
        const mediaItems = uploaded.map((u) => ({
          url: u.url,
          type: getMediaType(u.file),
          name: u.file.name,
        }));
        const hasVideo = mediaItems.some((m) => m.type === "video");
        const previewText = `${hasVideo ? "🎬" : "📷"} ${uploaded.length} ${hasVideo ? "items" : "photos"}`;
        await saveMessage(
          {
            text: savedText || null,
            mediaUrl: null,
            mediaType: "multi",
            mediaName: null,
            mediaItems,
            senderId: user.uid,
            senderName: user.displayName,
            createdAt: serverTimestamp(),
            read: false,
            deleted: false,
            deletedFor: [],
          },
          previewText,
        );
      }
    } catch (err) {
      console.error("Send error:", err);
      if (!cancelUploadRef.current) {
        setText(savedText);
      }
    }

    if (!cancelUploadRef.current) {
      setSending(false);
      setUploadProgress(0);
    }
  };

  /* ─── Voice recording ─── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const file = new File([blob], `voice_${Date.now()}.${ext}`, {
          type: mimeType,
        });
        await sendVoiceNote(file);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000,
      );
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setRecordingSeconds(0);
  };

  const sendVoiceNote = async (file) => {
    if (!activeChatId) return;
    setSending(true);
    try {
      const { url } = await uploadToCloudinary(file, setUploadProgress);
      await saveMessage(
        {
          text: null,
          mediaUrl: url,
          mediaType: "audio",
          mediaName: file.name,
          mediaItems: null,
          senderId: user.uid,
          senderName: user.displayName,
          createdAt: serverTimestamp(),
          read: false,
          deleted: false,
          deletedFor: [],
        },
        "🎤 Voice note",
      );
    } catch (err) {
      console.error("Voice send error:", err);
    }
    setSending(false);
    setUploadProgress(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ─── Drag-and-drop ─── */
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (e.dataTransfer.files?.length) stageFiles(e.dataTransfer.files);
    },
    [stagedFiles],
  );

  const handleDragOver = (e) => e.preventDefault();

  const grouped = groupMessagesByDate(messages);
  const headerName = isGroup ? group?.name : peer?.displayName;
  const headerSub = isGroup
    ? `${group?.members?.length || 0} members`
    : peer?.online
      ? "online"
      : formatLastSeen(peer?.lastSeen);
  const headerOnline = !isGroup && peer?.online;
  const canSend = (text.trim() || stagedFiles.length > 0) && !sending;
  const fmtSecs = (s) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Show overlay loader when uploading media files
  const showUploadOverlay = sending && uploadProgress > 0;

  return (
    <div
      className="flex flex-col h-full w-full relative"
      style={{ background: "#07050f" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* ── Upload overlay loader ── */}
      {showUploadOverlay && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="rounded-2xl px-10 py-8 flex flex-col items-center gap-5 shadow-2xl border border-white/10 relative"
            style={{ background: "#13102a" }}
          >
            {/* Cancel button - top right */}
            <button
              onClick={handleCancelUpload}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-400 flex items-center justify-center text-white shadow-lg transition-colors z-10"
              title="Cancel upload"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>

            {/* Spinning ring */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-[#818cf8] border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#818cf8] text-xs font-bold">
                  {uploadProgress}%
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-[#e2e8f0] text-sm font-semibold">
                Sending media…
              </p>
              <p className="text-[#94a3b8] text-xs">
                {stagedFiles.length > 0
                  ? `Uploading ${stagedFiles.length} file${stagedFiles.length > 1 ? "s" : ""}…`
                  : "Please wait"}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-52 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#818cf8] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {/* Cancel button at bottom */}
            <button
              onClick={handleCancelUpload}
              className="mt-2 px-6 py-2 rounded-xl border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 flex-shrink-0 border-b border-white/5"
        style={{ background: "#13102a" }}
      >
        <button
          onClick={closeChat}
          className="md:hidden text-[#94a3b8] hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M20 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H20c.55 0 1-.45 1-1s-.45-1-1-1z" />
          </svg>
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={isGroup ? null : peer?.photoURL}
            name={headerName || ""}
            size={10}
            online={headerOnline}
            isGroup={isGroup}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[#e2e8f0] text-sm font-semibold truncate">
              {headerName || "Loading…"}
            </p>
            <p
              className={`text-xs truncate ${headerOnline ? "text-emerald-400" : "text-[#94a3b8]"}`}
            >
              {headerSub}
            </p>
          </div>
        </div>
        <div className="text-[#94a3b8] flex justify-between w-14">
          <button onClick={callClicked}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-current"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
          <button onClick={callClicked}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-current"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div
        className="flex-1 overflow-y-auto py-3"
        style={{ background: "#07050f" }}
      >
        {Object.entries(grouped).map(([dateLabel, msgs]) => (
          <div key={dateLabel}>
            <div className="flex items-center justify-center my-4">
              <span
                className="text-[#e2e8f0] text-[11px] font-medium px-3 py-1 rounded-full shadow-sm"
                style={{ background: "#1a1635" }}
              >
                {dateLabel}
              </span>
            </div>
            {msgs.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                chatId={activeChatId}
                isGroup={isGroup}
              />
            ))}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 pt-16">
            <div
              className="rounded-2xl px-6 py-4 max-w-xs shadow-sm border border-white/5"
              style={{ background: "#1a1635" }}
            >
              <p className="text-[#94a3b8] text-sm leading-relaxed">
                🔒{" "}
                {isGroup
                  ? `Welcome to "${group?.name || "this group"}"! Messages are end-to-end encrypted.`
                  : "Messages are end-to-end encrypted. No one outside this chat can read them."}
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Multi-media preview strip ── */}
      {stagedFiles.length > 0 && (
        <div
          className="flex-shrink-0 border-t border-white/5 px-3 pb-3"
          style={{ background: "#160f2a", paddingTop: "22px" }}
        >
          {/* Scrollable preview row — overflow-y must be visible for the remove button */}
          <div
            className="flex items-center gap-2 pb-1 px-1"
            style={{
              overflowX: "auto",
              overflowY: "visible",
              paddingTop: "10px",
            }}
          >
            {stagedFiles.map((item) => (
              <div
                key={item.id}
                className="relative flex-shrink-0 group/thumb"
                style={{ overflow: "visible" }}
              >
                {item.type === "video" ? (
                  <video
                    src={item.preview}
                    className="h-20 w-28 object-cover rounded-xl border border-white/10"
                    muted
                  />
                ) : (
                  <img
                    src={item.preview}
                    alt="preview"
                    className="h-20 w-20 object-cover rounded-xl border border-white/10"
                  />
                )}
                {/* Type badge */}
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                  {item.type === "video" ? "🎬" : "📷"}
                </span>
                {/* Remove button */}
                <button
                  onClick={() => removeStagedFile(item.id)}
                  className="absolute -right-2 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-400 flex items-center justify-center text-white transition-colors opacity-0 group-hover/thumb:opacity-100"
                  style={{ top: "-10px", zIndex: 50 }}
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add more button — always visible, no limit */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 h-20 w-14 rounded-xl border-2 border-dashed border-white/20 hover:border-[#818cf8] flex flex-col items-center justify-center gap-1 text-[#94a3b8] hover:text-[#818cf8] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span className="text-[10px]">Add</span>
            </button>

            {/* Clear all */}
            <button
              onClick={clearAllMedia}
              className="flex-shrink-0 h-20 w-14 rounded-xl border border-white/10 hover:border-rose-500/50 flex flex-col items-center justify-center gap-1 text-[#94a3b8] hover:text-rose-400 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              <span className="text-[10px]">Clear</span>
            </button>
          </div>

          <p className="text-[#94a3b8] text-[10px] mt-1.5">
            {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""}{" "}
            selected
          </p>
        </div>
      )}

      {/* ── Voice recording bar ── */}
      {recording && (
        <div
          className="flex-shrink-0 border-t border-white/5 px-4 py-3 flex items-center gap-4"
          style={{ background: "#160f2a" }}
        >
          <button
            onClick={cancelRecording}
            className="text-rose-400 hover:text-rose-300 transition-colors"
            title="Cancel"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[#e2e8f0] text-sm font-mono">
              {fmtSecs(recordingSeconds)}
            </span>
            <span className="text-[#94a3b8] text-xs">Recording…</span>
          </div>
          <button
            onClick={stopRecording}
            className="w-10 h-10 rounded-full bg-[#4f46e5] hover:bg-[#4338ca] flex items-center justify-center text-white shadow-md transition-colors"
            title="Send voice note"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Input bar ── */}
      {!recording && (
        <div
          className="flex items-end gap-2 px-3 py-2.5 flex-shrink-0"
          style={{ background: "#13102a" }}
        >
          {/* Hidden file input — multiple enabled, no limit */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_MEDIA}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) stageFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach photos/videos"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#94a3b8] hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 relative"
            style={{ background: "#211d3a" }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM17 11h-4v4h-2v-4H7V9h4V5h2v4h4v2z" />
            </svg>
            {stagedFiles.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#4f46e5] text-white text-[10px] font-bold flex items-center justify-center">
                {stagedFiles.length}
              </span>
            )}
          </button>

          {/* Text input */}
          <div
            className="flex-1 rounded-2xl flex items-end px-4 py-2.5 min-h-[44px]"
            style={{ background: "#211d3a" }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                stagedFiles.length > 0 ? "Add a caption…" : "Type a message"
              }
              className="flex-1 bg-transparent text-[#e2e8f0] placeholder-[#94a3b8] text-sm outline-none resize-none leading-5 py-0 max-h-28 self-center"
              style={{ height: "20px" }}
            />
          </div>

          {/* Send or mic */}
          {canSend ? (
            <button
              onClick={sendMessage}
              disabled={sending}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-md transition-all duration-150 flex-shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          ) : (
            <button
              onClick={startRecording}
              title="Record voice note"
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#94a3b8] hover:text-white transition-all duration-150 flex-shrink-0"
              style={{ background: "#211d3a" }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
