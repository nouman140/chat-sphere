import React from "react";

const EmptyState = () => (
  <div
    className="flex-1 flex flex-col items-center justify-center select-none"
    style={{ background: "#07050f" }}
  >
    <div className="text-center max-w-sm px-6 flex flex-col items-center gap-5">
      <div className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-xl">
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

      <div>
        <h2 className="text-[#e2e8f0] text-2xl font-light mb-2 tracking-tight">
          ChatSphere
        </h2>
      </div>

      <div
        className="flex items-center gap-2 text-[#94a3b8] text-xs px-4 py-2.5 rounded-full border border-white/5"
        style={{ background: "#13102a" }}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 fill-current flex-shrink-0"
        >
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
        messages are end-to-end encrypted
      </div>
    </div>
  </div>
);

export default EmptyState;
