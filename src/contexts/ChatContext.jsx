import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [activeChatId, setActiveChatId] = useState(null);
  const [activePeer, setActivePeer] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null); // group chat object
  const [chatType, setChatType] = useState(null); // 'direct' | 'group'
  const [showSidebar, setShowSidebar] = useState(true);

  const openChat = (chatId, peer) => {
    setActiveChatId(chatId);
    setActivePeer(peer);
    setActiveGroup(null);
    setChatType('direct');
    setShowSidebar(false);
  };

  const openGroupChat = (chatId, group) => {
    setActiveChatId(chatId);
    setActiveGroup(group);
    setActivePeer(null);
    setChatType('group');
    setShowSidebar(false);
  };

  const closeChat = () => {
    setActiveChatId(null);
    setActivePeer(null);
    setActiveGroup(null);
    setChatType(null);
    setShowSidebar(true);
  };

  return (
    <ChatContext.Provider value={{
      activeChatId, activePeer, activeGroup, chatType,
      openChat, openGroupChat, closeChat,
      showSidebar, setShowSidebar
    }}>
      {children}
    </ChatContext.Provider>
  );
};