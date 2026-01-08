/**
 * QRCodeDisplay Component
 * Simple QR code display using external API
 */

import React from 'react';

const QRCodeDisplay = ({ data, size = 200, isDarkMode }) => {
  // Generate QR code via external API
  // For a 100% local solution, we could use a library like 'qrcode'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=${isDarkMode ? '1a1a1a' : 'ffffff'}&color=${isDarkMode ? 'ffffff' : '000000'}`;

  return (
    <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'} flex items-center justify-center`}>
      <img
        src={qrUrl}
        alt="QR Code for remote access"
        className="rounded-lg"
        width={size}
        height={size}
      />
    </div>
  );
};

export default QRCodeDisplay;