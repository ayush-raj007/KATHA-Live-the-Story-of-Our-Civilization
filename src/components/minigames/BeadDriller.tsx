import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';
import { beadDrillerStars } from './scoring';

interface BeadDrillerProps {
  onFinish: (stars: number, score: number) => void;
  onFail: () => void;
}

const TIME_LIMIT_S = 45;
const NEEDLE_TICK_MS = 16;
const NEEDLE_MIN = 5;
const NEEDLE_MAX = 95;
const START_SPEED = 1.4;
const MAX_SPEED = 2.8;
const PERFECT_ZONE = 8; // % from centre
const GOOD_ZONE = 16;
const FINISHED_DEPTH = 85;
const MAX_CRACKS = 3;

export const BeadDriller: React.FC<BeadDrillerProps> = ({ onFinish, onFail }) => {
  const [needlePos, setNeedlePos] = useState(50); // percentage 0 to 100
  const [depth, setDepth] = useState(0); // 0 to 100% drilled
  const [score, setScore] = useState(0);
  const [cracks, setCracks] = useState(0); // max 3 cracks
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_S);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Game logic reads and writes these refs synchronously, so a tap that ends the
  // game is evaluated with its own points included. React state is for display.
  const game = useRef({
    needlePos: 50,
    direction: 1,
    speed: START_SPEED,
    depth: 0,
    score: 0,
    cracks: 0,
    combo: 0,
    timeLeft: TIME_LIMIT_S,
    isFinished: false
  });
  const callbacksRef = useRef({ onFinish, onFail });
  useEffect(() => {
    callbacksRef.current = { onFinish, onFail };
  }, [onFinish, onFail]);

  const needleTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const stopTimers = () => {
    if (needleTimerRef.current !== null) clearInterval(needleTimerRef.current);
    if (countdownRef.current !== null) clearInterval(countdownRef.current);
    needleTimerRef.current = null;
    countdownRef.current = null;
  };

  const endGame = (failed: boolean) => {
    const g = game.current;
    if (g.isFinished) return;
    g.isFinished = true;
    stopTimers();

    const stars = failed ? 0 : beadDrillerStars(g.score, g.cracks);
    if (stars >= 1) {
      callbacksRef.current.onFinish(stars, g.score);
    } else {
      callbacksRef.current.onFail();
    }
  };

  // Needle oscillation and countdown
  useEffect(() => {
    const g = game.current;
    needleTimerRef.current = window.setInterval(() => {
      let next = g.needlePos + g.direction * g.speed;
      if (next >= NEEDLE_MAX) {
        g.direction = -1;
        next = NEEDLE_MAX;
      } else if (next <= NEEDLE_MIN) {
        g.direction = 1;
        next = NEEDLE_MIN;
      }
      g.needlePos = next;
      setNeedlePos(next);
    }, NEEDLE_TICK_MS);

    countdownRef.current = window.setInterval(() => {
      g.timeLeft = Math.max(0, g.timeLeft - 1);
      setTimeLeft(g.timeLeft);
      if (g.timeLeft === 0) endGame(false);
    }, 1000);

    return stopTimers;
    // endGame only touches refs, so the timers never need restarting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrillTap = () => {
    const g = game.current;
    if (g.isFinished) return;
    sound.playDrillTap();

    const distFromCenter = Math.abs(g.needlePos - 50);

    if (distFromCenter <= PERFECT_ZONE) {
      sound.playCorrect();
      g.combo += 1;
      const addedPoints = 40 + g.combo * 10;
      g.score += addedPoints;
      g.depth = Math.min(100, g.depth + 15);
      g.speed = Math.min(MAX_SPEED, g.speed + 0.1);
      setFeedback('✨ PERFECT DRILL! (+' + addedPoints + ')');
    } else if (distFromCenter <= GOOD_ZONE) {
      g.combo = 0;
      g.score += 20;
      g.depth = Math.min(100, g.depth + 8);
      setFeedback('👍 Good bore! (+20)');
    } else {
      // Off-beat hit -> cracks the gemstone
      sound.playWrong();
      g.combo = 0;
      g.cracks += 1;
      setCracks(g.cracks);
      setFeedback('💥 CRACK! Off-center strike!');
      if (g.cracks >= MAX_CRACKS) endGame(true);
      return;
    }

    setScore(g.score);
    setDepth(g.depth);
    if (g.depth >= FINISHED_DEPTH) endGame(false);
  };

  // Keyboard controls: Space or Enter to drill (ignoring auto-repeat from a held key)
  const tapRef = useRef(handleDrillTap);
  useEffect(() => {
    tapRef.current = handleDrillTap;
  });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (e.repeat) return;
        tapRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      {/* Top Stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>
          Score: <strong style={{ color: 'var(--terracotta-dark)', fontSize: '18px' }}>{score}</strong>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: timeLeft < 10 ? 'var(--lac-red)' : 'var(--text-primary)' }}>
          ⏱️ Time: {timeLeft}s
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>
          Cracks: {'💔'.repeat(cracks) || 'None (Safe)'}
        </div>
      </div>

      {/* Carnelian Bead Drilling Visualizer */}
      <div
        style={{
          width: '100%',
          height: '110px',
          background: '#FDFBF7',
          border: '2px solid var(--earth-border)',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}
      >
        {/* Carnelian Bead Cylinder in center */}
        <div
          style={{
            width: 'min(260px, 90%)',
            height: '56px',
            background: 'linear-gradient(90deg, #B22222 0%, #E63946 50%, #B22222 100%)',
            borderRadius: '28px',
            border: '3px solid #8D3B1B',
            boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Micro-Drill Depth Bore Tube */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${depth}%`,
              height: '8px',
              background: '#FFF',
              borderRadius: '4px',
              boxShadow: '0 0 10px #FFF'
            }}
          />

        </div>

        {/* Sweet Spot Target Zone: same coordinate space as the needle (the whole track),
            so it marks exactly the perfect-hit window */}
        <div
          style={{
            position: 'absolute',
            left: `${50 - PERFECT_ZONE}%`,
            width: `${PERFECT_ZONE * 2}%`,
            top: 'calc(50% - 28px)', // aligned with the 56px bead
            height: '56px',
            background: 'rgba(76, 175, 80, 0.35)',
            borderLeft: '2px dashed #4CAF50',
            borderRight: '2px dashed #4CAF50',
            pointerEvents: 'none'
          }}
        />

        {/* Chert Micro-Drill Needle */}
        <div
          style={{
            position: 'absolute',
            left: `${needlePos}%`,
            top: '10px',
            bottom: '10px',
            width: '4px',
            background: '#2B3A67',
            borderRadius: '2px',
            boxShadow: '0 0 8px #2B3A67',
            transform: 'translateX(-50%)',
            transition: 'none'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              left: '-6px',
              width: '16px',
              height: '16px',
              background: '#2B3A67',
              borderRadius: '50%',
              color: '#FFF',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ▼
          </div>
        </div>
      </div>

      {/* Realtime Feedback Tag */}
      <div style={{ minHeight: '26px', fontSize: '14px', fontWeight: 800, color: 'var(--terracotta-dark)', marginBottom: '14px' }}>
        {feedback || 'Press Space or Click Tap when needle is inside the green target zone!'}
      </div>

      {/* Tap Action Button */}
      <button
        className="btn-primary"
        onClick={handleDrillTap}
        style={{
          width: '200px',
          height: '60px',
          fontSize: '18px',
          borderRadius: '30px',
          boxShadow: '0 6px 16px rgba(200, 90, 50, 0.4)'
        }}
      >
        🔨 DRILL TAP
      </button>

      <div style={{ fontSize: '11px', color: '#888', marginTop: '10px' }}>
        Desktop: Press [Space] or [Enter] • Touch: Tap the button
      </div>
    </div>
  );
};
