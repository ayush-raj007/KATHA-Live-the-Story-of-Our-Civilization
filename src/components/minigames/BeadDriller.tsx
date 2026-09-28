import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';

interface BeadDrillerProps {
  onFinish: (stars: number, score: number) => void;
  onFail: () => void;
}

export const BeadDriller: React.FC<BeadDrillerProps> = ({ onFinish, onFail }) => {
  const [needlePos, setNeedlePos] = useState(50); // percentage 0 to 100
  const [direction, setDirection] = useState(1);
  const [depth, setDepth] = useState(0); // 0 to 100% drilled
  const [score, setScore] = useState(0);
  const [cracks, setCracks] = useState(0); // max 3 cracks
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [feedback, setFeedback] = useState<string | null>(null);

  const speedRef = useRef(1.4);
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const depthRef = useRef(depth);
  depthRef.current = depth;
  const cracksRef = useRef(cracks);
  cracksRef.current = cracks;
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const needlePosRef = useRef(needlePos);
  needlePosRef.current = needlePos;

  const timerRef = useRef<number | null>(null);
  const isFinishedRef = useRef(false);

  // Oscillation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setNeedlePos((prev) => {
        let next = prev + direction * speedRef.current;
        if (next >= 95) {
          setDirection(-1);
          next = 95;
        } else if (next <= 5) {
          setDirection(1);
          next = 5;
        }
        return next;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [direction]);

  const evaluateResults = () => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentScore = scoreRef.current;
    const currentDepth = depthRef.current;

    let stars = 0;
    if (currentScore >= 400 || currentDepth >= 90) stars = 3;
    else if (currentScore >= 250 || currentDepth >= 60) stars = 2;
    else if (currentScore >= 120 || currentDepth >= 40) stars = 1;

    if (stars >= 1) {
      onFinish(stars, currentScore);
    } else {
      onFail();
    }
  };

  // Countdown timer - only mounts once and runs accurately
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          evaluateResults();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleDrillTap = () => {
    if (isFinishedRef.current) return;
    sound.playDrillTap();

    // Sweet spot is between 42% and 58%
    const currentPos = needlePosRef.current;
    const distFromCenter = Math.abs(currentPos - 50);

    if (distFromCenter <= 8) {
      // Perfect core hit
      sound.playCorrect();
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      const addedPoints = 40 + newCombo * 10;
      setScore((s) => s + addedPoints);
      const newDepth = Math.min(100, depthRef.current + 15);
      setDepth(newDepth);
      setFeedback('✨ PERFECT DRILL! (+' + addedPoints + ')');
      speedRef.current = Math.min(2.8, speedRef.current + 0.1);

      if (newDepth >= 85) {
        evaluateResults();
      }
    } else if (distFromCenter <= 16) {
      // Good hit
      setCombo(0);
      setScore((s) => s + 20);
      const newDepth = Math.min(100, depthRef.current + 8);
      setDepth(newDepth);
      setFeedback('👍 Good bore! (+20)');

      if (newDepth >= 85) {
        evaluateResults();
      }
    } else {
      // Off-beat hit -> cracks the gemstone
      sound.playWrong();
      setCombo(0);
      const newCracks = cracksRef.current + 1;
      setCracks(newCracks);
      setFeedback('💥 CRACK! Off-center strike!');

      if (newCracks >= 3) {
        if (timerRef.current) clearInterval(timerRef.current);
        isFinishedRef.current = true;
        onFail();
      }
    }
  };

  // Keyboard controls: Space or Enter to drill
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDrillTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      {/* Top Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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
            width: '260px',
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

          {/* Sweet Spot Target Zone */}
          <div 
            style={{
              position: 'absolute',
              left: '42%',
              width: '16%',
              height: '100%',
              background: 'rgba(76, 175, 80, 0.35)',
              borderLeft: '2px dashed #4CAF50',
              borderRight: '2px dashed #4CAF50'
            }}
          />
        </div>

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
