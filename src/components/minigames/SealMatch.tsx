import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';

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

export const SealMatch: React.FC<SealMatchProps> = ({ onFinish, onFail }) => {
  const [cards, setCards] = useState<SealCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(55);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const matchedPairsRef = useRef(matchedPairs);
  matchedPairsRef.current = matchedPairs;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  const timerRef = useRef<number | null>(null);
  const isFinishedRef = useRef(false);

  // Initialize and shuffle cards
  useEffect(() => {
    const deck: SealCard[] = [];
    SEAL_MOTIFS.forEach((item, index) => {
      deck.push({ id: index * 2, motif: item.motif, name: item.name, isFlipped: false, isMatched: false });
      deck.push({ id: index * 2 + 1, motif: item.motif, name: item.name, isFlipped: false, isMatched: false });
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
  }, []);

  const evaluateEndGame = (finalMatched: number) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTimeout(() => {
      let stars = 0;
      const remTime = timeLeftRef.current;
      const errCount = errorsRef.current;
      if (finalMatched >= 6 && remTime >= 15 && errCount <= 4) stars = 3;
      else if (finalMatched >= 5 || (finalMatched >= 4 && errCount <= 5)) stars = 2;
      else if (finalMatched >= 4) stars = 1;

      if (stars >= 1) {
        onFinish(stars, finalMatched * 50);
      } else {
        onFail();
      }
    }, 600);
  };

  // Timer - runs once on mount without restarting on matches
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          evaluateEndGame(matchedPairsRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCardClick = (index: number) => {
    if (isFinishedRef.current || isEvaluating || !cards[index] || cards[index].isFlipped || cards[index].isMatched) return;

    sound.playClick();
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], isFlipped: true };
    setCards(newCards);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setIsEvaluating(true);
      const [idx1, idx2] = newSelected;
      const card1 = newCards[idx1];
      const card2 = newCards[idx2];

      if (card1.name === card2.name) {
        // Matched!
        sound.playCorrect();
        newCards[idx1] = { ...newCards[idx1], isMatched: true };
        newCards[idx2] = { ...newCards[idx2], isMatched: true };
        const newMatched = matchedPairsRef.current + 1;
        setMatchedPairs(newMatched);
        setSelectedCards([]);
        setIsEvaluating(false);

        if (newMatched >= 6) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          evaluateEndGame(6);
        }
      } else {
        // Mismatch
        sound.playWrong();
        setErrors((e) => e + 1);
        setTimeout(() => {
          newCards[idx1] = { ...newCards[idx1], isFlipped: false };
          newCards[idx2] = { ...newCards[idx2], isFlipped: false };
          setCards(newCards);
          setSelectedCards([]);
          setIsEvaluating(false);
        }, 750);
      }
    }
  };

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>
          Matched Pairs: <strong style={{ color: 'var(--terracotta-dark)', fontSize: '18px' }}>{matchedPairs} / 6</strong>
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
