import React, { useState } from 'react';

function shareLinks(lanAddresses, path, code) {
  const port = window.location.port ? `:${window.location.port}` : '';
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const hosts = local ? lanAddresses : [window.location.hostname];
  return hosts.map(h => `http://${h}${port}${path}?room=${code}`);
}

export default function RoomCode({ code, lanAddresses, path }) {
  const [copied, setCopied] = useState('');
  const links = shareLinks(lanAddresses, path, code);

  const copy = async link => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link);
      setTimeout(() => setCopied(''), 1500);
    } catch {}
  };

  return (
    <>
      <div className="gr-room-code">
        <span className="gr-muted">קוד החדר</span>
        <span className="gr-room-code-value">{code}</span>
      </div>
      {links.length > 0 && (
        <div className="gr-share">
          <p className="gr-muted">חברים באותה רשת ביתית יכולים להיכנס בקישור:</p>
          {links.map(link => (
            <button key={link} className="gr-share-link" onClick={() => copy(link)} dir="ltr">
              {copied === link ? '✓ הועתק!' : link}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
