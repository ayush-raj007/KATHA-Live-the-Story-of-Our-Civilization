import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import foodsData from '../../content/foods.json';
import { CheckCircle2, HelpCircle, X } from 'lucide-react';

export const FoodFactCard: React.FC = () => {
  const activeFoodFactId = useGameStore((state) => state.activeFoodFactId);
  const closeFoodFact = useGameStore((state) => state.closeFoodFact);
  const language = useGameStore((state) => state.language);

  if (!activeFoodFactId) return null;

  const foodItem = foodsData.find((f) => f.id === activeFoodFactId);
  if (!foodItem) return null;

  const { foodFact } = foodItem;

  return (
    <div className="modal-overlay" onClick={closeFoodFact}>
      <div 
        className="modal-content-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', borderLeft: '8px solid var(--turmeric)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '36px' }}>{foodItem.emoji}</span>
            <div>
              <span 
                style={{ 
                  fontSize: '11px', 
                  textTransform: 'uppercase', 
                  fontWeight: 800, 
                  color: 'var(--terracotta-dark)',
                  letterSpacing: '0.5px'
                }}
              >
                🌾 {language === 'en' ? 'Food Fact Discovery' : 'ऐतिहासिक खाद्य खोज'}
              </span>
              <h3 style={{ color: 'var(--text-primary)', marginTop: '2px', fontSize: '18px' }}>
                {foodFact.title[language]}
              </h3>
            </div>
          </div>
          <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={closeFoodFact}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '16px' }}>
          {foodFact.description[language]}
        </p>

        <div 
          style={{
            background: 'var(--terracotta-soft)',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--earth-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong>{language === 'en' ? 'Urja Restored:' : 'ऊर्जा लाभ:'}</strong> +{foodItem.urjaRestore}
            </span>
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                color: foodFact.status === 'VERIFIED' ? '#2E7D32' : '#E65100',
                background: '#FFF',
                padding: '2px 8px',
                borderRadius: '6px'
              }}
            >
              {foodFact.status === 'VERIFIED' ? <CheckCircle2 size={12} /> : <HelpCircle size={12} />}
              {foodFact.status === 'VERIFIED' 
                ? (language === 'en' ? 'Archaeologically Verified' : 'पुरातात्विक सत्यापित')
                : (language === 'en' ? 'Historians think...' : 'इतिहासकारों का मत...')}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            <strong>{language === 'en' ? 'Evidence Source:' : 'साक्ष्य स्रोत:'}</strong> {foodFact.source}
          </div>
        </div>

        <div style={{ marginTop: '18px', textAlign: 'right' }}>
          <button className="btn-primary" onClick={closeFoodFact}>
            {language === 'en' ? 'Add to Knowledge Journal' : 'ज्ञान पत्रिका में जोड़ें'}
          </button>
        </div>
      </div>
    </div>
  );
};
