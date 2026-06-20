import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import Avatar from "./Avatar";
import NewChatModal from "./NewChatModal";
import NewGroupModal from "./NewGroupModal";
import { formatTimestamp } from "../utils/helpers";

const TABS = [
  { key: "all", label: "All" },
  { key: "direct", label: "Chats" },
  { key: "groups", label: "Groups" },
];

const mediaIcon = (msg) => {
  if (!msg) return "";
  if (msg === "📷 Photo") return "📷 Photo";
  if (msg === "🎬 Video") return "🎬 Video";
  if (msg === "🎤 Voice note") return "🎤 Voice note";
  return msg;
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { activeChatId, openChat, openGroupChat, closeChat, showSidebar } =
    useChat();
  const [directChats, setDirectChats] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
    );
    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const peerId = data.participants.find((id) => id !== user.uid);
          let peer = null;
          if (peerId) {
            const peerDoc = await getDoc(doc(db, "users", peerId));
            if (peerDoc.exists()) peer = peerDoc.data();
          }
          return { id: d.id, type: "direct", ...data, peer };
        }),
      );
      setDirectChats(list);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        type: "group",
        ...d.data(),
      }));
      setGroupChats(list);
    });
    return unsub;
  }, [user]);

  const deleteDirectChat = async (chatId) => {
    setDeletingId(chatId);
    try {
      const msgsSnap = await getDocs(
        collection(db, "chats", chatId, "messages"),
      );
      const batch = writeBatch(db);
      msgsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      await deleteDoc(doc(db, "chats", chatId));
      if (activeChatId === chatId) closeChat();
    } catch (err) {
      console.error(err);
    }
    setDeletingId(null);
  };

  const leaveGroup = async (groupId) => {
    setDeletingId(groupId);
    try {
      const groupRef = doc(db, "groups", groupId);
      const groupDoc = await getDoc(groupRef);
      if (groupDoc.exists()) {
        const newMembers = groupDoc
          .data()
          .members.filter((id) => id !== user.uid);
        if (newMembers.length === 0) {
          const msgsSnap = await getDocs(
            collection(db, "groups", groupId, "messages"),
          );
          const batch = writeBatch(db);
          msgsSnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          await deleteDoc(groupRef);
        } else {
          await updateDoc(groupRef, { members: newMembers });
        }
      }
      if (activeChatId === groupId) closeChat();
    } catch (err) {
      console.error(err);
    }
    setDeletingId(null);
  };

  const allChats = [
    ...(tab === "groups" ? [] : directChats),
    ...(tab === "direct" ? [] : groupChats),
  ].sort(
    (a, b) =>
      (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0),
  );

  const filtered = allChats.filter((c) => {
    if (!search) return true;
    const name = c.type === "group" ? c.name : c.peer?.displayName;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const totalUnread = directChats.reduce(
    (acc, c) => acc + (c.unreadCount?.[user?.uid] || 0),
    0,
  );

  return (
    <>
      <div
        className={`
          flex flex-col h-full border-r border-white/[0.06]
          ${showSidebar ? "flex" : "hidden md:flex"}
          w-full md:w-80 lg:w-[360px] flex-shrink-0
        `}
        style={{ background: "#0d0b20" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ background: "#13102a" }}
        >
          <div className="flex items-center gap-3">
            <Avatar
              src={user?.photoURL}
              name={user?.displayName || ""}
              size={10}
            />
            <div className="hidden sm:block">
              <p className="text-[#e2e8f0] text-sm font-semibold truncate max-w-[120px] leading-tight">
                {user?.displayName}
              </p>
              <p className="text-[#94a3b8] text-[10px] truncate max-w-[120px]">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowNewGroup(true)}
              title="New group"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </button>

            <button
              onClick={() => setShowNewChat(true)}
              title="New chat"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-3.663H7.041V7.438h9.975v1.943z" />
              </svg>
            </button>
            <button
              onClick={() => {
                logout();
                setShowMenu(false);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-3 pt-2 pb-1 flex-shrink-0">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "#211d3a" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-[#94a3b8] flex-shrink-0"
            >
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search or start new chat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-[#e2e8f0] placeholder-[#94a3b8] text-sm outline-none w-full"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[#94a3b8] hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex px-3 pb-2 gap-1 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`
                flex-1 py-1.5 text-xs font-semibold rounded-full transition-all duration-150
                ${
                  tab === t.key
                    ? "text-white bg-[#4f46e5]"
                    : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/5"
                }
              `}
            >
              {t.label}
              {t.key === "all" && totalUnread > 0 && (
                <span className="ml-1.5 bg-white/20 text-inherit text-[10px] rounded-full px-1.5 py-0.5">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Chat list ── */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "#211d3a" }}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#94a3b8]">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <p className="text-[#94a3b8] text-sm">
                {search ? "No results found" : "No conversations yet"}
              </p>
              {!search && (
                <button
                  onClick={() => setShowNewGroup(true)}
                  className="text-[#818cf8] text-sm hover:underline font-medium"
                >
                  Start a new Group
                </button>
              )}
            </div>
          )}

          {filtered.map((chat) => {
            const isGroup = chat.type === "group";
            const name = isGroup
              ? chat.name
              : chat.peer?.displayName || "Unknown";
            const lastMsg = mediaIcon(chat.lastMessage || "");
            const lastSender = isGroup ? chat.lastSenderName : null;
            const unread = !isGroup ? chat.unreadCount?.[user.uid] || 0 : 0;
            const isActive = activeChatId === chat.id;
            const isDeleting = deletingId === chat.id;

            return (
              <div
                key={chat.id}
                className={`
                  relative flex items-center gap-3 px-3 py-3 cursor-pointer
                  border-b border-white/[0.04] group transition-colors
                  ${isActive ? "bg-[#211d3a]" : "hover:bg-white/[0.04]"}
                  ${isDeleting ? "opacity-40 pointer-events-none" : ""}
                `}
                onClick={() =>
                  isGroup
                    ? openGroupChat(chat.id, chat)
                    : openChat(chat.id, chat.peer)
                }
              >
                <Avatar
                  src={isGroup ? null : chat.peer?.photoURL}
                  name={name}
                  size={12}
                  online={!isGroup && chat.peer?.online}
                  isGroup={isGroup}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-[#e2e8f0] text-sm font-medium truncate">
                      {name}
                    </span>
                    <span
                      className={`text-[11px] flex-shrink-0 ${unread > 0 ? "text-[#818cf8]" : "text-[#94a3b8]"}`}
                    >
                      {formatTimestamp(chat.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {!isGroup && chat.lastSenderUid === user.uid && (
                      <svg
                        viewBox="0 0 18 18"
                        className="w-3.5 h-3.5 flex-shrink-0 fill-[#94a3b8]"
                      >
                        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L2.891 8.71a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l1.999 1.926c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.064-.512z" />
                      </svg>
                    )}
                    <p className="text-[#94a3b8] text-xs truncate">
                      {isGroup && lastSender
                        ? `${lastSender}: ${lastMsg}`
                        : lastMsg || "No messages yet"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {unread > 0 && (
                    <span className="bg-[#4f46e5] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isGroup) {
                        if (window.confirm(`Leave "${name}"?`))
                          leaveGroup(chat.id);
                      } else {
                        if (window.confirm(`Delete chat with ${name}?`))
                          deleteDirectChat(chat.id);
                      }
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-all opacity-0 group-hover:opacity-100"
                    title={isGroup ? "Leave group" : "Delete chat"}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 fill-current"
                    >
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 border-t border-white/5 flex-shrink-0"
          style={{ background: "#13102a" }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-[#94a3b8] text-xs flex-1 truncate">
            End-to-end encrypted
          </span>
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 fill-[#94a3b8] flex-shrink-0"
          >
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
        </div>
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} />}
    </>
  );
};

export default Sidebar;
