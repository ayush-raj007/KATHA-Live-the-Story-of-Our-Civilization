import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import kingdomsData from '../../content/kingdoms.json';
import { SpinningTopPortal } from '../portal/SpinningTopPortal';
import { Lock, Sparkles, MapPin, Calendar, Play } from 'lucide-react';
import { sound } from '../../utils/audio';

export const KaalMap: React.FC = () => {
  const currentKingdomId = useGameStore((state) => state.currentKingdomId);
  const setScreen = useGameStore((state) => state.setScreen);
  const language = useGameStore((state) => state.language);
  const unlockedKingdoms = useGameStore((state) => state.unlockedKingdoms);
  const soundEnabled = useGameStore((state) => state.soundEnabled);

  const [selectedKingdomId, setSelectedKingdomId] = useState<string>(currentKingdomId || 'lothal');
  const [timelineYear, setTimelineYear] = useState<number>(-2000);
  const [isPortalActive, setIsPortalActive] = useState(false);

  const selectedKingdom = kingdomsData.find((k) => k.id === selectedKingdomId) || kingdomsData[0];
  const isSelectedUnlocked = unlockedKingdoms.includes(selectedKingdomId);

  const handleSelectNode = (kingdomId: string) => {
    if (soundEnabled) sound.playClick();
    setSelectedKingdomId(kingdomId);
    const k = kingdomsData.find((item) => item.id === kingdomId);
    if (k) {
      setTimelineYear(k.yearApprox);
    }
  };

  const handleEnterKingdom = () => {
    if (!isSelectedUnlocked) return;
    setIsPortalActive(true);
  };

  const handlePortalComplete = () => {
    setIsPortalActive(false);
    useGameStore.setState({ currentKingdomId: selectedKingdomId });
    setScreen('kingdom');
  };

  return (
    <div
      className="screen-below-hud"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 50% 50%, #FAF5EC 0%, #EDE1CE 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Portal Transition Overlay */}
      {isPortalActive && (
        <SpinningTopPortal
          destinationKingdomName={selectedKingdom.name[language]}
          onTransitionComplete={handlePortalComplete}
          onCancel={() => setIsPortalActive(false)}
        />
      )}

      {/* Top Header & Timeline Scrub Bar */}
      <div
        style={{
          padding: '16px 24px',
          background: 'rgba(255, 253, 249, 0.95)',
          borderBottom: '2px solid var(--earth-border)',
          zIndex: 10,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              CHRONO-GEOGRAPHIC NAVIGATOR
            </div>
            <h1 style={{ fontSize: '22px', color: 'var(--terracotta-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🗺️</span> {language === 'en' ? 'Kaal Map of Bharat' : 'भारत का काल मानचित्र'}
            </h1>
          </div>

          {/* Timeline Slider by Era */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F5ECE1', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--earth-border)' }}>
            <Calendar size={16} color="var(--terracotta-dark)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                <span>2000 BCE</span>
                <span>Year: {timelineYear < 0 ? `${Math.abs(timelineYear)} BCE` : `${timelineYear} CE`}</span>
                <span>1500 CE</span>
              </div>
              <input
                type="range"
                min="-2000"
                max="1500"
                step="50"
                value={timelineYear}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setTimelineYear(val);
                  // Find nearest kingdom
                  let nearest = kingdomsData[0];
                  let minDiff = 99999;
                  kingdomsData.forEach((k) => {
                    const diff = Math.abs(k.yearApprox - val);
                    if (diff < minDiff) {
                      minDiff = diff;
                      nearest = k;
                    }
                  });
                  setSelectedKingdomId(nearest.id);
                }}
                style={{ width: 'min(220px, 60vw)', accentColor: 'var(--terracotta)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Map & Details Area */}
      <div className="kaal-map-body" style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Stylized Map Viewport */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#EAE1D1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Stylized SVG Map of India Outline with Coastal Waterways */}
          <svg
            viewBox="0 0 800 900"
            style={{
              width: '100%',
              height: '100%',
              maxHeight: 'calc(100vh - 180px)',
              filter: 'drop-shadow(0 6px 12px rgba(44,24,16,0.15))'
            }}
          >
            {/* Ocean Waves Pattern */}
            <defs>
              <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 0 10 Q 10 5 20 10 T 40 10" fill="none" stroke="#D8C9B4" strokeWidth="1.2" opacity="0.6"/>
              </pattern>
            </defs>
            <rect width="800" height="900" fill="url(#waves)" />

            {/* Stylized Peninsular & Northern Subcontinent Landmass */}
            <path
              d="
                M 340,60
                C 380,50 480,80 500,120
                C 520,150 560,180 580,240
                C 620,290 680,310 720,380
                C 740,430 710,480 670,510
                C 620,530 580,590 560,650
                C 530,730 460,820 420,870
                C 410,880 400,880 390,870
                C 340,810 290,720 270,640
                C 250,560 210,510 180,470
                C 140,440 100,410 110,360
                C 130,320 200,310 240,290
                C 270,250 260,170 290,110
                Z
              "
              fill="#F9F5EC"
              stroke="#C9B69B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Ancient Rivers: Indus / Bhogavo, Ganga, Narmada, Kaveri, Tungabhadra */}
            {/* Indus & Bhogavo Delta to Gulf of Khambhat */}
            <path d="M 230,190 Q 210,280 240,430" fill="none" stroke="#A9C7D4" strokeWidth="3" strokeDasharray="6,3" />
            {/* Ganga */}
            <path d="M 370,200 Q 480,240 680,410" fill="none" stroke="#A9C7D4" strokeWidth="3.5" />
            {/* Narmada */}
            <path d="M 240,430 Q 380,450 520,440" fill="none" stroke="#A9C7D4" strokeWidth="2.5" />
            {/* Tungabhadra */}
            <path d="M 320,630 Q 420,640 540,610" fill="none" stroke="#A9C7D4" strokeWidth="2.5" />
            {/* Kaveri */}
            <path d="M 350,750 Q 440,760 520,740" fill="none" stroke="#A9C7D4" strokeWidth="3" />

            {/* Ocean Labels */}
            <text x="80" y="620" fill="#8C9CA6" fontSize="16" fontWeight="700" letterSpacing="3" transform="rotate(-40 80,620)">
              ARABIAN SEA (SINDHU SAGAR)
            </text>
            <text x="560" y="600" fill="#8C9CA6" fontSize="16" fontWeight="700" letterSpacing="3" transform="rotate(30 560,600)">
              BAY OF BENGAL
            </text>

            {/* Kingdom Nodes */}
            {kingdomsData.map((k) => {
              const isUnlocked = unlockedKingdoms.includes(k.id);
              const isSelected = selectedKingdomId === k.id;
              // Map percentage coordinates to SVG 800x900
              const cx = (k.locationMapCoords.x / 100) * 800;
              const cy = (k.locationMapCoords.y / 100) * 900;

              return (
                <g
                  key={k.id}
                  onClick={() => handleSelectNode(k.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glowing halo for unlocked & selected nodes */}
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="32"
                      fill="none"
                      stroke="var(--turmeric)"
                      strokeWidth="3"
                      strokeDasharray="5,5"
                      opacity="0.9"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from={`0 ${cx} ${cy}`}
                        to={`360 ${cx} ${cy}`}
                        dur="10s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Node Outer Circle */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? "22" : "18"}
                    fill={isUnlocked ? (isSelected ? "#C85A32" : "#E76F51") : "#BDBDBD"}
                    stroke="#FFF"
                    strokeWidth="3.5"
                    filter="drop-shadow(0 3px 6px rgba(0,0,0,0.3))"
                  />

                  {/* Icon inside Node */}
                  <text
                    x={cx}
                    y={cy + 5}
                    textAnchor="middle"
                    fill="#FFF"
                    fontSize={isUnlocked ? "15" : "12"}
                    fontWeight="800"
                    pointerEvents="none"
                  >
                    {isUnlocked ? (k.id === 'lothal' ? '⚓' : '👑') : '🔒'}
                  </text>

                  {/* Label below Node */}
                  <rect
                    x={cx - 50}
                    y={cy + 24}
                    width="100"
                    height="20"
                    rx="5"
                    fill={isSelected ? "var(--terracotta-dark)" : "rgba(255,255,255,0.92)"}
                    stroke={isSelected ? "#FFF" : "var(--earth-border)"}
                    strokeWidth="1.2"
                  />
                  <text
                    x={cx}
                    y={cy + 38}
                    textAnchor="middle"
                    fill={isSelected ? "#FFF" : "var(--text-primary)"}
                    fontSize="11"
                    fontWeight="700"
                  >
                    {k.name[language].split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Kingdom Side Details Sheet */}
        <aside
          className="kaal-map-aside"
          style={{
            background: 'var(--sand-card)',
            borderLeft: '3px solid var(--earth-border)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 5
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isSelectedUnlocked ? '#E8F5E9' : '#ECEFF1',
                  color: isSelectedUnlocked ? '#2E7D32' : '#78909C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isSelectedUnlocked ? <Sparkles size={12} /> : <Lock size={12} />}
                {isSelectedUnlocked ? (language === 'en' ? 'Unlocked Era' : 'खुला हुआ काल') : (language === 'en' ? 'Locked Era' : 'बंद काल')}
              </span>

              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--terracotta-dark)' }}>
                {selectedKingdom.eraLabel[language]}
              </span>
            </div>

            <h2 style={{ fontSize: '24px', color: 'var(--terracotta-dark)', marginTop: '4px' }}>
              {selectedKingdom.name[language]}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <MapPin size={14} color="var(--terracotta)" />
              {selectedKingdom.regionName}
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '14px', lineHeight: '1.5' }}>
              {selectedKingdom.description[language]}
            </p>

            {/* "Aaj Ka Bhojan" Preview */}
            <div
              style={{
                marginTop: '16px',
                background: 'var(--terracotta-soft)',
                border: '1.5px solid var(--terracotta)',
                borderRadius: '12px',
                padding: '12px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta-dark)', textTransform: 'uppercase' }}>
                🌾 {selectedKingdom.foodQuest.title[language]}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.4' }}>
                {selectedKingdom.foodQuest.description[language]}
              </div>
            </div>

            {/* Status / Teaching focus */}
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong>Core Knowledge:</strong> {selectedKingdom.foodQuest.teachingCore}
            </div>
          </div>

          {/* Action Button */}
          <div style={{ marginTop: '24px' }}>
            {isSelectedUnlocked ? (
              <button
                className="btn-primary"
                onClick={handleEnterKingdom}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <Play size={18} fill="#FFF" />
                <span>{language === 'en' ? 'Spin Top & Enter Lothal' : 'लट्टू घुमाएं और लोथल जाएं'}</span>
              </button>
            ) : (
              <div
                style={{
                  background: '#ECEFF1',
                  color: '#546E7A',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Lock size={16} />
                <span>Earn Lothal's Kaal Shard to unlock this era!</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
