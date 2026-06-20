import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import Avatar from './Avatar';

const NewGroupModal = ({ onClose }) => {
  const { user } = useAuth();
  const { openGroupChat } = useChat();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

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
        const users = snap.docs
          .map(d => d.data())
          .filter(u => u.uid !== user.uid && !selected.find(s => s.uid === u.uid));
        setResults(users);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, user.uid, selected]);

  const toggleSelect = (u) => {
    setSelected(prev =>
      prev.find(s => s.uid === u.uid) ? prev.filter(s => s.uid !== u.uid) : [...prev, u]
    );
    setResults([]);
    setSearch('');
  };

  const createGroup = async () => {
    if (!groupName.trim() || selected.length < 1) return;
    setCreating(true);
    try {
      const groupRef = doc(collection(db, 'groups'));
      const memberIds = [user.uid, ...selected.map(u => u.uid)];
      const groupData = {
        id: groupRef.id,
        name: groupName.trim(),
        createdBy: user.uid,
        members: memberIds,
        memberDetails: [
          { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL },
          ...selected.map(u => ({ uid: u.uid, displayName: u.displayName, photoURL: u.photoURL }))
        ],
        lastMessage: '',
        lastSenderName: '',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      await setDoc(groupRef, groupData);
      openGroupChat(groupRef.id, groupData);
      onClose();
    } catch (err) {
      console.error('Create group error:', err);
    }
    setCreating(false);
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
          <button onClick={step === 1 ? onClose : () => setStep(1)} className="text-[#94a3b8] hover:text-white transition-colors p-1">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z"/>
            </svg>
          </button>
          <div>
            <h2 className="text-[#e2e8f0] font-semibold text-base">New Group</h2>
            <p className="text-[#94a3b8] text-xs">
              {step === 1 ? 'Add participants' : 'Name your group'}
            </p>
          </div>
        </div>

        {step === 1 ? (
          <>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
                {selected.map(u => (
                  <div key={u.uid} className="flex items-center gap-1.5 bg-[#4f46e5]/20 text-[#818cf8] text-xs rounded-full px-2.5 py-1">
                    <span>{u.displayName}</span>
                    <button onClick={() => toggleSelect(u)} className="hover:text-white">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

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
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#818cf8] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loading && results.length === 0 && search.length >= 2 && (
                <p className="text-[#94a3b8] text-sm text-center py-8">No users found</p>
              )}
              {!loading && search.length < 2 && results.length === 0 && (
                <p className="text-[#94a3b8] text-xs text-center py-8">Type to search for people to add</p>
              )}
              {results.map(u => (
                <button
                  key={u.uid}
                  onClick={() => toggleSelect(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <Avatar src={u.photoURL} name={u.displayName} size={10} online={u.online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e2e8f0] text-sm font-medium truncate">{u.displayName}</p>
                    <p className="text-[#94a3b8] text-xs truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>

            {selected.length > 0 && (
              <div className="px-4 py-3 border-t border-white/5">
                <button
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Next
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#211d3a' }}>
                👥
              </div>
              <div className="flex-1">
                <input
                  autoFocus
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createGroup()}
                  placeholder="Group name"
                  maxLength={50}
                  className="w-full bg-transparent border-b border-[#818cf8] text-[#e2e8f0] text-lg outline-none pb-1 placeholder-[#94a3b8]"
                />
                <p className="text-[#94a3b8] text-xs mt-1">{groupName.length}/50</p>
              </div>
            </div>

            <div>
              <p className="text-[#94a3b8] text-xs mb-2">Participants: {selected.length + 1}</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-[#211d3a] text-[#94a3b8] px-2.5 py-1 rounded-full">
                  You
                </span>
                {selected.map(u => (
                  <span key={u.uid} className="text-xs bg-[#211d3a] text-[#94a3b8] px-2.5 py-1 rounded-full">
                    {u.displayName}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={createGroup}
              disabled={!groupName.trim() || creating}
              className="w-full flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create Group</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewGroupModal;
