import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import minigamesData from '../../content/minigames.json';
import { BeadDriller } from './BeadDriller';
import { TideDock } from './TideDock';
import { SealMatch } from './SealMatch';
import confetti from 'canvas-confetti';
import { Trophy, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { sound } from '../../utils/audio';

interface MiniGameModalProps {
  gameId: string;
  onClose: () => void;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({ gameId, onClose }) => {
  const language = useGameStore((state) => state.language);
  const urja = useGameStore((state) => state.urja);
  const completeMiniGame = useGameStore((state) => state.completeMiniGame);
  const failMiniGame = useGameStore((state) => state.failMiniGame);
  const applyUrjaChange = useGameStore((state) => state.applyUrjaChange);

  const gameConfig = minigamesData.find((g) => g.id === gameId);

  const [gameState, setGameState] = useState<'intro' | 'playing' | 'won' | 'lost'>('intro');
  const [earnedStars, setEarnedStars] = useState(0);
  const [earnedScore, setEarnedScore] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  if (!gameConfig) return null;

  const canPlay = urja >= gameConfig.minUrjaToEnter;

  const handleStartGame = () => {
    if (!canPlay) return;
    setGameState('playing');
  };

  const handleFinish = (stars: number, score: number) => {
    setEarnedStars(stars);
    setEarnedScore(score);
    setGameState('won');

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // fallback if canvas-confetti context isn't available
    }

    sound.playCorrect();
    completeMiniGame(gameId, stars, score);
  };

  const handleFail = () => {
    sound.playWrong();
    setGameState('lost');
    failMiniGame(gameId);
  };

  const handleRetry = () => {
    // Retry costs 5 Urja
    applyUrjaChange(-5, 'Mini-game retry fee: -5 Urja');
    setRetryCount((prev) => prev + 1);
    setGameState('playing');
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content-card"
        style={{ maxWidth: '640px', borderLeft: '8px solid var(--turmeric)' }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--turmeric)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF'
              }}
            >
              <Trophy size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta-dark)', textTransform: 'uppercase' }}>
                CHAMPION CONTEST • {gameConfig.championName[language]}
              </div>
              <h2 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>
                {gameConfig.title[language]}
              </h2>
            </div>
          </div>
          <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* INTRO SCREEN */}
        {gameState === 'intro' && (
          <div>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)', marginBottom: '14px' }}>
              {gameConfig.description[language]}
            </p>

            <div 
              style={{
                background: '#FFF8E1',
                border: '1.5px solid #FFE082',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#B8860B', marginBottom: '6px' }}>
                STAR CHALLENGE CRITERIA
              </div>
              <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>⭐ <strong>1 Star (PASS):</strong> {gameConfig.starCriteria.oneStar}</div>
                <div>⭐⭐ <strong>2 Stars:</strong> {gameConfig.starCriteria.twoStar}</div>
                <div>⭐⭐⭐ <strong>3 Stars:</strong> {gameConfig.starCriteria.threeStar}</div>
              </div>
            </div>

            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--sand-card)',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--earth-border)',
                marginBottom: '18px'
              }}
            >
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Entry Requirement: <strong>{gameConfig.minUrjaToEnter} Urja</strong> (You have: {urja})
              </span>
              {!canPlay && (
                <span style={{ color: 'var(--lac-red)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} /> Low Urja! Eat food first.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button 
                className="btn-primary" 
                disabled={!canPlay} 
                onClick={handleStartGame}
                style={{ opacity: canPlay ? 1 : 0.5 }}
              >
                Begin Contest &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE PLAYING SCREEN */}
        {gameState === 'playing' && (
          <div key={`${gameId}_${retryCount}`}>
            {gameId === 'bead_driller' && <BeadDriller onFinish={handleFinish} onFail={handleFail} />}
            {gameId === 'tide_dock' && <TideDock onFinish={handleFinish} onFail={handleFail} />}
            {gameId === 'seal_match' && <SealMatch onFinish={handleFinish} onFail={handleFail} />}
          </div>
        )}

        {/* VICTORY SCREEN */}
        {gameState === 'won' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>
              {'⭐'.repeat(earnedStars)}
            </div>
            <h3 style={{ color: 'var(--terracotta-dark)', fontSize: '22px', marginBottom: '6px' }}>
              CHAMPION CONQUERED!
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Score: <strong>{earnedScore}</strong> points • Gyaan Bonus: <strong>+{earnedStars * 10}</strong> points
            </p>

            <div 
              style={{
                background: '#E8F5E9',
                border: '1.5px solid #4CAF50',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '18px',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 800, color: '#2E7D32', fontSize: '13px', marginBottom: '4px' }}>
                🎁 Historical Rewards Awarded:
              </div>
              <div style={{ fontSize: '13px', color: '#1B5E20' }}>
                • 1-Star Standard: Food rations added to inventory.<br />
                {earnedStars === 3 && (
                  <>• 3-Star Mastery: Bonus Collectible unlocked: <strong>{gameConfig.rewards.threeStarBonus}</strong>!<br /></>
                )}
                • Progress recorded in the "Aaj Ka Bhojan" survival quest!
              </div>
            </div>

            <button className="btn-primary" onClick={onClose} style={{ minWidth: '160px' }}>
              Claim Victory &amp; Return
            </button>
          </div>
        )}

        {/* DEFEAT / FAIL SCREEN */}
        {gameState === 'lost' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>💥</div>
            <h3 style={{ color: 'var(--lac-red)', fontSize: '22px', marginBottom: '6px' }}>
              Contest Attempt Failed!
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Failure penalty applied: <strong>-10 Urja</strong>.<br />
              Regroup, consult your Terracotta Bull companion for advice, or retry.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button className="btn-secondary" onClick={onClose}>
                Exit to Kingdom
              </button>
              {urja >= gameConfig.minUrjaToEnter && (
                <button 
                  className="btn-primary" 
                  onClick={handleRetry}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={16} />
                  <span>Retry Contest (-5 Urja)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
