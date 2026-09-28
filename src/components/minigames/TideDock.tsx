import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';

interface TideDockProps {
  onFinish: (stars: number, score: number) => void;
  onFail: () => void;
}

export const TideDock: React.FC<TideDockProps> = ({ onFinish, onFail }) => {
  const [tideLevel, setTideLevel] = useState(20); // 0 (low tide) to 100 (peak spring tide)
  const [tideDirection, setTideDirection] = useState(1);
  const [shipX, setShipX] = useState(10); // ship position percentage 10% to 90%
  const [isSailing, setIsSailing] = useState(false);
  const [dockedCount, setDockedCount] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(4);
  const [feedback, setFeedback] = useState<string | null>(null);

  const tideLevelRef = useRef(tideLevel);
  tideLevelRef.current = tideLevel;
  const dockedCountRef = useRef(dockedCount);
  dockedCountRef.current = dockedCount;
  const attemptsLeftRef = useRef(attemptsLeft);
  attemptsLeftRef.current = attemptsLeft;
  const isSailingRef = useRef(isSailing);
  isSailingRef.current = isSailing;

  // Tide oscillation (Gulf of Khambhat tide simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      setTideLevel((prev) => {
        let next = prev + tideDirection * 1.6;
        if (next >= 100) {
          setTideDirection(-1);
          next = 100;
        } else if (next <= 0) {
          setTideDirection(1);
          next = 0;
        }
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [tideDirection]);

  // Ship movement when sailing forward
  useEffect(() => {
    if (!isSailing) return;

    const shipInterval = setInterval(() => {
      setShipX((prev) => {
        const next = prev + 3;
        // Check if reached dock basin (80%)
        if (next >= 80) {
          setIsSailing(false);
          const currentTide = tideLevelRef.current;
          // Check tide level at arrival: Safe window between 60% and 98%
          if (currentTide >= 60 && currentTide <= 98) {
            sound.playCorrect();
            const newCount = dockedCountRef.current + 1;
            setDockedCount(newCount);
            setFeedback('⛵ SUCCESS! High tide buoyed the dhow smoothly into the basin!');
            checkEndGame(newCount, attemptsLeftRef.current - 1);
          } else {
            sound.playWrong();
            setFeedback('💥 GROUNDED! Tide was too shallow or chaotic! Hull scraped the brick sill.');
            checkEndGame(dockedCountRef.current, attemptsLeftRef.current - 1);
          }
          return 10; // reset ship
        }
        return next;
      });
    }, 40);

    return () => clearInterval(shipInterval);
  }, [isSailing]);

  // Keyboard controls: Space or Enter to launch ship
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleLaunchShip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSailing]);

  const handleLaunchShip = () => {
    if (isSailingRef.current) return;
    setIsSailing(true);
    sound.playEat();
    setFeedback('Ship navigating the tidal channel...');
  };

  const checkEndGame = (finalCount: number, remainingAttempts: number) => {
    setAttemptsLeft(remainingAttempts);

    if (remainingAttempts <= 0 || finalCount >= 3) {
      setTimeout(() => {
        let stars = 0;
        if (finalCount >= 3) stars = 3;
        else if (finalCount === 2) stars = 2;
        else if (finalCount === 1) stars = 1;

        if (stars >= 1) {
          onFinish(stars, finalCount * 100);
        } else {
          onFail();
        }
      }, 900);
    }
  };

  const isSafeTide = tideLevel >= 60 && tideLevel <= 98;

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      {/* Top Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>
          Docked Ships: <strong style={{ color: 'var(--terracotta-dark)', fontSize: '18px' }}>{dockedCount} / 3</strong>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>
          Attempts Remaining: {attemptsLeft}
        </div>
        <div 
          style={{
            fontSize: '12px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '6px',
            background: isSafeTide ? '#E8F5E9' : '#FFEBEE',
            color: isSafeTide ? '#2E7D32' : 'var(--lac-red)'
          }}
        >
          {isSafeTide ? '🌊 HIGH SPRING TIDE (SAFE TO ENTER)' : '⚠️ SHALLOW EBB TIDE (RISK)'}
        </div>
      </div>

      {/* Dock Basin Graphic Canvas View */}
      <div 
        style={{
          width: '100%',
          height: '180px',
          background: '#C8B69B',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          border: '3px solid var(--earth-border)',
          marginBottom: '16px'
        }}
      >
        {/* Tidal Water Level Overlay */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${tideLevel}%`,
            background: 'linear-gradient(180deg, #5C94B2 0%, #2A5A78 100%)',
            transition: 'height 0.1s linear',
            opacity: 0.85
          }}
        />

        {/* High Tide Target Sluice Line */}
        <div 
          style={{
            position: 'absolute',
            bottom: '60%',
            left: 0,
            right: 0,
            height: '2px',
            borderTop: '2px dashed #FFF',
            opacity: 0.7
          }}
        >
          <span style={{ position: 'absolute', right: '10px', top: '-18px', fontSize: '10px', color: '#FFF', fontWeight: 700 }}>
            Flotation Depth Threshold (60%)
          </span>
        </div>

        {/* Brick Wharf Pier on Right */}
        <div 
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '100px',
            background: '#8D3B1B',
            borderLeft: '4px solid #5D4037',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontSize: '11px',
            fontWeight: 800,
            textShadow: '0 1px 2px rgba(0,0,0,0.6)'
          }}
        >
          <span>⚓</span>
          <span>Lothal Dock</span>
          <span>Wharf</span>
        </div>

        {/* The Merchant Ship */}
        <div 
          style={{
            position: 'absolute',
            left: `${shipX}%`,
            bottom: `${Math.max(15, tideLevel * 0.8)}%`,
            fontSize: '34px',
            transform: 'translate(-50%, 0)',
            transition: isSailing ? 'none' : 'bottom 0.1s linear',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
          }}
        >
          ⛵
        </div>
      </div>

      {/* Realtime Feedback */}
      <div style={{ minHeight: '26px', fontSize: '14px', fontWeight: 800, color: 'var(--terracotta-dark)', marginBottom: '14px' }}>
        {feedback || 'Wait for the tide to rise above the line, then launch the ship!'}
      </div>

      {/* Launch Ship Action Button */}
      <button 
        className="btn-primary"
        disabled={isSailing}
        onClick={handleLaunchShip}
        style={{
          width: '220px',
          height: '56px',
          fontSize: '16px',
          borderRadius: '28px',
          opacity: isSailing ? 0.6 : 1,
          cursor: isSailing ? 'not-allowed' : 'pointer'
        }}
      >
        {isSailing ? 'Sailing Inlet...' : '🚢 LAUNCH INTO DOCK'}
      </button>

      <div style={{ fontSize: '11px', color: '#888', marginTop: '10px' }}>
        Desktop: Press [Space] or [Enter] • Dock at high tide (+60%) to prevent scraping the brick sill.
      </div>
    </div>
  );
};
