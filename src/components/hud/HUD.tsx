import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import {
  Zap,
  Map as MapIcon,
  Home,
  Volume2,
  VolumeX,
  Languages,
  Backpack,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { sound } from '../../utils/audio';
import { LOW_URJA_THRESHOLD } from '../../store/useGameStore';
import { usePauseWhile } from '../../hooks/usePauseWhile';

export const HUD: React.FC = () => {
  const urja = useGameStore((state) => state.urja);
  const isLowUrja = useGameStore((state) => state.isLowUrja);
  const gyaan = useGameStore((state) => state.gyaan);
  const activeQuest = useGameStore((state) => state.activeQuest);
  const activeScreen = useGameStore((state) => state.activeScreen);
  const setScreen = useGameStore((state) => state.setScreen);
  const language = useGameStore((state) => state.language);
  const setLanguage = useGameStore((state) => state.setLanguage);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const companionMessage = useGameStore((state) => state.companionMessage);
  const askCompanionHint = useGameStore((state) => state.askCompanionHint);
  const clearCompanionMessage = useGameStore((state) => state.clearCompanionMessage);
  const isKaalThakaanTriggered = useGameStore((state) => state.isKaalThakaanTriggered);
  const recoverFromKaalThakaan = useGameStore((state) => state.recoverFromKaalThakaan);

  const [isBagOpen, setIsBagOpen] = useState(false);
  const inventory = useGameStore((state) => state.inventory);
  const consumeFood = useGameStore((state) => state.consumeFood);
  const openToyModal = useGameStore((state) => state.openToyModal);
  usePauseWhile(isBagOpen);

  // Screens and overlays are laid out below the HUD, whose height changes as it
  // wraps on narrow screens, so publish its bottom edge as a CSS variable.
  const headerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty('--hud-height', `${Math.ceil(header.getBoundingClientRect().bottom)}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const getUrjaClass = () => {
    if (urja > 60) return 'high';
    if (urja >= LOW_URJA_THRESHOLD) return 'med';
    return 'low';
  };

  const handleSoundToggle = () => {
    toggleSound();
    if (!soundEnabled) sound.playClick();
  };

  const handleLangToggle = () => {
    if (soundEnabled) sound.playClick();
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const handleCompanionHint = () => {
    if (soundEnabled) sound.playClick();
    askCompanionHint();
  };

  const handleEat = (foodId: string) => {
    if (soundEnabled) sound.playEat();
    consumeFood(foodId);
  };

  const currentStep = activeQuest?.steps[activeQuest.currentStepIndex];

  return (
    <>
      {/* Low Urja Warning Vignette */}
      {isLowUrja && <div className="low-urja-vignette" />}

      {/* Top HUD Bar */}
      <header className="hud-header" ref={headerRef}>
        {/* Left: Urja & Gyaan */}
        <div className="hud-section">
          {/* Urja Status Bar */}
          <div className="urja-container" title="Urja (Vitality) - Restores with authentic food">
            <span className="urja-label">
              <Zap size={16} fill={isLowUrja ? '#B22222' : '#C85A32'} />
              {language === 'en' ? 'URJA' : 'ऊर्जा'}
            </span>
            <div className="urja-bar-outer">
              <div
                className={`urja-bar-inner ${getUrjaClass()}`}
                style={{ width: `${urja}%` }}
              />
            </div>
            <span className="urja-number">{urja}</span>
          </div>

          {/* Gyaan Counter */}
          <div className="gyaan-container" title="Gyaan (Knowledge Points) - Earned by solving history decisions">
            <span className="gyaan-badge">✨</span>
            <span className="gyaan-label">{language === 'en' ? 'Gyaan' : 'ज्ञान'}</span>
            <span className="gyaan-value">{gyaan}</span>
          </div>

          {/* Low Energy Alert Badge */}
          {isLowUrja && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#B22222',
                color: '#FFF',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.3px',
                animation: 'bounce 1s infinite'
              }}
            >
              <AlertTriangle size={14} />
              {language === 'en' ? 'LOW URJA (-30% SPEED)' : 'कम ऊर्जा (चाल धीमी)'}
            </div>
          )}
        </div>

        {/* Center: Active Quest Tracker ("Aaj Ka Bhojan") */}
        {activeQuest && activeScreen === 'kingdom' && (
          <div
            className="quest-tracker-card"
            onClick={() => handleCompanionHint()}
            title="Click companion for next hint (-3 Urja)"
          >
            <div className="quest-tag">
              📜 {activeQuest.title[language]}
            </div>
            <div className="quest-title">
              {currentStep ? currentStep.text[language] : (language === 'en' ? 'All Lothal Quests Cleared!' : 'सभी लक्ष्य पूर्ण!')}
            </div>
            <div className="quest-step-text">
              Step {activeQuest.currentStepIndex + 1} of {activeQuest.steps.length} • Click companion for hint
            </div>
          </div>
        )}

        {/* Right: Quick Menus & Toggles */}
        <div className="hud-section">
          {/* Inventory Bag */}
          <button
            className="nav-pill-btn"
            onClick={() => {
              if (soundEnabled) sound.playClick();
              setIsBagOpen(!isBagOpen);
            }}
            title="Open Bag / Bhojan Rations"
          >
            <Backpack size={16} color="#8D3B1B" />
            <span>{language === 'en' ? 'Bag' : 'थैला'}</span>
          </button>

          {/* Kaal Ghar Hub */}
          <button
            className={`nav-pill-btn ${activeScreen === 'kaal_ghar' ? 'primary' : ''}`}
            onClick={() => {
              if (soundEnabled) sound.playClick();
              setScreen(activeScreen === 'kaal_ghar' ? 'kingdom' : 'kaal_ghar');
            }}
            title="Visit Kaal Ghar (Home base / Toy shelf)"
          >
            <Home size={16} />
            <span>{language === 'en' ? 'Kaal Ghar' : 'काल घर'}</span>
          </button>

          {/* Kaal Map */}
          <button
            className={`nav-pill-btn ${activeScreen === 'kaal_map' ? 'primary' : ''}`}
            onClick={() => {
              if (soundEnabled) sound.playClick();
              setScreen('kaal_map');
            }}
            title="Open World Map of India"
          >
            <MapIcon size={16} />
            <span>{language === 'en' ? 'Map' : 'मानचित्र'}</span>
          </button>

          {/* Language Toggle */}
          <button
            className="nav-pill-btn"
            onClick={handleLangToggle}
            title="Toggle Language (English / हिंदी)"
          >
            <Languages size={16} />
            <span>{language === 'en' ? 'हिंदी' : 'EN'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            className="nav-pill-btn"
            onClick={handleSoundToggle}
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} color="#B22222" />}
          </button>
        </div>
      </header>

      {/* Companion Bubble (Lothal Terracotta Bull on Wheels) */}
      {companionMessage && (
        <div className="companion-bubble">
          <button
            className="companion-avatar-btn"
            onClick={handleCompanionHint}
            title="Click for hint (-3 Urja)"
          >
            🐂
          </button>
          <div className="companion-speech">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <strong>{language === 'en' ? 'Terracotta Nandi Companion' : 'पहिएदार नंदी साथी'}</strong>
              <button
                onClick={clearCompanionMessage}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#888' }}
              >
                ✕
              </button>
            </div>
            <p style={{ marginTop: '4px' }}>{companionMessage}</p>
            <button className="companion-hint-btn" onClick={handleCompanionHint}>
              💡 {language === 'en' ? 'Ask Hint (-3 Urja)' : 'संकेत पूछें (-३ ऊर्जा)'}
            </button>
          </div>
        </div>
      )}

      {/* Inventory Bag Drawer / Modal */}
      {isBagOpen && (
        <div className="modal-overlay" onClick={() => setIsBagOpen(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: 'var(--terracotta-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Backpack size={22} />
                {language === 'en' ? 'Yatri’s Travelling Bag' : 'यात्री का यात्रा थैला'}
              </h2>
              <button className="btn-secondary" onClick={() => setIsBagOpen(false)}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {language === 'en'
                ? 'Consuming food restores your Urja and unlocks historically grounded Food Fact cards.'
                : 'भोजन खाने से ऊर्जा पुनः प्राप्त होती है और इतिहास आधारित खाद्य तथ्य खुलते हैं।'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: '12px' }}>
              {Object.values(inventory).map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#FFF',
                    border: '2px solid var(--earth-border)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.name[language]}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Quantity: <strong>{item.count}</strong>
                      </div>
                    </div>
                  </div>

                  {item.category === 'food' && (
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px', marginTop: '4px' }}
                      onClick={() => handleEat(item.id)}
                    >
                      🍴 {language === 'en' ? `Eat (+${item.urjaValue} Urja)` : `खाएं (+${item.urjaValue} ऊर्जा)`}
                    </button>
                  )}

                  {item.id === 'toy_terracotta_bull' && (
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px', marginTop: '4px', background: 'var(--indigo)' }}
                      onClick={() => {
                        setIsBagOpen(false);
                        openToyModal(item.id);
                      }}
                    >
                      🏺 {language === 'en' ? 'Inspect in 3D' : '३डी में देखें'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Kaal Thakaan (Urja 0 Fallback) Modal */}
      {isKaalThakaanTriggered && (
        <div className="modal-overlay">
          <div className="modal-content-card" style={{ textAlign: 'center', maxWidth: '480px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌀</div>
            <h2 style={{ color: 'var(--lac-red)', marginBottom: '8px' }}>
              {language === 'en' ? 'Kaal Thakaan (Temporal Fatigue)' : 'काल थकान (ऊर्जा शून्य)'}
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {language === 'en'
                ? 'Your Channapatna spinning top wobbled as your Urja reached zero! The temporal tether pulled you safely back to Kaal Ghar with 50 Urja. Unbanked fresh food was lost in the timeline, but your Gyaan, journal entries, and collected toys remain safe!'
                : 'ऊर्जा शून्य होने पर आपका लट्टू डगमगाया और समय की तरंगें आपको सुरक्षित काल घर ले आईं। ऊर्जा ५० बहाल हुई। अन्न खो गया किंतु अर्जित ज्ञान व खिलौने सुरक्षित हैं!'}
            </p>
            <button
              className="btn-primary"
              onClick={recoverFromKaalThakaan}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RotateCcw size={16} />
              {language === 'en' ? 'Resume Journey in Lothal' : 'लोथल में यात्रा पुनः आरंभ करें'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
