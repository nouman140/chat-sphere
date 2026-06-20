import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider, useChat } from "./contexts/ChatContext";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import EmptyState from "./components/EmptyState";
import { Toaster } from "react-hot-toast";

const AppLayout = () => {
  const { user } = useAuth();
  const { activeChatId, showSidebar } = useChat();

  if (!user) return <LoginScreen />;

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: "#0a0818" }}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1F2937",
            color: "#FFFFFF",
            padding: "16px 20px",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: {
            style: {
              background: "#10B981",
              color: "#FFFFFF",
            },
          },
          error: {
            style: {
              background: "#EF4444",
              color: "#FFFFFF",
            },
          },
        }}
      />
      <Sidebar />
      <div
        className={`flex-1 flex flex-col min-w-0 ${!showSidebar ? "flex" : "hidden md:flex"}`}
      >
        {activeChatId ? <ChatWindow /> : <EmptyState />}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppLayout />
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
