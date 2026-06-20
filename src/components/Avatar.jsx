import React, { useState } from 'react';

const COLORS = [
  'bg-violet-700', 'bg-indigo-600', 'bg-blue-600',
  'bg-rose-600', 'bg-amber-600', 'bg-cyan-700', 'bg-fuchsia-700'
];

const Avatar = ({ src, name = '', size = 10, online = false, isGroup = false }) => {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const colorIndex = name.charCodeAt(0) % COLORS.length || 0;
  const bgColor = COLORS[colorIndex];

  const sizeMap = {
    8:  { outer: 'w-8 h-8',   text: 'text-[10px]', dot: 'w-2.5 h-2.5 border' },
    10: { outer: 'w-10 h-10', text: 'text-xs',      dot: 'w-3 h-3 border-2' },
    12: { outer: 'w-12 h-12', text: 'text-sm',      dot: 'w-3 h-3 border-2' },
    14: { outer: 'w-14 h-14', text: 'text-base',    dot: 'w-3.5 h-3.5 border-2' },
  };

  const s = sizeMap[size] || sizeMap[10];

  return (
    <div className="relative flex-shrink-0">
      <div className={`${s.outer} rounded-full overflow-hidden ${bgColor} flex items-center justify-center`}>
        {src && !imgError && !isGroup ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={`font-semibold text-white ${s.text}`}>
            {isGroup ? '👥' : (initials || '?')}
          </span>
        )}
      </div>
      {online && !isGroup && (
        <span className={`absolute bottom-0 right-0 ${s.dot} bg-emerald-400 rounded-full border-[#13102a]`} />
      )}
    </div>
  );
};

export default Avatar;
