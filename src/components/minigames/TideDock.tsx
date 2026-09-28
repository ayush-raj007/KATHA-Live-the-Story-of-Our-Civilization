import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';
import { TIDE_DOCK, tideDockStars } from './scoring';

interface TideDockProps {
  onFinish: (stars: number, score: number) => void;
  onFail: () => void;
}

const TIDE_TICK_MS = 30;
const TIDE_STEP = 1.6;
const SHIP_TICK_MS = 40;
const SHIP_STEP = 3;
const SHIP_START_X = 10;
const DOCK_X = 80;
const SAFE_TIDE_MIN = 60;
const SAFE_TIDE_MAX = 98;
const RESULT_DELAY_MS = 900;

export const TideDock: React.FC<TideDockProps> = ({ onFinish, onFail }) => {
  const [tideLevel, setTideLevel] = useState(20); // 0 (low tide) to 100 (peak spring tide)
  const [shipX, setShipX] = useState(SHIP_START_X); // ship position percentage 10% to 90%
  const [isSailing, setIsSailing] = useState(false);
  const [dockedCount, setDockedCount] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(TIDE_DOCK.fleets);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Game logic lives in refs and runs in timer callbacks, never inside state updaters,
  // so it runs exactly once per event (StrictMode double-invokes updaters).
  const game = useRef({
    tideLevel: 20,
    tideDirection: 1,
    shipX: SHIP_START_X,
    isSailing: false,
    docked: 0,
    attemptsLeft: TIDE_DOCK.fleets as number,
    isFinished: false
  });
  const callbacksRef = useRef({ onFinish, onFail });
  useEffect(() => {
    callbacksRef.current = { onFinish, onFail };
  }, [onFinish, onFail]);
  const resultTimeoutRef = useRef<number | null>(null);

  // Tide oscillation (Gulf of Khambhat tide simulation)
  useEffect(() => {
    const g = game.current;
    const interval = window.setInterval(() => {
      let next = g.tideLevel + g.tideDirection * TIDE_STEP;
      if (next >= 100) {
        g.tideDirection = -1;
        next = 100;
      } else if (next <= 0) {
        g.tideDirection = 1;
        next = 0;
      }
      g.tideLevel = next;
      setTideLevel(next);
    }, TIDE_TICK_MS);

    return () => clearInterval(interval);
  }, []);

  // Clear a pending result if the player closes the contest during the end-of-game pause.
  useEffect(() => () => {
    if (resultTimeoutRef.current !== null) clearTimeout(resultTimeoutRef.current);
  }, []);

  const finishGame = () => {
    const g = game.current;
    g.isFinished = true;
    resultTimeoutRef.current = window.setTimeout(() => {
      resultTimeoutRef.current = null;
      const stars = tideDockStars(g.docked);
      if (stars >= 1) {
        callbacksRef.current.onFinish(stars, g.docked * 100);
      } else {
        callbacksRef.current.onFail();
      }
    }, RESULT_DELAY_MS);
  };

  const handleArrival = () => {
    const g = game.current;
    g.isSailing = false;
    g.shipX = SHIP_START_X;
    g.attemptsLeft -= 1;
    setIsSailing(false);
    setShipX(SHIP_START_X);
    setAttemptsLeft(g.attemptsLeft);

    if (g.tideLevel >= SAFE_TIDE_MIN && g.tideLevel <= SAFE_TIDE_MAX) {
      sound.playCorrect();
      g.docked += 1;
      setDockedCount(g.docked);
      setFeedback('⛵ SUCCESS! High tide buoyed the dhow smoothly into the basin!');
    } else {
      sound.playWrong();
      setFeedback('💥 GROUNDED! Tide was too shallow or chaotic! Hull scraped the brick sill.');
    }

    if (g.attemptsLeft <= 0) finishGame();
  };

  // Ship movement when sailing forward
  useEffect(() => {
    if (!isSailing) return;
    const g = game.current;

    const shipInterval = window.setInterval(() => {
      if (!g.isSailing) return;
      g.shipX += SHIP_STEP;
      if (g.shipX >= DOCK_X) {
        handleArrival();
      } else {
        setShipX(g.shipX);
      }
    }, SHIP_TICK_MS);

    return () => clearInterval(shipInterval);
    // handleArrival only touches refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSailing]);

  const handleLaunchShip = () => {
    const g = game.current;
    if (g.isSailing || g.isFinished) return;
    g.isSailing = true;
    setIsSailing(true);
    sound.playEat();
    setFeedback('Ship navigating the tidal channel...');
  };

  // Keyboard controls: Space or Enter to launch ship
  const launchRef = useRef(handleLaunchShip);
  useEffect(() => {
    launchRef.current = handleLaunchShip;
  });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (e.repeat) return;
        launchRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isSafeTide = tideLevel >= SAFE_TIDE_MIN && tideLevel <= SAFE_TIDE_MAX;

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      {/* Top Status */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>
          Docked Ships: <strong style={{ color: 'var(--terracotta-dark)', fontSize: '18px' }}>{dockedCount} / {TIDE_DOCK.fleets}</strong>
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
        disabled={isSailing || attemptsLeft <= 0}
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
