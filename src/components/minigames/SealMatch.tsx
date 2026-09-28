import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';
import { SEAL_MATCH, sealMatchStars } from './scoring';

interface SealMatchProps {
  onFinish: (stars: number, score: number) => void;
  onFail: () => void;
}

interface SealCard {
  id: number;
  motif: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const SEAL_MOTIFS = [
  { motif: '🦄', name: 'One-Horned Bull' },
  { motif: '🐂', name: 'Humped Zebu Bull' },
  { motif: '🐘', name: 'Indus Elephant' },
  { motif: '🦏', name: 'Great Rhinoceros' },
  { motif: '🐅', name: 'Royal Tiger' },
  { motif: '🐟', name: 'Coastal Fish Motif' },
];

const MISMATCH_FLIP_BACK_MS = 750;
const RESULT_DELAY_MS = 600;
const TIME_LIMIT_S = SEAL_MATCH.timeLimitMs / 1000;

const createShuffledDeck = (): SealCard[] => {
  const deck: SealCard[] = [];
  SEAL_MOTIFS.forEach((item, index) => {
    deck.push({ id: index * 2, motif: item.motif, name: item.name, isFlipped: false, isMatched: false });
    deck.push({ id: index * 2 + 1, motif: item.motif, name: item.name, isFlipped: false, isMatched: false });
  });

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const SealMatch: React.FC<SealMatchProps> = ({ onFinish, onFail }) => {
  const [cards, setCards] = useState<SealCard[]>(createShuffledDeck);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_S);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const game = useRef({ matched: 0, errors: 0, startedAt: 0, isFinished: false });
  const callbacksRef = useRef({ onFinish, onFail });
  useEffect(() => {
    callbacksRef.current = { onFinish, onFail };
  }, [onFinish, onFail]);

  const timerRef = useRef<number | null>(null);
  const pendingTimeouts = useRef(new Set<number>());

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      pendingTimeouts.current.delete(id);
      fn();
    }, ms);
    pendingTimeouts.current.add(id);
  };

  const stopTimer = () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const endGame = () => {
    const g = game.current;
    if (g.isFinished) return;
    g.isFinished = true;
    stopTimer();

    const elapsedMs = Date.now() - g.startedAt;
    later(() => {
      const stars = sealMatchStars(g.matched, g.errors, elapsedMs);
      if (stars >= 1) {
        callbacksRef.current.onFinish(stars, g.matched * 50);
      } else {
        callbacksRef.current.onFail();
      }
    }, RESULT_DELAY_MS);
  };

  // Countdown (the "archive candle"); timeouts are cleared if the contest is closed.
  useEffect(() => {
    const g = game.current;
    const timeouts = pendingTimeouts.current;
    g.startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, TIME_LIMIT_S - Math.floor((Date.now() - g.startedAt) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) endGame();
    }, 1000);

    return () => {
      stopTimer();
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
    };
    // endGame only touches refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardClick = (index: number) => {
    const card = cards[index];
    if (game.current.isFinished || isEvaluating || !card || card.isFlipped || card.isMatched) return;

    sound.playClick();
    const flipped = cards.map((c, i) => (i === index ? { ...c, isFlipped: true } : c));
    setCards(flipped);

    const newSelected = [...selectedCards, index];
    if (newSelected.length < 2) {
      setSelectedCards(newSelected);
      return;
    }

    const [idx1, idx2] = newSelected;
    setSelectedCards([]);

    if (flipped[idx1].name === flipped[idx2].name) {
      sound.playCorrect();
      setCards(flipped.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isMatched: true } : c)));
      game.current.matched += 1;
      setMatchedPairs(game.current.matched);
      if (game.current.matched >= SEAL_MATCH.pairs) endGame();
    } else {
      sound.playWrong();
      game.current.errors += 1;
      setErrors(game.current.errors);
      setIsEvaluating(true);
      later(() => {
        setCards((prev) => prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isFlipped: false } : c)));
        setIsEvaluating(false);
      }, MISMATCH_FLIP_BACK_MS);
    }
  };

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>
          Matched Pairs: <strong style={{ color: 'var(--terracotta-dark)', fontSize: '18px' }}>{matchedPairs} / {SEAL_MATCH.pairs}</strong>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: timeLeft < 12 ? 'var(--lac-red)' : 'var(--text-primary)' }}>
          ⏱️ Time: {timeLeft}s
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>
          Errors: {errors}
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Flip steatite seals to match authentic animal guild stamps from the Lothal granary archive.
      </div>

      {/* 4x3 Grid of Steatite Seals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          maxWidth: '460px',
          margin: '0 auto 16px auto'
        }}
      >
        {cards.map((card, idx) => {
          const isOpen = card.isFlipped || card.isMatched;

          return (
            <div
              key={card.id}
              tabIndex={0}
              role="button"
              aria-label={isOpen ? card.name : `Steatite Seal Card ${idx + 1}`}
              onClick={() => handleCardClick(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(idx);
                }
              }}
              style={{
                height: '84px',
                borderRadius: '12px',
                border: `2px solid ${card.isMatched ? '#4CAF50' : 'var(--earth-border)'}`,
                background: isOpen ? '#FFFDF9' : 'radial-gradient(circle, #D7CCC8, #A1887F)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isOpen ? 'default' : 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {isOpen ? (
                <>
                  <div style={{ fontSize: '32px' }}>{card.motif}</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', textAlign: 'center', padding: '0 2px' }}>
                    {card.name}
                  </div>
                </>
              ) : (
                <div style={{ color: '#EFEBE9', fontSize: '20px', fontWeight: 800 }}>
                  📜
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '11px', color: '#888' }}>
        Click or press Tab + [Space/Enter] to inspect seals
      </div>
    </div>
  );
};
