import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { getChatId } from '../utils/helpers';
import Avatar from './Avatar';

const NewChatModal = ({ onClose }) => {
  const { user } = useAuth();
  const { openChat } = useChat();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const term = search.trim().toLowerCase();
        const q = query(
          collection(db, 'users'),
          where('email', '>=', term),
          where('email', '<=', term + '\uf8ff'),
          limit(10)
        );
        const snap = await getDocs(q);
        const users = snap.docs.map(d => d.data()).filter(u => u.uid !== user.uid);
        setResults(users);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, user.uid]);

  const startChat = (peer) => {
    const chatId = getChatId(user.uid, peer.uid);
    openChat(chatId, peer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{ background: '#13102a' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5" style={{ background: '#1c1833' }}>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-white transition-colors p-1">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z"/>
            </svg>
          </button>
          <div>
            <h2 className="text-[#e2e8f0] font-semibold text-base">New Chat</h2>
            <p className="text-[#94a3b8] text-xs">Search by email address</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#211d3a' }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#94a3b8] flex-shrink-0">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              autoFocus
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-[#e2e8f0] placeholder-[#94a3b8] text-sm outline-none w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#94a3b8] hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#818cf8] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && results.length === 0 && search.length >= 2 && (
            <div className="flex flex-col items-center py-10 gap-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#211d3a' }}>
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#94a3b8]">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <p className="text-[#94a3b8] text-sm">No users found</p>
            </div>
          )}
          {!loading && search.length < 2 && (
            <div className="flex flex-col items-center py-10 gap-2">
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-[#94a3b8] opacity-40">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <p className="text-[#94a3b8] text-xs">Type at least 2 characters</p>
            </div>
          )}
          {results.map(peer => (
            <button
              key={peer.uid}
              onClick={() => startChat(peer)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/[0.04]"
            >
              <Avatar src={peer.photoURL} name={peer.displayName} size={10} online={peer.online} />
              <div className="flex-1 min-w-0">
                <p className="text-[#e2e8f0] text-sm font-medium truncate">{peer.displayName}</p>
                <p className="text-[#94a3b8] text-xs truncate">{peer.email}</p>
              </div>
              {peer.online && (
                <span className="text-[10px] text-emerald-400 font-medium flex-shrink-0">online</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
