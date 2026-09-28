import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { MiniGameRecord, PlayerPosition } from '../../types/game';
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

// World coordinates: all drawing and positions use this logical 760x560 space.
const WORLD_WIDTH = 760;
const WORLD_HEIGHT = 560;
const BOUNDS = { minX: 80, maxX: 680, minY: 90, maxY: 520 };
const FRAME_MS = 1000 / 60; // speeds below are per 60fps frame
const WALK_SPEED = 3.5;
const LOW_URJA_WALK_SPEED = 2.2; // -30% when Urja is low
const MAX_FRAME_DT_MS = 50; // avoid a huge jump after a stalled/background frame
const COMPANION_FOLLOW = 0.12; // fraction of the gap closed per 60fps frame
const NPC_TALK_RADIUS = 60;
const NPC_CLICK_RADIUS = 42;
const SHIP_POS = { x: 150, y: 310 };
const SHIP_NEARBY_RADIUS = 90;
const SHIP_CLICK_RADIUS = 65;
const CANVAS_BORDER_PX = 4;
const TERRACOTTA_DARK = '#8D3B1B'; // var(--terracotta-dark)

const LOTHAL = kingdomsData.find((k) => k.id === 'lothal') || kingdomsData[0];
const LOTHAL_NPCS = npcsData.filter((npc) => npc.kingdom === 'lothal');

const MOVE_KEYS = {
  up: ['arrowup', 'w'],
  down: ['arrowdown', 's'],
  left: ['arrowleft', 'a'],
  right: ['arrowright', 'd']
};

const clampX = (x: number) => Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x));
const clampY = (y: number) => Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, y));

interface WorldView {
  player: { x: number; y: number };
  companion: { x: number; y: number };
  isMoving: boolean;
  nearbyNpcId: string | null;
  language: 'en' | 'hi';
  miniGameRecords: Record<string, MiniGameRecord>;
}

// Main 2.5D Canvas Render Routine (drawn in world coordinates)
const drawWorld = (ctx: CanvasRenderingContext2D, view: WorldView, now: number) => {
  const width = WORLD_WIDTH;
  const height = WORLD_HEIGHT;

  // Clear background: Sandy terracotta earth ground
  ctx.fillStyle = '#EBDCC9';
  ctx.fillRect(0, 0, width, height);

  // Draw Baked-Brick Grid Street Pavements
  ctx.strokeStyle = '#D9C5AF';
  ctx.lineWidth = 1;
  const gridSize = 40;
  ctx.beginPath();
  for (let x = 0; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // ==========================================
  // ZONE 1: TIDAL DOCKYARD & BASIN (South-West)
  // ==========================================
  // Basin Water (Deep Azure / Silt Blue)
  ctx.fillStyle = '#4A7C94';
  ctx.fillRect(50, 220, 210, 180);
  // Water Ripples
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  const time = now * 0.002;
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
  LOTHAL_NPCS.forEach((npc) => {
    const { x, y } = npc.isometricPos;
    const isNearby = view.nearbyNpcId === npc.id;

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
    ctx.fillText(npc.name[view.language], x, y - 22);

    // Mini-game champion badge & stars
    if (npc.miniGameId) {
      const rec = view.miniGameRecords[npc.miniGameId];
      const stars = rec ? '⭐'.repeat(rec.stars) : '';
      if (stars) {
        ctx.font = '10px sans-serif';
        ctx.fillText(stars, x, y - 36);
      }
    }

    // Interaction Prompt Bubble when close
    if (isNearby) {
      ctx.fillStyle = TERRACOTTA_DARK;
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
  const cx = view.companion.x;
  const cy = view.companion.y;

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
  if (view.isMoving) {
    ctx.fillStyle = 'rgba(215, 196, 165, 0.6)';
    ctx.beginPath();
    ctx.arc(cx - 12 + Math.random() * 4, cy + 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==========================================
  // DRAW PLAYER: YATRI
  // ==========================================
  const px = view.player.x;
  const py = view.player.y;

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

const CENTRAL_ZONE = -1;
const FALLBACK_ZONE_NAMES = ['Tidal Basin & Wharf', 'Bead Kiln & Workshop', 'Acro-Granary & Seals Bureau'];

// Index into LOTHAL.zones for a world position, or CENTRAL_ZONE
const getZoneIndex = (px: number, py: number) => {
  if (px < 280 && py > 200) return 0;
  if (px > 400 && py < 300) return 1;
  if (py > 360) return 2;
  return CENTRAL_ZONE;
};

const getZoneName = (zoneIndex: number, language: 'en' | 'hi') => {
  if (zoneIndex === CENTRAL_ZONE) return language === 'en' ? 'Central Brick Thoroughfare' : 'केंद्रीय पक्की सड़क';
  return LOTHAL.zones[zoneIndex]?.name[language] || FALLBACK_ZONE_NAMES[zoneIndex];
};

// Fit the 760x560 world (keeping its aspect ratio) into the free box between the
// HUD/overlays and the bottom controls. It grows on large screens such as 4K.
const fitCanvas = (boxWidth: number, boxHeight: number) => {
  const availW = boxWidth - CANVAS_BORDER_PX * 2;
  const availH = boxHeight - CANVAS_BORDER_PX * 2;
  const scale = Math.max(0.1, Math.min(availW / WORLD_WIDTH, availH / WORLD_HEIGHT));
  return { width: Math.round(WORLD_WIDTH * scale), height: Math.round(WORLD_HEIGHT * scale) };
};

export const LothalIsometricWorld: React.FC<LothalWorldProps> = ({
  onInteractNpc,
  onEnterMiniGame,
  onOpenCargoDecision
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);
  const minimapPinRef = useRef<HTMLDivElement | null>(null);

  const isLowUrja = useGameStore((state) => state.isLowUrja);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const miniGameRecords = useGameStore((state) => state.miniGameRecords);
  const isPaused = useGameStore((state) => state.isPaused || state.overlayCount > 0);

  // Position is read once on mount; afterwards the game loop owns it (in refs) and
  // syncs it back to the store when the player stops, avoiding a React render per frame.
  const [initialPosition] = useState<PlayerPosition>(() => useGameStore.getState().playerPosition);

  const [activeNearbyNpc, setActiveNearbyNpc] = useState<string | null>(null);
  const [activeNearbyGame, setActiveNearbyGame] = useState<string | null>(null);
  const [isNearShip, setIsNearShip] = useState<boolean>(false);
  const [zoneIndex, setZoneIndex] = useState(() => getZoneIndex(initialPosition.x, initialPosition.y));
  const activeZoneName = getZoneName(zoneIndex, language);
  const [canvasSize, setCanvasSize] = useState({ width: WORLD_WIDTH, height: WORLD_HEIGHT });

  // Mutable game-loop state
  const player = useRef({ ...initialPosition });
  const companion = useRef({ x: initialPosition.x - 20, y: initialPosition.y + 10 });
  const moveTarget = useRef<{ x: number; y: number } | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});

  // Latest props/state for the loop and listeners, which are registered once
  const live = useRef({ isPaused, isLowUrja, language, soundEnabled, miniGameRecords, activeNearbyNpc, onInteractNpc });
  useEffect(() => {
    live.current = { isPaused, isLowUrja, language, soundEnabled, miniGameRecords, activeNearbyNpc, onInteractNpc };
  });

  // Release held keys and stop walking whenever gameplay pauses
  useEffect(() => {
    if (isPaused) {
      keysPressed.current = {};
      moveTarget.current = null;
    }
  }, [isPaused]);

  // Check proximity to NPCs, ship, and mini-game stations (state only changes on transitions)
  const checkProximities = (px: number, py: number) => {
    let nearbyNpc: string | null = null;
    let nearbyGame: string | null = null;

    LOTHAL_NPCS.forEach((npc) => {
      const dist = Math.hypot(px - npc.isometricPos.x, py - npc.isometricPos.y);
      if (dist < NPC_TALK_RADIUS) {
        nearbyNpc = npc.id;
        if (npc.miniGameId) {
          nearbyGame = npc.miniGameId;
        }
      }
    });

    setActiveNearbyNpc(nearbyNpc);
    setActiveNearbyGame(nearbyGame);
    setIsNearShip(Math.hypot(px - SHIP_POS.x, py - SHIP_POS.y) < SHIP_NEARBY_RADIUS);
    setZoneIndex(getZoneIndex(px, py));
  };
  const checkProximitiesRef = useRef(checkProximities);
  useEffect(() => {
    checkProximitiesRef.current = checkProximities;
  });

  // Keep the canvas fitted to its box as the window (or HUD height) changes
  useEffect(() => {
    const box = canvasBoxRef.current;
    if (!box) return;
    const fit = () => setCanvasSize(fitCanvas(box.clientWidth, box.clientHeight));
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Backing store sized for the device pixel ratio so the world is crisp on HiDPI screens
  const dpr = window.devicePixelRatio || 1;

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { isPaused: paused, activeNearbyNpc: nearbyNpc, soundEnabled: soundOn } = live.current;
      if (paused) return;
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
      if (Object.values(MOVE_KEYS).some((keys) => keys.includes(key))) {
        moveTarget.current = null;
      }

      // Interaction shortcut: E or Space or Enter
      if ((key === 'e' || e.key === ' ' || e.key === 'Enter') && nearbyNpc && !e.repeat) {
        e.preventDefault();
        if (soundOn) sound.playClick();
        live.current.onInteractNpc(nearbyNpc);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    // Key-up events are lost when the window loses focus, which left the player walking.
    const releaseAllKeys = () => {
      keysPressed.current = {};
    };
    const handleVisibility = () => {
      if (document.hidden) releaseAllKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAllKeys);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAllKeys);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Game update loop (registered once; uses delta time so speed is independent of refresh rate)
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();
    let wasMoving = false;
    const pos = player.current;
    const comp = companion.current;

    checkProximitiesRef.current(pos.x, pos.y);

    const isHeld = (keys: string[]) => keys.some((k) => keysPressed.current[k]);

    const gameLoop = (now: number) => {
      const dt = Math.min(MAX_FRAME_DT_MS, now - lastTime);
      lastTime = now;
      const frames = dt / FRAME_MS;
      const { isPaused: paused, isLowUrja: lowUrja } = live.current;
      let isMoving = false;

      if (!paused) {
        const speed = (lowUrja ? LOW_URJA_WALK_SPEED : WALK_SPEED) * frames;
        let dx = 0;
        let dy = 0;

        if (isHeld(MOVE_KEYS.up)) dy -= 1;
        if (isHeld(MOVE_KEYS.down)) dy += 1;
        if (isHeld(MOVE_KEYS.left)) dx -= 1;
        if (isHeld(MOVE_KEYS.right)) dx += 1;

        const target = moveTarget.current;
        if (dx === 0 && dy === 0 && target) {
          // Walk towards a clicked point
          const tx = target.x - pos.x;
          const ty = target.y - pos.y;
          const dist = Math.hypot(tx, ty);
          if (dist <= speed) {
            dx = tx;
            dy = ty;
            moveTarget.current = null;
          } else {
            dx = (tx / dist) * speed;
            dy = (ty / dist) * speed;
          }
        } else if (dx !== 0 || dy !== 0) {
          // Normalize diagonal
          const len = Math.hypot(dx, dy);
          dx = (dx / len) * speed;
          dy = (dy / len) * speed;
        }

        if (dx !== 0 || dy !== 0) {
          const newX = clampX(pos.x + dx);
          const newY = clampY(pos.y + dy);
          isMoving = newX !== pos.x || newY !== pos.y;
          if (!isMoving) moveTarget.current = null; // pushing against the edge

          if (Math.abs(dx) >= Math.abs(dy)) pos.direction = dx > 0 ? 'E' : 'W';
          else pos.direction = dy > 0 ? 'S' : 'N';

          // Companion smooth trailing follow
          const targetX = newX - (dx !== 0 ? Math.sign(dx) * 35 : 0);
          const targetY = newY - (dy !== 0 ? Math.sign(dy) * 35 : 25);
          const follow = 1 - Math.pow(1 - COMPANION_FOLLOW, frames);
          comp.x += (targetX - comp.x) * follow;
          comp.y += (targetY - comp.y) * follow;

          pos.x = newX;
          pos.y = newY;
        }
      }
      pos.isMoving = isMoving;

      if (isMoving) {
        checkProximitiesRef.current(pos.x, pos.y);
        const pin = minimapPinRef.current;
        if (pin) {
          pin.style.left = `${(pos.x / WORLD_WIDTH) * 100}%`;
          pin.style.top = `${(pos.y / WORLD_HEIGHT) * 100}%`;
        }
      } else if (wasMoving) {
        setPlayerPosition({ ...pos });
      }
      wasMoving = isMoving;

      // Render 2.5D Isometric World Canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.setTransform(canvas.width / WORLD_WIDTH, 0, 0, canvas.height / WORLD_HEIGHT, 0, 0);
        const { language: lang, miniGameRecords: records, activeNearbyNpc: nearby } = live.current;
        drawWorld(ctx, {
          player: pos,
          companion: comp,
          isMoving,
          nearbyNpcId: nearby,
          language: lang,
          miniGameRecords: records
        }, Date.now());
      }
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
      setPlayerPosition({ ...pos, isMoving: false });
    };
  }, [setPlayerPosition]);

  // Virtual D-pad: press and hold to walk (touch, pen or mouse)
  const dpadHandlers = (key: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (isPaused) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      moveTarget.current = null;
      keysPressed.current[key] = true;
    },
    onPointerUp: () => { keysPressed.current[key] = false; },
    onPointerCancel: () => { keysPressed.current[key] = false; },
    onLostPointerCapture: () => { keysPressed.current[key] = false; },
    // Keyboard activation of a D-pad button (click with no pointer) takes a single step
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (e.detail !== 0 || isPaused) return;
      const [dx, dy] = key === 'arrowup' ? [0, -1] : key === 'arrowdown' ? [0, 1] : key === 'arrowleft' ? [-1, 0] : [1, 0];
      const step = (isLowUrja ? LOW_URJA_WALK_SPEED : WALK_SPEED) * 3;
      moveTarget.current = { x: clampX(player.current.x + dx * step), y: clampY(player.current.y + dy * step) };
    }
  });

  // Canvas Click-to-Move
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;

    // Scale from on-screen coordinates (inside the border) to world coordinates
    const cssScale = rect.width / canvas.offsetWidth;
    const clickX = (e.clientX - rect.left - canvas.clientLeft * cssScale) * (WORLD_WIDTH / (canvas.clientWidth * cssScale));
    const clickY = (e.clientY - rect.top - canvas.clientTop * cssScale) * (WORLD_HEIGHT / (canvas.clientHeight * cssScale));

    // Check if clicked directly on an NPC (before the ship: Marak stands inside the
    // ship's click area, so checking the ship first made him impossible to click)
    for (const npc of LOTHAL_NPCS) {
      const dist = Math.hypot(clickX - npc.isometricPos.x, clickY - npc.isometricPos.y);
      if (dist < NPC_CLICK_RADIUS) {
        onInteractNpc(npc.id);
        return;
      }
    }

    // Check if clicked directly on the trade ship Sagar Doot
    if (Math.hypot(clickX - SHIP_POS.x, clickY - SHIP_POS.y) < SHIP_CLICK_RADIUS) {
      if (onOpenCargoDecision) {
        onOpenCargoDecision();
        return;
      }
    }

    // Otherwise walk towards click target
    moveTarget.current = { x: clampX(clickX), y: clampY(clickY) };
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
        className="world-overlay-top"
        style={{
          position: 'absolute',
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
        className="world-overlay-top world-minimap"
        style={{
          position: 'absolute',
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
          {LOTHAL_NPCS.map((npc) => (
            <div
              key={npc.id}
              style={{
                position: 'absolute',
                left: `${(npc.isometricPos.x / WORLD_WIDTH) * 100}%`,
                top: `${(npc.isometricPos.y / WORLD_HEIGHT) * 100}%`,
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
            ref={minimapPinRef}
            style={{
              position: 'absolute',
              left: `${(initialPosition.x / WORLD_WIDTH) * 100}%`,
              top: `${(initialPosition.y / WORLD_HEIGHT) * 100}%`,
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
      <div ref={canvasBoxRef} className="world-canvas-box">
        <canvas
          ref={canvasRef}
          width={Math.round(canvasSize.width * dpr)}
          height={Math.round(canvasSize.height * dpr)}
          onClick={handleCanvasClick}
          style={{
            borderRadius: '16px',
            border: '4px solid var(--earth-border)',
            boxShadow: 'var(--shadow-lg)',
            cursor: 'crosshair',
            // Display size is fitted in JS; the backing store is scaled for crisp HiDPI
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            boxSizing: 'content-box',
            flexShrink: 0
          }}
        />
      </div>

      {/* Bottom Proximity Interaction Bar */}
      {(activeNearbyNpc || isNearShip) && (
        <div
          className="world-action-bar"
          style={{
            position: 'absolute',
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
              <span>Talk to {LOTHAL_NPCS.find((n) => n.id === activeNearbyNpc)?.name[language]}</span>
            </button>
          )}

          {activeNearbyGame && (
            <button
              className="btn-primary"
              style={{ background: 'var(--turmeric-dark)', borderColor: '#B8860B', display: 'flex', alignItems: 'center', gap: '6px' }}
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
        className="world-dpad"
        style={{
          position: 'absolute',
          touchAction: 'none',
          display: 'grid',
          gap: '4px',
          zIndex: 15,
          opacity: 0.85
        }}
      >
        <div />
        <button
          className="btn-secondary"
          style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Walk up"
          {...dpadHandlers('arrowup')}
        >
          <ArrowUp size={16} />
        </button>
        <div />

        <button
          className="btn-secondary"
          style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Walk left"
          {...dpadHandlers('arrowleft')}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888' }}>
          <Footprints size={14} />
        </div>
        <button
          className="btn-secondary"
          style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Walk right"
          {...dpadHandlers('arrowright')}
        >
          <ArrowRight size={16} />
        </button>

        <div />
        <button
          className="btn-secondary"
          style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Walk down"
          {...dpadHandlers('arrowdown')}
        >
          <ArrowDown size={16} />
        </button>
        <div />
      </div>
    </div>
  );
};
