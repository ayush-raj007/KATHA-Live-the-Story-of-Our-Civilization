import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import toysData from '../../content/toys.json';
import { Printer, ChevronRight } from 'lucide-react';
import { sound } from '../../utils/audio';

interface KaalGharHubProps {
  onOpenToy3D: (toyId: string) => void;
  onOpenDiyTemplate: (toyId: string) => void;
}

export const KaalGharHub: React.FC<KaalGharHubProps> = ({
  onOpenToy3D,
  onOpenDiyTemplate
}) => {
  const language = useGameStore((state) => state.language);
  const setScreen = useGameStore((state) => state.setScreen);
  const kaalShards = useGameStore((state) => state.kaalShards);
  const journalEntries = useGameStore((state) => state.journalEntries);
  const unlockedToys = useGameStore((state) => state.unlockedToys);
  const soundEnabled = useGameStore((state) => state.soundEnabled);

  const [activeTab, setActiveTab] = useState<'shelf' | 'journal' | 'blueprints'>('shelf');
  const [journalCategory, setJournalCategory] = useState<string>('all');

  const filteredJournal = journalEntries.filter((entry) => {
    if (journalCategory === 'all') return true;
    return entry.category === journalCategory;
  });

  const hasLothalShard = kaalShards.includes('lothal_shard');

  return (
    <div
      className="screen-below-hud"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 50% 30%, #FFFDF9 0%, #F0E6D8 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          background: 'rgba(255, 253, 249, 0.95)',
          borderBottom: '2px solid var(--earth-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 10
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            TEMPORAL SANCTUARY &amp; TOY ARCHIVE
          </div>
          <h1 style={{ fontSize: '24px', color: 'var(--terracotta-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏠</span> {language === 'en' ? 'Kaal Ghar (Home Base)' : 'काल घर (गृह आधार)'}
          </h1>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`btn-secondary ${activeTab === 'shelf' ? 'btn-primary' : ''}`}
            onClick={() => {
              if (soundEnabled) sound.playClick();
              setActiveTab('shelf');
            }}
          >
            🏺 {language === 'en' ? 'Toy Shelf' : 'खिलौना मंच'}
          </button>

          <button
            className={`btn-secondary ${activeTab === 'journal' ? 'btn-primary' : ''}`}
            onClick={() => {
              if (soundEnabled) sound.playClick();
              setActiveTab('journal');
            }}
          >
            📜 {language === 'en' ? 'Knowledge Journal' : 'ज्ञान पत्रिका'} ({journalEntries.length})
          </button>

          <button
            className={`btn-secondary ${activeTab === 'blueprints' ? 'btn-primary' : ''}`}
            onClick={() => {
              if (soundEnabled) sound.playClick();
              setActiveTab('blueprints');
            }}
          >
            ✂️ {language === 'en' ? 'DIY Blueprints' : 'शिल्प खाका'}
          </button>

          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              if (soundEnabled) sound.playClick();
              setScreen('kingdom');
            }}
          >
            <span>Return to Lothal</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="clear-of-companion" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {/* TAB 1: TOY COLLECTION SHELF */}
        {activeTab === 'shelf' && (
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            {/* Lattu Status Banner */}
            <div
              style={{
                background: '#FFF',
                border: '2px solid var(--earth-border)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '48px' }}>🌀</div>
                <div>
                  <h3 style={{ color: 'var(--terracotta-dark)', fontSize: '18px' }}>
                    Channapatna Lacquered Spinning Top (Temporal Core)
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {hasLothalShard
                      ? '✓ Lothal Kaal Shard restored! Temporal resonance is 20% stabilized.'
                      : '⚠️ Top is cracked and leaking temporal energy. Win 3 champions in Lothal to earn the first shard!'}
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: hasLothalShard ? '#E8F5E9' : '#FFF3E0',
                  border: `1.5px solid ${hasLothalShard ? '#4CAF50' : '#FF9800'}`,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, color: hasLothalShard ? '#2E7D32' : '#E65100' }}>
                  KAAL SHARDS
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {kaalShards.length} / 5
                </div>
              </div>
            </div>

            {/* Wooden Toy Shelf Grid */}
            <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Collected Traditional Toys Across Indian History
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '18px' }}>
              {toysData.map((toy) => {
                const isUnlocked = unlockedToys.includes(toy.id);

                return (
                  <div
                    key={toy.id}
                    style={{
                      background: '#FFF',
                      border: `2px solid ${isUnlocked ? 'var(--terracotta)' : 'var(--earth-border)'}`,
                      borderRadius: '16px',
                      padding: '18px',
                      boxShadow: 'var(--shadow-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: isUnlocked ? 1 : 0.6
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '32px' }}>
                          {toy.id === 'toy_terracotta_bull' ? '🐂' : '🪵'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isUnlocked ? '#E8F5E9' : '#ECEFF1',
                            color: isUnlocked ? '#2E7D32' : '#78909C'
                          }}
                        >
                          {isUnlocked ? 'Collected' : 'Locked Era'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '16px', color: 'var(--terracotta-dark)' }}>
                        {toy.name[language]}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {toy.craftOrigin} • {toy.approximateDate}
                      </div>

                      <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '10px', lineHeight: '1.4' }}>
                        {toy.historicalContext[language].slice(0, 140)}...
                      </p>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-primary"
                        disabled={!isUnlocked}
                        onClick={() => onOpenToy3D(toy.id)}
                        style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
                      >
                        🔍 Inspect in 3D
                      </button>
                      <button
                        className="btn-secondary"
                        disabled={!isUnlocked}
                        onClick={() => onOpenDiyTemplate(toy.id)}
                        style={{ fontSize: '12px', padding: '8px 10px' }}
                        title="View printable DIY template"
                      >
                        <Printer size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: KNOWLEDGE JOURNAL */}
        {activeTab === 'journal' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {['all', 'history', 'food', 'decision'].map((cat) => (
                <button
                  key={cat}
                  className={`btn-secondary ${journalCategory === cat ? 'btn-primary' : ''}`}
                  onClick={() => setJournalCategory(cat)}
                  style={{ fontSize: '12px', padding: '6px 14px', textTransform: 'capitalize' }}
                >
                  {cat === 'all' ? 'All Knowledge Entries' : `${cat} Archives`}
                </button>
              ))}
            </div>

            {/* Entries List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredJournal.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: '#FFF',
                    border: '2px solid var(--earth-border)',
                    borderLeft: `6px solid ${entry.category === 'food' ? 'var(--turmeric)' : entry.category === 'decision' ? 'var(--indigo)' : 'var(--terracotta)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta)', textTransform: 'uppercase' }}>
                        {entry.category}
                      </span>
                      <h3 style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                        {entry.title}
                      </h3>
                    </div>

                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: entry.status === 'VERIFIED' ? '#E8F5E9' : '#FFF3E0',
                        color: entry.status === 'VERIFIED' ? '#2E7D32' : '#E65100'
                      }}
                    >
                      {entry.status === 'VERIFIED' ? 'Verified Fact' : 'Historians think...'}
                    </span>
                  </div>

                  <p style={{ fontSize: '13.5px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                    {entry.body}
                  </p>

                  {entry.source && (
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                      <strong>Source:</strong> {entry.source}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DIY BLUEPRINTS */}
        {activeTab === 'blueprints' && (
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Unlocked Phygital Living Toy Templates
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: '16px' }}>
              {toysData.map((toy) => (
                <div
                  key={toy.id}
                  style={{
                    background: '#FFF',
                    border: '2px solid var(--earth-border)',
                    borderRadius: '14px',
                    padding: '18px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta)', textTransform: 'uppercase' }}>
                    {toy.diyTemplate.craftType}
                  </div>
                  <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {toy.diyTemplate.title[language]}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Materials: {toy.diyTemplate.materials.slice(0, 3).join(', ')}...
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => onOpenDiyTemplate(toy.id)}
                    style={{ marginTop: '14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Printer size={14} />
                    <span>Open Printable Blueprint</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
