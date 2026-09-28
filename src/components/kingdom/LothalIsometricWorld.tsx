import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import npcsData from '../../content/npcs.json';
import kingdomsData from '../../content/kingdoms.json';
import { sound } from '../../utils/audio';
import { 
  Compass, 
  MessageSquare, 
  Trophy, 
  Footprints, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Ship
} from 'lucide-react';

interface LothalWorldProps {
  onInteractNpc: (npcId: string) => void;
  onEnterMiniGame: (gameId: string) => void;
  onOpenCargoDecision?: () => void;
}

export const LothalIsometricWorld: React.FC<LothalWorldProps> = ({
  onInteractNpc,
  onEnterMiniGame,
  onOpenCargoDecision
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isLowUrja = useGameStore((state) => state.isLowUrja);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const miniGameRecords = useGameStore((state) => state.miniGameRecords);
  const isPaused = useGameStore((state) => state.isPaused);

  // Companion follower coordinates (lagging smooth follow)
  const [companionPos, setCompanionPos] = useState({ x: 300, y: 290 });
  const [activeNearbyNpc, setActiveNearbyNpc] = useState<string | null>(null);
  const [activeNearbyGame, setActiveNearbyGame] = useState<string | null>(null);
  const [isNearShip, setIsNearShip] = useState<boolean>(false);
  const [activeZoneName, setActiveZoneName] = useState<string>('Lothal Lower Town');

  // Input keys
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const lothal = kingdomsData.find((k) => k.id === 'lothal') || kingdomsData[0];
  const lothalNpcs = npcsData.filter((npc) => npc.kingdom === 'lothal');

  // Check proximity to NPCs, ship, and mini-game stations
  const checkProximities = useCallback((px: number, py: number) => {
    let nearbyNpc: string | null = null;
    let nearbyGame: string | null = null;

    lothalNpcs.forEach((npc) => {
      const dist = Math.hypot(px - npc.isometricPos.x, py - npc.isometricPos.y);
      if (dist < 60) {
        nearbyNpc = npc.id;
        if (npc.miniGameId) {
          nearbyGame = npc.miniGameId;
        }
      }
    });

    setActiveNearbyNpc(nearbyNpc);
    setActiveNearbyGame(nearbyGame);

    // Check proximity to the docked ship Sagar Doot (x: 150, y: 310)
    const distToShip = Math.hypot(px - 150, py - 310);
    setIsNearShip(distToShip < 90);

    // Identify active zone
    if (px < 280 && py > 200) {
      setActiveZoneName(lothal.zones[0]?.name[language] || 'Tidal Basin & Wharf');
    } else if (px > 400 && py < 300) {
      setActiveZoneName(lothal.zones[1]?.name[language] || 'Bead Kiln & Workshop');
    } else if (py > 360) {
      setActiveZoneName(lothal.zones[2]?.name[language] || 'Acro-Granary & Seals Bureau');
    } else {
      setActiveZoneName(language === 'en' ? 'Central Brick Thoroughfare' : 'केंद्रीय पक्की सड़क');
    }
  }, [lothal, lothalNpcs, language]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;
      keysPressed.current[e.key.toLowerCase()] = true;

      // Interaction shortcut: E or Space or Enter
      if ((e.key.toLowerCase() === 'e' || e.key === ' ' || e.key === 'Enter') && activeNearbyNpc) {
        e.preventDefault();
        if (soundEnabled) sound.playClick();
        onInteractNpc(activeNearbyNpc);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeNearbyNpc, onInteractNpc, soundEnabled, isPaused]);

  // Game update loop
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      if (!isPaused) {
        // Calculate speed (walk speed -30% when low energy <25)
        const baseSpeed = isLowUrja ? 2.2 : 3.5;
        let dx = 0;
        let dy = 0;

        if (keysPressed.current['arrowup'] || keysPressed.current['w']) dy -= baseSpeed;
        if (keysPressed.current['arrowdown'] || keysPressed.current['s']) dy += baseSpeed;
        if (keysPressed.current['arrowleft'] || keysPressed.current['a']) dx -= baseSpeed;
        if (keysPressed.current['arrowright'] || keysPressed.current['d']) dx += baseSpeed;

        if (dx !== 0 || dy !== 0) {
          // Normalize diagonal
          if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
          }

          const newX = Math.max(80, Math.min(680, playerPosition.x + dx));
          const newY = Math.max(90, Math.min(520, playerPosition.y + dy));

          let dir = playerPosition.direction;
          if (dx > 0) dir = 'E';
          else if (dx < 0) dir = 'W';
          else if (dy > 0) dir = 'S';
          else if (dy < 0) dir = 'N';

          setPlayerPosition({ x: newX, y: newY, direction: dir, isMoving: true });

          // Companion smooth trailing follow
          setCompanionPos((prev) => {
            const targetX = newX - (dx !== 0 ? Math.sign(dx) * 35 : 0);
            const targetY = newY - (dy !== 0 ? Math.sign(dy) * 35 : 25);
            return {
              x: prev.x + (targetX - prev.x) * 0.12,
              y: prev.y + (targetY - prev.y) * 0.12
            };
          });

          checkProximities(newX, newY);
        } else {
          if (playerPosition.isMoving) {
            setPlayerPosition({ isMoving: false });
          }
        }
      }

      // Render 2.5D Isometric World Canvas
      renderCanvas();
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [playerPosition, isLowUrja, isPaused, checkProximities, setPlayerPosition]);

  // Main 2.5D Canvas Render Routine
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background: Sandy terracotta earth ground
    ctx.fillStyle = '#EBDCC9';
    ctx.fillRect(0, 0, width, height);

    // Draw Baked-Brick Grid Street Pavements
    ctx.strokeStyle = '#D9C5AF';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // ==========================================
    // ZONE 1: TIDAL DOCKYARD & BASIN (South-West)
    // ==========================================
    // Basin Water (Deep Azure / Silt Blue)
    ctx.fillStyle = '#4A7C94';
    ctx.fillRect(50, 220, 210, 180);
    // Water Ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    const time = Date.now() * 0.002;
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      const waveY = 250 + r * 35 + Math.sin(time + r) * 4;
      ctx.moveTo(70, waveY);
      ctx.bezierCurveTo(120, waveY - 6, 170, waveY + 6, 230, waveY);
      ctx.stroke();
    }

    // Baked-Brick Wharf Walls (Terracotta Masonry)
    ctx.fillStyle = '#C85A32';
    ctx.fillRect(40, 210, 230, 14); // North wall
    ctx.fillRect(40, 396, 230, 14); // South wall
    ctx.fillRect(40, 210, 14, 200); // West inlet
    ctx.fillRect(256, 210, 14, 200); // East wharf platform

    // Wooden Sluice Gate
    ctx.fillStyle = '#795548';
    ctx.fillRect(44, 280, 12, 60);

    // Moored Trade Ship (Seafaring Dhow)
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.ellipse(150, 310, 50, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FAF0E6';
    // Canvas Sail
    ctx.beginPath();
    ctx.moveTo(150, 305);
    ctx.lineTo(170, 260);
    ctx.lineTo(135, 285);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#D7CCC8';
    ctx.font = '10px sans-serif';
    ctx.fillText('⛵ Sagar Doot', 115, 335);

    // ==========================================
    // ZONE 2: BEAD KILN & WORKSHOP (North-East)
    // ==========================================
    // Workshop Foundation Floor
    ctx.fillStyle = '#E0A96D';
    ctx.fillRect(410, 100, 240, 160);
    ctx.strokeStyle = '#8D3B1B';
    ctx.lineWidth = 3;
    ctx.strokeRect(410, 100, 240, 160);

    // Underground Bead Kiln (Circular Earthen Furnace with Glowing Embers)
    ctx.fillStyle = '#8D3B1B';
    ctx.beginPath();
    ctx.arc(580, 150, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E65100';
    ctx.beginPath();
    ctx.arc(580, 150, 18 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(580, 150, 8, 0, Math.PI * 2);
    ctx.fill();

    // Bead Drilling Workbenches & Agate Nodules
    ctx.fillStyle = '#A1887F';
    ctx.fillRect(440, 180, 45, 24);
    ctx.fillStyle = '#D9383A'; // Red carnelian beads
    ctx.beginPath();
    ctx.arc(450, 192, 4, 0, Math.PI * 2);
    ctx.arc(462, 192, 4, 0, Math.PI * 2);
    ctx.arc(474, 192, 4, 0, Math.PI * 2);
    ctx.fill();

    // ==========================================
    // ZONE 3: ACRO-GRANARY & SEALS BUREAU (South)
    // ==========================================
    // Raised Mud-Brick Podium (4m Elevated Acropolis)
    ctx.fillStyle = '#D7C4A5';
    ctx.fillRect(260, 360, 260, 140);
    // Platform Elevation Shadow
    ctx.fillStyle = 'rgba(78, 52, 46, 0.25)';
    ctx.fillRect(260, 495, 260, 12);

    // 4 Granary Storage Blocks
    ctx.fillStyle = '#BCAAA4';
    ctx.fillRect(280, 380, 45, 45);
    ctx.fillRect(340, 380, 45, 45);
    ctx.fillRect(400, 380, 45, 45);
    ctx.fillRect(460, 380, 45, 45);
    ctx.fillStyle = '#5D4037';
    ctx.font = '10px sans-serif';
    ctx.fillText('Granary', 282, 410);

    // ==========================================
    // COVERED BRICK SEWER DRAINS (Lothal Sanitary)
    // ==========================================
    ctx.fillStyle = '#8D7B68';
    ctx.fillRect(310, 0, 18, height);
    ctx.fillStyle = '#5D4037';
    for (let dy = 15; dy < height; dy += 35) {
      ctx.fillRect(312, dy, 14, 5); // Brick inspection covers
    }

    // ==========================================
    // DRAW NPCS
    // ==========================================
    lothalNpcs.forEach((npc) => {
      const { x, y } = npc.isometricPos;
      const isNearby = activeNearbyNpc === npc.id;

      // Aura if champion
      if (npc.isMiniGameChampion) {
        ctx.fillStyle = 'rgba(233, 180, 76, 0.35)';
        ctx.beginPath();
        ctx.arc(x, y, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // NPC Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(x, y + 10, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // NPC Sprite Avatar
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(npc.avatar, x, y + 6);

      // Name & Role Tag
      ctx.fillStyle = '#2C1810';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(npc.name[language], x, y - 22);

      // Mini-game champion badge & stars
      if (npc.miniGameId) {
        const rec = miniGameRecords[npc.miniGameId];
        const stars = rec ? '⭐'.repeat(rec.stars) : '';
        if (stars) {
          ctx.font = '10px sans-serif';
          ctx.fillText(stars, x, y - 36);
        }
      }

      // Interaction Prompt Bubble when close
      if (isNearby) {
        ctx.fillStyle = 'var(--terracotta-dark)';
        ctx.beginPath();
        ctx.roundRect(x - 48, y - 48, 96, 20, 6);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('Press E / Tap', x, y - 34);
      }
    });

    // ==========================================
    // DRAW COMPANION (Terracotta Bull on Wheels)
    // ==========================================
    const cx = companionPos.x;
    const cy = companionPos.y;

    // Companion Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Terracotta Wheels
    ctx.fillStyle = '#A04000';
    ctx.beginPath();
    ctx.arc(cx - 8, cy + 6, 4.5, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy + 6, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Terracotta Bull Body
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐂', cx, cy + 4);

    // Companion Little Whirring Wheels / Dust particles when moving
    if (playerPosition.isMoving) {
      ctx.fillStyle = 'rgba(215, 196, 165, 0.6)';
      ctx.beginPath();
      ctx.arc(cx - 12 + Math.random() * 4, cy + 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ==========================================
    // DRAW PLAYER: YATRI
    // ==========================================
    const px = playerPosition.x;
    const py = playerPosition.y;

    // Player Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + 12, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Yatri Character Sprite
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧑‍🌾', px, py + 8);

    // Player Spinning Top (Lattu on belt)
    ctx.fillStyle = '#B22222';
    ctx.beginPath();
    ctx.arc(px + 10, py + 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Name tag
    ctx.fillStyle = '#1D2D50';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Yatri', px, py - 18);
  };

  // Touch / Virtual D-pad Movement handlers
  const handleDirectionMove = (dx: number, dy: number) => {
    if (isPaused) return;
    const baseSpeed = isLowUrja ? 2.2 : 3.5;
    const newX = Math.max(80, Math.min(680, playerPosition.x + dx * baseSpeed * 3));
    const newY = Math.max(90, Math.min(520, playerPosition.y + dy * baseSpeed * 3));
    setPlayerPosition({ x: newX, y: newY, isMoving: true });
    setCompanionPos((prev) => ({
      x: prev.x + (newX - prev.x) * 0.15,
      y: prev.y + (newY - prev.y) * 0.15
    }));
    checkProximities(newX, newY);
  };

  // Canvas Click-to-Move
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    // Scale from CSS display coordinates to 760x560 internal canvas resolution
    const scaleX = 760 / rect.width;
    const scaleY = 560 / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check if clicked directly on the trade ship Sagar Doot (x: 150, y: 310)
    if (Math.hypot(clickX - 150, clickY - 310) < 65) {
      if (onOpenCargoDecision) {
        onOpenCargoDecision();
        return;
      }
    }

    // Check if clicked directly on an NPC
    for (const npc of lothalNpcs) {
      const dist = Math.hypot(clickX - npc.isometricPos.x, clickY - npc.isometricPos.y);
      if (dist < 42) {
        onInteractNpc(npc.id);
        return;
      }
    }

    // Otherwise walk towards click target
    const targetX = Math.max(80, Math.min(680, clickX));
    const targetY = Math.max(90, Math.min(520, clickY));
    setPlayerPosition({ x: targetX, y: targetY, isMoving: true });
    setCompanionPos((prev) => ({
      x: prev.x + (targetX - prev.x) * 0.2,
      y: prev.y + (targetY - prev.y) * 0.2
    }));
    checkProximities(targetX, targetY);
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ECE3D2',
        overflow: 'hidden'
      }}
    >
      {/* Zone Title Banner */}
      <div 
        style={{
          position: 'absolute',
          top: '74px',
          left: '20px',
          zIndex: 10,
          background: 'rgba(255, 253, 249, 0.94)',
          border: '2px solid var(--earth-border)',
          borderRadius: '12px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <Compass size={16} color="var(--terracotta)" />
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--terracotta-dark)' }}>
          {activeZoneName}
        </span>
      </div>

      {/* Mini-Radar Map (Top-Right) */}
      <div 
        style={{
          position: 'absolute',
          top: '74px',
          right: '20px',
          zIndex: 10,
          width: '130px',
          height: '100px',
          background: 'rgba(255, 253, 249, 0.94)',
          border: '2px solid var(--earth-border)',
          borderRadius: '10px',
          boxShadow: 'var(--shadow-sm)',
          padding: '4px',
          pointerEvents: 'none'
        }}
      >
        <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '2px', textAlign: 'center' }}>
          LOTHAL MINIMAP
        </div>
        <div style={{ position: 'relative', width: '100%', height: '80px', background: '#EAE0D0', borderRadius: '6px', overflow: 'hidden' }}>
          {/* Dock zone */}
          <div style={{ position: 'absolute', left: '10px', top: '35px', width: '30px', height: '30px', background: '#4A7C94', opacity: 0.6 }} />
          {/* Kiln zone */}
          <div style={{ position: 'absolute', right: '10px', top: '10px', width: '35px', height: '25px', background: '#E0A96D', opacity: 0.6 }} />
          {/* Granary zone */}
          <div style={{ position: 'absolute', left: '45px', bottom: '5px', width: '40px', height: '25px', background: '#D7C4A5', opacity: 0.6 }} />

          {/* NPCs on minimap */}
          {lothalNpcs.map((npc) => (
            <div 
              key={npc.id}
              style={{
                position: 'absolute',
                left: `${(npc.isometricPos.x / 760) * 100}%`,
                top: `${(npc.isometricPos.y / 560) * 100}%`,
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#E65100',
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {/* Player Pin */}
          <div 
            style={{
              position: 'absolute',
              left: `${(playerPosition.x / 760) * 100}%`,
              top: `${(playerPosition.y / 560) * 100}%`,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#2B3A67',
              border: '1.5px solid #FFF',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>
      </div>

      {/* Main 2.5D Isometric World Canvas */}
      <canvas
        ref={canvasRef}
        width={760}
        height={560}
        onClick={handleCanvasClick}
        style={{
          borderRadius: '16px',
          border: '4px solid var(--earth-border)',
          boxShadow: 'var(--shadow-lg)',
          cursor: 'crosshair',
          maxWidth: '96vw',
          maxHeight: 'calc(100vh - 160px)'
        }}
      />

      {/* Bottom Proximity Interaction Bar */}
      {(activeNearbyNpc || isNearShip) && (
        <div 
          style={{
            position: 'absolute',
            bottom: '76px',
            zIndex: 20,
            display: 'flex',
            gap: '12px',
            background: 'var(--sand-card)',
            border: '2px solid var(--terracotta)',
            borderRadius: '16px',
            padding: '10px 18px',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 0.2s ease',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          {activeNearbyNpc && (
            <button 
              className="btn-primary"
              onClick={() => onInteractNpc(activeNearbyNpc)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MessageSquare size={16} />
              <span>Talk to {lothalNpcs.find((n) => n.id === activeNearbyNpc)?.name[language]}</span>
            </button>
          )}

          {activeNearbyGame && (
            <button 
              className="btn-primary"
              style={{ background: 'var(--turmeric-dark)', borderColor: '#B8860B' }}
              onClick={() => onEnterMiniGame(activeNearbyGame)}
            >
              <Trophy size={16} />
              <span>Enter Champion Challenge</span>
            </button>
          )}

          {isNearShip && onOpenCargoDecision && (
            <button 
              className="btn-primary"
              style={{ background: 'var(--indigo)', borderColor: '#1A2340', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onOpenCargoDecision}
            >
              <Ship size={16} />
              <span>🚢 {language === 'en' ? 'Sagar Doot Cargo Decision' : 'सागर दूत माल निर्णय'}</span>
            </button>
          )}
        </div>
      )}

      {/* Virtual Touch D-Pad for Chromebooks / Mobile */}
      <div 
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 40px)',
          gridTemplateRows: 'repeat(3, 40px)',
          gap: '4px',
          zIndex: 15,
          opacity: 0.85
        }}
      >
        <div />
        <button 
          className="btn-secondary" 
          style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => handleDirectionMove(0, -1)}
        >
          <ArrowUp size={16} />
        </button>
        <div />

        <button 
          className="btn-secondary" 
          style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => handleDirectionMove(-1, 0)}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888' }}>
          <Footprints size={14} />
        </div>
        <button 
          className="btn-secondary" 
          style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => handleDirectionMove(1, 0)}
        >
          <ArrowRight size={16} />
        </button>

        <div />
        <button 
          className="btn-secondary" 
          style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => handleDirectionMove(0, 1)}
        >
          <ArrowDown size={16} />
        </button>
        <div />
      </div>
    </div>
  );
};
