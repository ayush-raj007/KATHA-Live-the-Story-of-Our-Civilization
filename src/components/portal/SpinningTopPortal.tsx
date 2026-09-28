import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';

const MIN_SPIN_POWER = 40; // % torque needed to open the portal

interface SpinningTopPortalProps {
  destinationKingdomName: string;
  onTransitionComplete: () => void;
  onCancel?: () => void;
}

export const SpinningTopPortal: React.FC<SpinningTopPortalProps> = ({
  destinationKingdomName,
  onTransitionComplete,
  onCancel
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [spinPower, setSpinPower] = useState(0); // 0 to 100
  const [isWarping, setIsWarping] = useState(false);
  const holdIntervalRef = useRef<number | null>(null);
  // Guards against double launches (e.g. double-clicking Quick Spin)
  const hasLaunchedRef = useRef(false);
  const warpTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (warpTimeoutRef.current !== null) clearTimeout(warpTimeoutRef.current);
  }, []);

  const launchPortal = (delayMs: number) => {
    if (hasLaunchedRef.current) return;
    hasLaunchedRef.current = true;
    setIsWarping(true);
    warpTimeoutRef.current = window.setTimeout(onTransitionComplete, delayMs);
  };

  // Pointer events handle mouse, touch and pen once each (touch used to fire both
  // touch and mouse handlers, playing the sound twice and launching twice).
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isWarping || isHolding) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsHolding(true);
    sound.playTopSpin();
  };

  const handlePointerUp = () => {
    if (!isHolding || isWarping) return;
    setIsHolding(false);

    if (spinPower >= MIN_SPIN_POWER) {
      // Successful spin release! Launch portal warp
      sound.playCorrect();
      launchPortal(1600);
    } else {
      // Weak spin, resets
      setSpinPower(0);
    }
  };

  useEffect(() => {
    if (isHolding && !isWarping) {
      holdIntervalRef.current = window.setInterval(() => {
        setSpinPower((prev) => Math.min(100, prev + 4));
      }, 50);
    } else {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    }
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isHolding, isWarping]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: isWarping
          ? 'radial-gradient(circle at center, #F4A261 0%, #C85A32 40%, #1A2340 100%)'
          : 'rgba(26, 18, 14, 0.88)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.8s ease',
        color: '#FFF',
        userSelect: 'none'
      }}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Vortex Animation when Warping */}
      {isWarping ? (
        <div style={{ textAlign: 'center', animation: 'warpPulse 1.2s infinite' }}>
          <div
            style={{
              width: '180px',
              height: '180px',
              margin: '0 auto',
              borderRadius: '50%',
              border: '6px dashed #F4D06F',
              animation: 'spinFast 0.3s linear infinite',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 60px #E9B44C'
            }}
          >
            <div style={{ fontSize: '72px' }}>🌀</div>
          </div>
          <h2 style={{ marginTop: '24px', fontSize: '28px', color: '#F4D06F', letterSpacing: '1px' }}>
            Opening Kaal Portal...
          </h2>
          <p style={{ fontSize: '18px', color: '#FFFDF9', marginTop: '8px' }}>
            Travelling to {destinationKingdomName}
          </p>
        </div>
      ) : (
        <div
          style={{
            maxWidth: '460px',
            width: '90%',
            background: 'var(--sand-card)',
            color: 'var(--text-primary)',
            border: '3px solid var(--terracotta)',
            borderRadius: '20px',
            padding: '28px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--terracotta-dark)', textTransform: 'uppercase' }}>
            CHANNAPATNA TEMPORAL LATTU
          </div>
          <h2 style={{ fontSize: '22px', color: 'var(--terracotta-dark)', marginTop: '6px' }}>
            Spin the Top to Travel
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
            <strong>HOLD &amp; RELEASE</strong> the spinning top below to wind temporal torque and open the portal to <strong>{destinationKingdomName}</strong>!
          </p>

          {/* Interactive Spinning Top Button */}
          <div style={{ margin: '24px auto', position: 'relative', width: '130px', height: '130px' }}>
            <button
              onPointerDown={handlePointerDown}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: isHolding
                  ? 'radial-gradient(circle, #E76F51, #B22222)'
                  : 'radial-gradient(circle, #E9B44C, #C85A32)',
                border: '4px solid #FFF',
                boxShadow: isHolding
                  ? '0 0 30px #E76F51, inset 0 0 15px rgba(0,0,0,0.3)'
                  : '0 6px 16px rgba(0,0,0,0.25)',
                cursor: 'pointer',
                touchAction: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '54px',
                transform: isHolding ? `scale(0.96) rotate(${spinPower * 7}deg)` : 'scale(1)',
                transition: 'transform 0.05s linear'
              }}
            >
              🪵
            </button>
          </div>

          {/* Torque Power Meter */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              <span>Torque Charge</span>
              <span>{spinPower}%</span>
            </div>
            <div style={{ width: '100%', height: '12px', background: '#E2D7C4', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${spinPower}%`,
                  height: '100%',
                  background: spinPower >= MIN_SPIN_POWER
                    ? 'linear-gradient(90deg, #4CAF50, #8BC34A)'
                    : 'linear-gradient(90deg, #E9B44C, #E76F51)',
                  transition: 'width 0.05s linear'
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: spinPower >= MIN_SPIN_POWER ? '#2E7D32' : '#888', marginTop: '4px', fontWeight: 600 }}>
              {spinPower >= MIN_SPIN_POWER ? '✓ Ready! Release to launch portal!' : 'Press & hold to build power (min 40%)'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {onCancel && (
              <button className="btn-secondary" onClick={onCancel} style={{ fontSize: '13px' }}>
                Cancel
              </button>
            )}
            <button
              className="btn-primary"
              style={{ fontSize: '13px' }}
              onClick={() => {
                if (hasLaunchedRef.current) return;
                setSpinPower(100);
                sound.playTopSpin();
                launchPortal(1400);
              }}
            >
              Quick Spin &amp; Enter
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spinFast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes warpPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
};
