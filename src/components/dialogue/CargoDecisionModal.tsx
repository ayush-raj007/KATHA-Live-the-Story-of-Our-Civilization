import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import kingdomsData from '../../content/kingdoms.json';
import { sound } from '../../utils/audio';
import { Ship, CheckCircle2, Award } from 'lucide-react';
import { usePauseWhile } from '../../hooks/usePauseWhile';

interface CargoDecisionModalProps {
  onClose: () => void;
}

export const CargoDecisionModal: React.FC<CargoDecisionModalProps> = ({ onClose }) => {
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const setCargoDecision = useGameStore((state) => state.setCargoDecision);
  const cargoDecisions = useGameStore((state) => state.cargoDecisions);
  usePauseWhile(true);

  const lothal = kingdomsData.find((k) => k.id === 'lothal');
  const prompt = lothal?.cargoDecisionPrompt;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    cargoDecisions['lothal']?.chosenOptionId || null
  );
  const [consequenceShown, setConsequenceShown] = useState<boolean>(
    Boolean(cargoDecisions['lothal'])
  );

  if (!prompt) return null;

  const handleSelectOption = (optId: string) => {
    setSelectedOptionId(optId);
    setCargoDecision('lothal', optId);
    if (soundEnabled) sound.playCorrect();
    setConsequenceShown(true);
  };

  const selectedOpt = prompt.options.find((o) => o.id === selectedOptionId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', borderLeft: '8px solid var(--indigo)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div 
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--indigo-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--indigo)'
            }}
          >
            <Ship size={28} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--indigo)', textTransform: 'uppercase' }}>
              MARITIME TRADE DECISION • DILMUN &amp; MESOPOTAMIA
            </div>
            <h2 style={{ fontSize: '20px', color: 'var(--indigo-dark)' }}>
              Outbound Cargo for 'Sagar Doot'
            </h2>
          </div>
        </div>

        <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)', marginBottom: '18px' }}>
          {prompt.question[language]}
        </p>

        {/* Options Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
          {prompt.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => !consequenceShown && handleSelectOption(opt.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${isSelected ? 'var(--indigo)' : 'var(--earth-border)'}`,
                  background: isSelected ? 'var(--indigo-soft)' : '#FFF',
                  cursor: consequenceShown ? 'default' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '15px', color: 'var(--indigo-dark)' }}>
                    {opt.text[language]}
                  </strong>
                  {isSelected && <CheckCircle2 size={18} color="var(--indigo)" />}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  📦 <strong>Manifest:</strong> {opt.cargoManifest}
                </div>
              </div>
            );
          })}
        </div>

        {/* Consequence Box */}
        {consequenceShown && selectedOpt && (
          <div 
            style={{
              background: '#E8F5E9',
              border: '1.5px solid #4CAF50',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#2E7D32', fontSize: '13px', marginBottom: '4px' }}>
              <Award size={16} />
              <span>Historical Impact Recorded in Kaal Journal!</span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#1B5E20' }}>
              {selectedOpt.consequence[language]}
            </p>
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <button className="btn-primary" onClick={onClose}>
            {consequenceShown ? 'Continue Exploration' : 'Review Options'}
          </button>
        </div>
      </div>
    </div>
  );
};
