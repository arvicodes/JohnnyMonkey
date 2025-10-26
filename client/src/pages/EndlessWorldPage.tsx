import React, { useEffect, useRef } from 'react';

const EndlessWorldPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the HTML game content
    const loadGame = async () => {
      if (containerRef.current) {
        try {
          // Fetch the HTML file
          const response = await fetch('/endless-world/index.html');
          const html = await response.text();
          
          // Create a container for the game
          const gameContainer = document.createElement('div');
          gameContainer.innerHTML = html;
          
          // Find and execute the script
          const scripts = gameContainer.querySelectorAll('script');
          const script = scripts[scripts.length - 1]; // Get main.js
          
          if (script) {
            const newScript = document.createElement('script');
            newScript.src = '/endless-world/main.js';
            document.body.appendChild(newScript);
          }
          
          // Remove the script tag from the container
          scripts.forEach(s => s.remove());
          
          // Append the HTML to our container
          containerRef.current.appendChild(gameContainer);
        } catch (error) {
          console.error('Error loading game:', error);
        }
      }
    };
    
    loadGame();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default EndlessWorldPage;
