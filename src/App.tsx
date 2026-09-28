import React, { useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { useUrjaTimer } from './hooks/useUrjaTimer';
import { HUD } from './components/hud/HUD';
import { KaalMap } from './components/map/KaalMap';
import { LothalIsometricWorld } from './components/kingdom/LothalIsometricWorld';
import { KaalGharHub } from './components/kaalghar/KaalGharHub';
import { NpcDialogueModal } from './components/dialogue/NpcDialogueModal';
import { CargoDecisionModal } from './components/dialogue/CargoDecisionModal';
import { MiniGameModal } from './components/minigames/MiniGameModal';
import { LazyBoundary } from './components/common/LazyBoundary';
import { DiyTemplatePrintModal } from './components/toy3d/DiyTemplatePrintModal';
import { FoodFactCard } from './components/food/FoodFactCard';

// three.js is large and only needed for the 3D viewer, so load it on demand
const Toy3DModal = React.lazy(() =>
  import('./components/toy3d/Toy3DViewer').then((m) => ({ default: m.Toy3DModal }))
);

export const App: React.FC = () => {
  // Activate Urja passive exploration drain (-1 every 20s)
  useUrjaTimer();

  const activeScreen = useGameStore((state) => state.activeScreen);
  const startMiniGame = useGameStore((state) => state.startMiniGame);
  const closeMiniGame = useGameStore((state) => state.closeMiniGame);
  const activeToyId = useGameStore((state) => state.activeToyId);
  const openToyModal = useGameStore((state) => state.openToyModal);
  const closeToyModal = useGameStore((state) => state.closeToyModal);

  // Local Modal States
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);
  const [diyPrintToyId, setDiyPrintToyId] = useState<string | null>(null);

  // Auto-dismiss child modals if Kaal Thakaan triggers
  React.useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.isKaalThakaanTriggered && !prev.isKaalThakaanTriggered) {
          setActiveNpcId(null);
          setActiveGameId(null);
          setIsCargoModalOpen(false);
          setDiyPrintToyId(null);
        }
      }),
    []
  );

  const handleInteractNpc = (npcId: string) => {
    setActiveNpcId(npcId);
  };

  const handleStartMiniGame = (gameId: string) => {
    const success = startMiniGame(gameId);
    if (success) {
      setActiveGameId(gameId);
    }
  };

  return (
    <div className="app-container">
      {/* Universal HUD Bar with Urja Meter, Gyaan, Active Quest Tracker & Companion */}
      <HUD />

      {/* Primary Screen Viewport Router */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeScreen === 'kaal_map' && <KaalMap />}

        {activeScreen === 'kingdom' && (
          <LothalIsometricWorld
            onInteractNpc={handleInteractNpc}
            onEnterMiniGame={handleStartMiniGame}
            onOpenCargoDecision={() => setIsCargoModalOpen(true)}
          />
        )}

        {activeScreen === 'kaal_ghar' && (
          <KaalGharHub
            onOpenToy3D={(toyId) => openToyModal(toyId)}
            onOpenDiyTemplate={(toyId) => setDiyPrintToyId(toyId)}
          />
        )}
      </div>

      {/* NPC Dialogue & Barter Modal */}
      {activeNpcId && (
        <NpcDialogueModal
          npcId={activeNpcId}
          onClose={() => setActiveNpcId(null)}
          onStartMiniGame={(gameId) => {
            setActiveNpcId(null);
            handleStartMiniGame(gameId);
          }}
          onOpenCargoDecision={() => {
            setActiveNpcId(null);
            setIsCargoModalOpen(true);
          }}
        />
      )}

      {/* Active Mini-Game Challenge Modal */}
      {activeGameId && (
        <MiniGameModal
          gameId={activeGameId}
          onClose={() => {
            setActiveGameId(null);
            closeMiniGame();
          }}
        />
      )}

      {/* Mesopotamia Trade Cargo Decision Modal */}
      {isCargoModalOpen && (
        <CargoDecisionModal
          onClose={() => setIsCargoModalOpen(false)}
        />
      )}

      {/* 3D Toy Viewer Modal (Three.js) */}
      {activeToyId && (
        <LazyBoundary onClose={closeToyModal}>
          <Toy3DModal
            toyId={activeToyId}
            onClose={closeToyModal}
            onOpenDiyPrint={() => {
              const currentId = activeToyId;
              closeToyModal();
              setDiyPrintToyId(currentId);
            }}
          />
        </LazyBoundary>
      )}

      {/* Printable DIY Craft Blueprint Modal */}
      {diyPrintToyId && (
        <DiyTemplatePrintModal
          toyId={diyPrintToyId}
          onClose={() => setDiyPrintToyId(null)}
        />
      )}

      {/* Food Discovery Card Modal */}
      <FoodFactCard />
    </div>
  );
};

export default App;
