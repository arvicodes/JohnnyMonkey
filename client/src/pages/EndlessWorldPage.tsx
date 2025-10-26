import React from 'react';

const EndlessWorldPage: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <iframe
        src="/endless-world/index.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0
        }}
        title="Endless World Game"
      />
    </div>
  );
};

export default EndlessWorldPage;
