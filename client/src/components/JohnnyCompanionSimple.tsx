import React, { useState, useEffect, useRef } from 'react';
import './JohnnyCompanion.css';

interface JohnnyCompanionSimpleProps {
  userId: string;
  userRole?: 'TEACHER' | 'STUDENT';
  currentPage?: string;
  showMotivation?: boolean;
  onInteraction?: () => void;
}

interface MotivationalMessage {
  id: string;
  text: string;
  type: 'encouragement' | 'celebration' | 'reminder' | 'tip' | 'achievement';
  duration?: number;
}

const JohnnyCompanionSimple: React.FC<JohnnyCompanionSimpleProps> = ({
  userId,
  userRole = 'STUDENT',
  currentPage = 'dashboard',
  showMotivation = false,
  onInteraction
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentMessage, setCurrentMessage] = useState<MotivationalMessage | null>(null);
  const [isIdle, setIsIdle] = useState(true);
  const [animationState, setAnimationState] = useState<'idle' | 'happy' | 'celebrating' | 'walking' | 'jumping'>('walking');
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({
    totalQuizzesCompleted: 0,
    totalFlashcardsStudied: 0,
    totalPointsEarned: 0,
    currentStreak: 0,
    lastActivity: null as Date | null
  });
  
  // Free roaming animation state
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [direction, setDirection] = useState({ x: 1, y: 1 });
  const [speed, setSpeed] = useState(0.5);
  const [isMoving, setIsMoving] = useState(true);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastDragTime, setLastDragTime] = useState(0);
  
  // Monkey expressions
  const [monkeyExpression, setMonkeyExpression] = useState('🐒');
  const [messageVariations, setMessageVariations] = useState(0);
  
  const messageTimeoutRef = useRef<NodeJS.Timeout>();
  const idleTimeoutRef = useRef<NodeJS.Timeout>();
  const animationRef = useRef<number>();

  // Load progress from localStorage
  useEffect(() => {
    if (!userId) return;
    
    const savedProgress = localStorage.getItem(`learningProgress_${userId}`);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress({
          ...parsed,
          lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : null
        });
      } catch (error) {
        console.error('Error loading learning progress:', error);
      }
    }
  }, [userId]);

  // Save progress to localStorage
  useEffect(() => {
    if (!userId) return;
    
    localStorage.setItem(`learningProgress_${userId}`, JSON.stringify(progress));
  }, [progress, userId]);

  // Motivational messages
  const motivationalMessages: Record<string, MotivationalMessage[]> = {
    dashboard: [
      { id: '1', text: 'Bereit für eine neue Lerneinheit? 🚀', type: 'encouragement' },
      { id: '2', text: `Wow! ${progress.currentStreak} Tage in Folge! 🔥`, type: 'achievement' },
      { id: '3', text: 'Lass uns gemeinsam lernen! 📚', type: 'encouragement' },
      { id: '4', text: `Du hast bereits ${progress.totalPointsEarned} Punkte gesammelt! 🏆`, type: 'celebration' },
      { id: '5', text: 'Hallo! Wie geht es dir heute? 😊', type: 'encouragement' },
      { id: '6', text: 'Lernen macht Spaß! 🎉', type: 'encouragement' },
      { id: '7', text: 'Du schaffst das! 💪', type: 'encouragement' },
      { id: '8', text: 'Jeder Tag ist ein neuer Anfang! 🌅', type: 'tip' },
      { id: '9', text: 'Wissen ist der Schlüssel! 🔑', type: 'tip' },
      { id: '10', text: 'Lass uns die Welt entdecken! 🌍', type: 'encouragement' }
    ],
    quiz: [
      { id: '11', text: 'Zeig mir was du kannst! 🎯', type: 'encouragement' },
      { id: '12', text: 'Richtig gut gemacht! 🎉', type: 'celebration' },
      { id: '13', text: 'Fast geschafft! Weiter so! 🔥', type: 'encouragement' },
      { id: '14', text: `Das war dein ${progress.totalQuizzesCompleted + 1}. Quiz! 🎊`, type: 'achievement' },
      { id: '15', text: 'Konzentration ist der Schlüssel! 🧠', type: 'tip' },
      { id: '16', text: 'Denk nach, dann antworte! 🤔', type: 'tip' },
      { id: '17', text: 'Du bist schlau! 🎓', type: 'celebration' },
      { id: '18', text: 'Löse das Rätsel! 🧩', type: 'encouragement' },
      { id: '19', text: 'Vertraue auf dein Wissen! ✨', type: 'encouragement' },
      { id: '20', text: 'Zeig mir dein Gehirn! 🧠⚡', type: 'encouragement' }
    ],
    flashcards: [
      { id: '21', text: 'Wiederholung macht den Meister! 🔄', type: 'tip' },
      { id: '22', text: 'Super! Du merkst dir das gut! 🧠', type: 'celebration' },
      { id: '23', text: 'Lass uns die Karten durchgehen! 🃏', type: 'encouragement' },
      { id: '24', text: `Du hast ${progress.totalFlashcardsStudied} Karten gelernt! 📚`, type: 'achievement' },
      { id: '25', text: 'Merke dir alles! 🧠💭', type: 'tip' },
      { id: '26', text: 'Lerne fleißig! 📖', type: 'encouragement' },
      { id: '27', text: 'Wissen sammeln! 🗂️', type: 'encouragement' },
      { id: '28', text: 'Werde zum Meister! 🥇', type: 'celebration' },
      { id: '29', text: 'Dein Gedächtnis wird besser! 🧠', type: 'encouragement' },
      { id: '30', text: 'Karten sind deine Freunde! 🃏❤️', type: 'encouragement' }
    ],
    geocoding: [
      { id: '31', text: 'Auf zur nächsten Station! 🗺️', type: 'encouragement' },
      { id: '32', text: 'Du bist ein echter Entdecker! 🏆', type: 'celebration' },
      { id: '33', text: 'Die Schätze warten auf dich! 💎', type: 'encouragement' },
      { id: '34', text: 'Erkunde neue Welten! 🌍', type: 'encouragement' },
      { id: '35', text: 'Entdecke Geheimnisse! 🔍', type: 'encouragement' },
      { id: '36', text: 'Lass uns reisen! ✈️', type: 'encouragement' },
      { id: '37', text: 'Die Welt ist groß! 🌎', type: 'tip' },
      { id: '38', text: 'Abenteuer warten! 🏔️', type: 'encouragement' }
    ]
  };

  // Show motivational message
  const showMessage = (message: MotivationalMessage) => {
    setCurrentMessage(message);
    setAnimationState('happy');
    setIsIdle(false);
    
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    
    messageTimeoutRef.current = setTimeout(() => {
      setCurrentMessage(null);
      setAnimationState('idle');
      setIsIdle(true);
    }, message.duration || 4000);
  };

  // Random idle messages
  useEffect(() => {
    if (!isIdle || currentMessage) return;

    const showIdleMessage = () => {
      const messages = motivationalMessages[currentPage] || motivationalMessages.dashboard;
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setMessageVariations(prev => prev + 1);
      showMessage(randomMessage);
    };

    const scheduleNextIdle = () => {
      const delay = 15000 + Math.random() * 15000; // 15-30 seconds
      idleTimeoutRef.current = setTimeout(() => {
        if (isIdle && !currentMessage) {
          showIdleMessage();
          scheduleNextIdle();
        }
      }, delay);
    };

    scheduleNextIdle();

    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [isIdle, currentMessage, currentPage]);

  // Special surprise messages
  useEffect(() => {
    if (messageVariations > 0 && messageVariations % 5 === 0) {
      const surpriseMessages = [
        { id: 'surprise-1', text: 'Du bist ein Superstar! ⭐', type: 'celebration' as const },
        { id: 'surprise-2', text: 'Wow! Du interagierst viel mit mir! 🤩', type: 'celebration' as const },
        { id: 'surprise-3', text: 'Du machst mich glücklich! 😊', type: 'celebration' as const },
        { id: 'surprise-4', text: 'Lass uns Freunde sein! 🤝', type: 'encouragement' as const },
        { id: 'surprise-5', text: 'Du bist mein bester Lernpartner! 🎓', type: 'celebration' as const }
      ];
      
      const randomSurprise = surpriseMessages[Math.floor(Math.random() * surpriseMessages.length)];
      setTimeout(() => {
        showMessage(randomSurprise);
      }, 1000);
    }
  }, [messageVariations]);

  // Handle click interaction
  const handleClick = (e: React.MouseEvent) => {
    // Only trigger click if it wasn't a drag
    const timeSinceDrag = Date.now() - lastDragTime;
    if (timeSinceDrag < 200) return; // Ignore clicks within 200ms of drag
    
    e.preventDefault();
    e.stopPropagation();
    
    if (onInteraction) {
      onInteraction();
    }
    
    // Stop moving and celebrate
    setIsMoving(false);
    setAnimationState('celebrating');
    setMonkeyExpression('🎉');
    
    const messages = motivationalMessages[currentPage] || motivationalMessages.dashboard;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMessageVariations(prev => prev + 1);
    showMessage(randomMessage);
    
    // Resume moving after celebration
    setTimeout(() => {
      setIsMoving(true);
      setAnimationState('walking');
      setMonkeyExpression('🐒');
    }, 2000);
  };

  // Toggle progress display
  const handleDoubleClick = () => {
    setShowProgress(!showProgress);
    setIsMoving(false);
    setAnimationState('happy');
    setMonkeyExpression('😊');
    
    // Resume moving after showing progress
    setTimeout(() => {
      setIsMoving(true);
      setAnimationState('walking');
      setMonkeyExpression('🐒');
    }, 3000);
  };

  // Right click handler
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMoving(false);
    setAnimationState('celebrating');
    setMonkeyExpression('🤔');
    
    // Show random thinking message
    const thinkingMessages = [
      { id: 'think-1', text: 'Hmm, was denkst du denn? 🤔', type: 'tip' as const },
      { id: 'think-2', text: 'Interessante Frage! 🤓', type: 'tip' as const },
      { id: 'think-3', text: 'Lass mich nachdenken... 🧠', type: 'tip' as const },
      { id: 'think-4', text: 'Das ist eine gute Idee! 💡', type: 'encouragement' as const },
      { id: 'think-5', text: 'Ich denke mit dir! 🤝', type: 'encouragement' as const },
      { id: 'think-6', text: 'Gedanken sind mächtig! ⚡', type: 'tip' as const },
      { id: 'think-7', text: 'Was für ein Rätsel! 🧩', type: 'encouragement' as const },
      { id: 'think-8', text: 'Gemeinsam sind wir schlauer! 🧠✨', type: 'encouragement' as const }
    ];
    
    const randomThinking = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
    showMessage(randomThinking);
    
    // Resume moving after celebration
    setTimeout(() => {
      setIsMoving(true);
      setAnimationState('walking');
      setMonkeyExpression('🐒');
    }, 3000);
  };

  // Middle click handler
  const handleMiddleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMoving(false);
    setAnimationState('celebrating');
    setMonkeyExpression('🎯');
    
    // Show random target message
    const targetMessages = [
      { id: 'target-1', text: 'Ziel erreicht! 🎯', type: 'achievement' as const },
      { id: 'target-2', text: 'Perfekt getroffen! 🎯', type: 'achievement' as const },
      { id: 'target-3', text: 'Volltreffer! 🎯', type: 'achievement' as const },
      { id: 'target-4', text: 'Genau richtig! ✅', type: 'celebration' as const },
      { id: 'target-5', text: 'Mission erfüllt! 🏆', type: 'achievement' as const },
      { id: 'target-6', text: 'Ziel im Visier! 👁️', type: 'encouragement' as const },
      { id: 'target-7', text: 'Auf den Punkt! 📍', type: 'celebration' as const },
      { id: 'target-8', text: 'Bingo! 🎉', type: 'celebration' as const }
    ];
    
    const randomTarget = targetMessages[Math.floor(Math.random() * targetMessages.length)];
    showMessage(randomTarget);
    
    // Resume moving after celebration
    setTimeout(() => {
      setIsMoving(true);
      setAnimationState('walking');
      setMonkeyExpression('🐒');
    }, 3000);
  };

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsMoving(false);
      setAnimationState('celebrating');
      setMonkeyExpression('⌨️');
      
      // Show random keyboard message
      const keyboardMessages = [
        { id: 'keyboard-1', text: 'Keyboard Power! ⌨️', type: 'celebration' as const },
        { id: 'keyboard-2', text: 'Tippen wie ein Profi! ⌨️', type: 'celebration' as const },
        { id: 'keyboard-3', text: 'Enter gedrückt! ⏎', type: 'encouragement' as const },
        { id: 'keyboard-4', text: 'Space für mehr! 🚀', type: 'encouragement' as const },
        { id: 'keyboard-5', text: 'Tastatur-Meister! 🎹', type: 'celebration' as const },
        { id: 'keyboard-6', text: 'Klick, klack, perfekt! ⌨️', type: 'celebration' as const },
        { id: 'keyboard-7', text: 'Digitale Magie! ✨', type: 'encouragement' as const },
        { id: 'keyboard-8', text: 'Code-Monkey aktiv! 🐒💻', type: 'celebration' as const }
      ];
      
      const randomKeyboard = keyboardMessages[Math.floor(Math.random() * keyboardMessages.length)];
      showMessage(randomKeyboard);
      
      // Resume moving after celebration
      setTimeout(() => {
        setIsMoving(true);
        setAnimationState('walking');
        setMonkeyExpression('🐒');
      }, 3000);
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    const totalActivities = progress.totalQuizzesCompleted + Math.floor(progress.totalFlashcardsStudied / 10);
    const maxActivities = 100;
    return Math.min((totalActivities / maxActivities) * 100, 100);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsMoving(false);
    setLastDragTime(Date.now());
    setMonkeyExpression('😮');
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep Johnny within screen bounds
    const boundedX = Math.max(0, Math.min(window.innerWidth - 80, newX));
    const boundedY = Math.max(0, Math.min(window.innerHeight - 80, newY));
    
    setPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setLastDragTime(Date.now());
    setMonkeyExpression('😅');
    
    // Resume movement after a short delay
    setTimeout(() => {
      setIsMoving(true);
      setMonkeyExpression('🐒');
    }, 1000);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsMoving(false);
    setLastDragTime(Date.now());
    setMonkeyExpression('😮');
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;
    
    // Keep Johnny within screen bounds
    const boundedX = Math.max(0, Math.min(window.innerWidth - 80, newX));
    const boundedY = Math.max(0, Math.min(window.innerHeight - 80, newY));
    
    setPosition({ x: boundedX, y: boundedY });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setLastDragTime(Date.now());
    setMonkeyExpression('😅');
    
    // Resume movement after a short delay
    setTimeout(() => {
      setIsMoving(true);
      setMonkeyExpression('🐒');
    }, 1000);
  };

  // Global mouse and touch events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  // Free roaming animation
  useEffect(() => {
    if (!isMoving || isDragging) return;

    const animate = () => {
      setPosition(prev => {
        let newX = prev.x + direction.x * speed;
        let newY = prev.y + direction.y * speed;
        let newDirectionX = direction.x;
        let newDirectionY = direction.y;

        // Bounce off screen edges
        if (newX <= 0 || newX >= window.innerWidth - 80) {
          newDirectionX = -newDirectionX;
          newX = Math.max(0, Math.min(window.innerWidth - 80, newX));
        }
        if (newY <= 0 || newY >= window.innerHeight - 80) {
          newDirectionY = -newDirectionY;
          newY = Math.max(0, Math.min(window.innerHeight - 80, newY));
        }

        setDirection({ x: newDirectionX, y: newDirectionY });
        return { x: newX, y: newY };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMoving, direction, speed]);

  // Random direction changes and expressions
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every 2 seconds
        setDirection({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        });
        setSpeed(0.3 + Math.random() * 0.7); // Random speed between 0.3 and 1.0
        
        // Random monkey expressions while walking
        if (isMoving && !isDragging && animationState === 'walking') {
          const expressions = ['🐒', '🙈', '🙉', '🙊', '🐵'];
          const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
          setMonkeyExpression(randomExpression);
          
          // Return to normal monkey after a short time
          setTimeout(() => {
            if (isMoving && !isDragging && animationState === 'walking') {
              setMonkeyExpression('🐒');
            }
          }, 1000);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isMoving, isDragging, animationState]);

  // Debug: Log when Johnny should be visible
  useEffect(() => {
    console.log('🐒 Johnny Companion loaded:', { userId, userRole, currentPage, isVisible });
  }, [userId, userRole, currentPage, isVisible]);

  if (!isVisible) return null;

  const progressPercentage = getProgressPercentage();

  return (
    <>
      {/* CSS Animations */}
      <style>{`
        @keyframes gentle-bounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.05) rotate(1deg); }
          75% { transform: scale(1.05) rotate(-1deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
          40%, 43% { transform: translate3d(0, -8px, 0); }
          70% { transform: translate3d(0, -4px, 0); }
          90% { transform: translate3d(0, -2px, 0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        
        @keyframes walking {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-2px) rotate(1deg); }
          50% { transform: translateY(0px) rotate(0deg); }
          75% { transform: translateY(-1px) rotate(-1deg); }
        }
        
        @keyframes celebrate {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(5deg); }
          50% { transform: scale(1.2) rotate(-5deg); }
          75% { transform: scale(1.1) rotate(3deg); }
        }
      `}</style>
      
      <div style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 50,
        transition: isMoving ? 'none' : 'all 0.3s ease'
      }}>
      {/* Progress Display */}
      {showProgress && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '0',
          marginBottom: '8px',
          width: '192px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '2px solid #dbeafe',
          padding: '16px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Dein Fortschritt</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>Gesamtfortschritt</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '8px' }}>
              <div 
                style={{ 
                  background: 'linear-gradient(to right, #3b82f6, #10b981)',
                  height: '8px',
                  borderRadius: '9999px',
                  transition: 'all 0.5s ease',
                  width: `${progressPercentage}%` 
                }}
              ></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
              <div>Quizzes: {progress.totalQuizzesCompleted}</div>
              <div>Karten: {progress.totalFlashcardsStudied}</div>
              <div>Punkte: {progress.totalPointsEarned}</div>
              <div>Serie: {progress.currentStreak}</div>
            </div>
          </div>
        </div>
      )}

      {/* Message Bubble */}
      {currentMessage && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '0',
          marginBottom: '8px',
          minWidth: '200px',
          maxWidth: '400px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '3px solid #667eea',
          padding: '16px 20px',
          animation: 'slideUp 0.4s ease-out',
          backdropFilter: 'blur(10px)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.8))'
        }}>
          <div style={{ 
            fontSize: '16px', 
            color: '#1f2937', 
            fontWeight: '600',
            lineHeight: '1.4',
            textAlign: 'center'
          }}>
            {currentMessage.text}
          </div>
          {/* Speech bubble tail */}
          <div style={{ position: 'absolute', bottom: '0', right: '24px', transform: 'translateY(100%)' }}>
            <div style={{
              width: '0',
              height: '0',
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '12px solid #667eea'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '-3px',
              left: '-9px',
              width: '0',
              height: '0',
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderTop: '9px solid white'
            }}></div>
          </div>
        </div>
      )}

      {/* Quick Help */}
      {!currentMessage && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '0',
          marginBottom: '8px',
          minWidth: '150px',
          maxWidth: '250px',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '12px',
          border: '2px solid rgba(102, 126, 234, 0.3)',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#667eea',
          fontWeight: '500',
          textAlign: 'center',
          opacity: 0.7,
          animation: 'fadeIn 2s ease-out'
        }}>
          Linksklick für Nachrichten! 🖱️
        </div>
      )}


      {/* Johnny the Monkey */}
      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onContextMenu={handleRightClick}
        onMouseUp={(e) => {
          if (e.button === 1) { // Middle mouse button
            handleMiddleClick(e);
          }
        }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
          borderRadius: '50%',
          border: '3px solid #fff',
          boxShadow: isDragging ? `
            0 16px 32px rgba(0, 0, 0, 0.4),
            0 0 0 4px rgba(102, 126, 234, 0.6),
            inset 0 2px 4px rgba(255, 255, 255, 0.4)
          ` : `
            0 8px 16px rgba(0, 0, 0, 0.2),
            0 0 0 2px rgba(102, 126, 234, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.3)
          `,
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'all 0.3s ease',
          transform: isDragging ? 'scale(1.05) rotate(5deg)' : 
                     direction.x < 0 ? 'scaleX(-1)' : 'scaleX(1)',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          if (isDragging) return;
          e.currentTarget.style.transform = `scale(1.2) ${direction.x < 0 ? 'scaleX(-1)' : 'scaleX(1)'}`;
          e.currentTarget.style.boxShadow = `
            0 12px 24px rgba(0, 0, 0, 0.3),
            0 0 0 4px rgba(255, 107, 53, 0.5),
            inset 0 2px 4px rgba(255, 255, 255, 0.4)
          `;
        }}
        onMouseLeave={(e) => {
          if (isDragging) return;
          e.currentTarget.style.transform = `scale(1) ${direction.x < 0 ? 'scaleX(-1)' : 'scaleX(1)'}`;
          e.currentTarget.style.boxShadow = `
            0 8px 16px rgba(0, 0, 0, 0.2),
            0 0 0 2px rgba(255, 107, 53, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.3)
          `;
        }}
      >
        {/* Monkey Emoji */}
        <div style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '48px',
          filter: isDragging ? 'brightness(1.2) saturate(1.3) drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          transition: 'filter 0.3s ease',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          transform: isDragging ? 'scale(1.1)' : 'scale(1)',
          animation: animationState === 'walking' ? 'walking 0.6s ease-in-out infinite' :
                     animationState === 'happy' ? 'bounce 0.5s ease-in-out 2' :
                     animationState === 'celebrating' ? 'celebrate 0.8s ease-in-out 3' : 
                     'none'
        }}>
          {monkeyExpression}
        </div>

        {/* Sparkle effect for celebrations */}
        {animationState === 'celebrating' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '4px',
                  height: '4px',
                  backgroundColor: '#fbbf24',
                  borderRadius: '50%',
                  left: `${20 + (i * 10)}%`,
                  top: `${20 + (i * 10)}%`,
                  animation: `ping 0.6s ease-in-out ${i * 0.1}s 2`
                }}
              />
            ))}
          </div>
        )}

        {/* Drag indicator */}
        {isDragging && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '20px',
            height: '20px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'white',
            fontWeight: 'bold',
            animation: 'pulse 0.5s ease-in-out infinite'
          }}>
            ✋
          </div>
        )}
      </button>

      {/* Progress indicator (small dot) */}
      {progressPercentage > 0 && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '16px',
          height: '16px',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '10px', color: 'white', fontWeight: 'bold' }}>
            {Math.min(Math.round(progressPercentage), 99)}
          </span>
        </div>
      )}


      {/* Streak indicator */}
      {progress.currentStreak > 0 && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          width: '16px',
          height: '16px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '10px', color: 'white', fontWeight: 'bold' }}>
            {Math.min(progress.currentStreak, 9)}
          </span>
        </div>
      )}

      </div>
    </>
  );
};

export default JohnnyCompanionSimple;
