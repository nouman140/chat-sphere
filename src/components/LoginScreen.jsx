import React from "react";
import { useAuth } from "../contexts/AuthContext";

const LoginScreen = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#4f46e5" }}
    >
      {/* Top gradient accent */}
      <div className="h-[220px] w-full flex-shrink-0 bg-#4f46e5" />

      <div className="flex-1 flex flex-col items-center -mt-16 px-6 pb-8">
        {/* Logo card */}
        <div
          className="w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
          style={{ background: "#13102a" }}
        >
          {/* Logo row */}
          <div className="flex flex-col items-center pt-8 pb-6 px-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 200 200"
                width="200"
                height="200"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="95"
                  fill="#4A90D9"
                  stroke="#2C5F8A"
                  strokeWidth="3"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.5"
                />
                <g transform="translate(100, 100)">
                  <path
                    d="M-18,-8 C-18,-18 18,-18 18,-8 L18,8 C18,18 -18,18 -18,8 Z"
                    fill="white"
                    opacity="0.9"
                  />
                  <polygon points="-6,8 0,16 6,8" fill="white" opacity="0.9" />
                  <circle cx="-8" cy="2" r="2.5" fill="#4A90D9" />
                  <circle cx="0" cy="2" r="2.5" fill="#4A90D9" />
                  <circle cx="8" cy="2" r="2.5" fill="#4A90D9" />
                </g>

                <circle cx="100" cy="30" r="5" fill="white" opacity="0.7" />
                <circle cx="100" cy="170" r="5" fill="white" opacity="0.7" />
                <circle cx="30" cy="100" r="5" fill="white" opacity="0.7" />
                <circle cx="170" cy="100" r="5" fill="white" opacity="0.7" />

                <circle cx="50" cy="50" r="4" fill="white" opacity="0.5" />
                <circle cx="150" cy="50" r="4" fill="white" opacity="0.5" />
                <circle cx="50" cy="150" r="4" fill="white" opacity="0.5" />
                <circle cx="150" cy="150" r="4" fill="white" opacity="0.5" />
              </svg>
            </div>

            <h1 className="text-[#e2e8f0] text-2xl font-bold tracking-tight">
              ChatSphere
            </h1>
            <p className="text-[#94a3b8] text-sm mt-1">
              Private Chats With Your Loved Ones
            </p>
          </div>

          <div className="h-px mx-6" style={{ background: "#2d2a4a" }} />

          <div className="px-8 py-6 flex flex-col gap-5">
            <div className="text-center">
              <p className="text-[#e2e8f0] text-base font-medium">
                Sign in to get started
              </p>
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-800 font-semibold py-3 px-6 rounded-2xl transition-all duration-150 shadow-lg"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        <p className="text-gray-100 text-xs text-center mt-6 max-w-xs leading-relaxed">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
