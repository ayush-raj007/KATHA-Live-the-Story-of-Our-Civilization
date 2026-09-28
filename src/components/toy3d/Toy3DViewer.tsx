import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import toysData from '../../content/toys.json';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { RotateCw, Printer, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { usePauseWhile } from '../../hooks/usePauseWhile';

interface Toy3DModalProps {
  toyId: string;
  onClose: () => void;
  onOpenDiyPrint: () => void;
}

export const Toy3DModal: React.FC<Toy3DModalProps> = ({
  toyId,
  onClose,
  onOpenDiyPrint
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const language = useGameStore((state) => state.language);
  const miniGameRecords = useGameStore((state) => state.miniGameRecords);
  const kaalShards = useGameStore((state) => state.kaalShards);
  const claimKaalShard = useGameStore((state) => state.claimKaalShard);
  usePauseWhile(true);

  const [isAutoSpinning, setIsAutoSpinning] = useState(true);
  const [shardClaimed, setShardClaimed] = useState(kaalShards.includes('lothal_shard'));

  // Read by the render loop, so toggling spin doesn't rebuild the whole WebGL scene
  const autoSpinRef = useRef(isAutoSpinning);
  useEffect(() => {
    autoSpinRef.current = isAutoSpinning;
  }, [isAutoSpinning]);

  const toy = toysData.find((t) => t.id === toyId) || toysData[0];

  // Check if all 3 Lothal champions are passed
  const all3Passed =
    Boolean(miniGameRecords['bead_driller']?.passed &&
    miniGameRecords['tide_dock']?.passed &&
    miniGameRecords['seal_match']?.passed);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF5ECE1);

    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xFFF2E0, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    dirLight.position.set(4, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const warmRim = new THREE.PointLight(0xE07A5F, 1.5, 10);
    warmRim.position.set(-3, 2, -2);
    scene.add(warmRim);

    // 3. Procedural 3D Terracotta Bull on Wheels Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Terracotta Material
    const terracottaMat = new THREE.MeshStandardMaterial({
      color: 0xC85A32,
      roughness: 0.85,
      metalness: 0.05
    });

    const darkTerracottaMat = new THREE.MeshStandardMaterial({
      color: 0x8D3B1B,
      roughness: 0.9
    });

    const axleMat = new THREE.MeshStandardMaterial({
      color: 0x5D4037,
      roughness: 0.6
    });

    // Bull Torso (Barrel body with slight clay taper)
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.6, 1.5, 16);
    const bodyMesh = new THREE.Mesh(bodyGeo, terracottaMat);
    bodyMesh.rotation.z = Math.PI / 2;
    bodyMesh.position.set(0, 0.4, 0);
    modelGroup.add(bodyMesh);

    // Bull Hump (Indus Zebu distinctive hump)
    const humpGeo = new THREE.SphereGeometry(0.35, 16, 12);
    const humpMesh = new THREE.Mesh(humpGeo, terracottaMat);
    humpMesh.position.set(-0.3, 1.05, 0);
    humpMesh.scale.set(1, 1.3, 0.9);
    modelGroup.add(humpMesh);

    // Bull Neck & Head
    const headGeo = new THREE.ConeGeometry(0.4, 0.8, 14);
    const headMesh = new THREE.Mesh(headGeo, terracottaMat);
    headMesh.rotation.z = -Math.PI / 3;
    headMesh.position.set(0.9, 0.85, 0);
    modelGroup.add(headMesh);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.08, 0.45, 8);
    const leftHorn = new THREE.Mesh(hornGeo, darkTerracottaMat);
    leftHorn.rotation.set(-0.4, 0, 0.3);
    leftHorn.position.set(0.95, 1.25, 0.22);
    modelGroup.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeo, darkTerracottaMat);
    rightHorn.rotation.set(0.4, 0, 0.3);
    rightHorn.position.set(0.95, 1.25, -0.22);
    modelGroup.add(rightHorn);

    // Transverse Axles (Punctured holes for wheels)
    const axleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 12);
    const frontAxle = new THREE.Mesh(axleGeo, axleMat);
    frontAxle.rotation.x = Math.PI / 2;
    frontAxle.position.set(0.45, -0.15, 0);
    modelGroup.add(frontAxle);

    const rearAxle = new THREE.Mesh(axleGeo, axleMat);
    rearAxle.rotation.x = Math.PI / 2;
    rearAxle.position.set(-0.45, -0.15, 0);
    modelGroup.add(rearAxle);

    // 4 Terracotta Discs (Wheels)
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.1, 24);
    const wheels: THREE.Mesh[] = [];

    const wheelPositions = [
      { x: 0.45, y: -0.15, z: 0.78 },
      { x: 0.45, y: -0.15, z: -0.78 },
      { x: -0.45, y: -0.15, z: 0.78 },
      { x: -0.45, y: -0.15, z: -0.78 }
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, darkTerracottaMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos.x, pos.y, pos.z);
      modelGroup.add(wheel);
      wheels.push(wheel);
    });

    // Pedestal Ground Disc
    const groundGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.1, 32);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xD7C4A5, roughness: 0.9 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(0, -0.58, 0);
    scene.add(groundMesh);

    // 4. Mouse / Touch / Pen Orbit Controls (pointer events cover all three)
    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevPointerX;
      const deltaY = e.clientY - prevPointerY;
      modelGroup.rotation.y += deltaX * 0.01;
      modelGroup.rotation.x = Math.max(-0.6, Math.min(0.6, modelGroup.rotation.x + deltaY * 0.01));
      wheels.forEach((w) => { w.rotation.y += deltaX * 0.02; });
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };

    const onPointerUp = () => { isDragging = false; };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Keep the renderer matched to its container when the window/modal resizes
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 5. Animation Loop (spin speed is per 60fps frame, scaled by elapsed time)
    let animId: number;
    let lastTime = performance.now();
    const animate = (now: number) => {
      const frames = Math.min(3, (now - lastTime) / (1000 / 60));
      lastTime = now;
      if (autoSpinRef.current && !isDragging) {
        modelGroup.rotation.y += 0.008 * frames;
        wheels.forEach((w) => { w.rotation.y += 0.016 * frames; });
      }
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      // Free GPU resources; otherwise every open of the viewer leaks buffers and a WebGL context
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      [terracottaMat, darkTerracottaMat, axleMat, groundMat].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleClaimShard = () => {
    claimKaalShard('lothal');
    setShardClaimed(true);
    sound.playCorrect();
    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    } catch {
      // ignore
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '95%', borderLeft: '8px solid var(--terracotta)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta)', textTransform: 'uppercase' }}>
              3D ARTIFACT &amp; PHYGITAL TOY INSPECTION
            </div>
            <h2 style={{ fontSize: '22px', color: 'var(--terracotta-dark)', marginTop: '2px' }}>
              {toy.name[language]}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {toy.craftOrigin} • {toy.approximateDate}
            </div>
          </div>
          <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* 3D Viewport & Story Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '16px', marginBottom: '18px' }}>
          {/* Left: Interactive 3D Canvas */}
          <div style={{ position: 'relative' }}>
            <div
              ref={mountRef}
              style={{
                width: '100%',
                height: '320px',
                borderRadius: '16px',
                border: '2px solid var(--earth-border)',
                cursor: 'grab',
                overflow: 'hidden',
                touchAction: 'none'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                display: 'flex',
                gap: '6px'
              }}
            >
              <button
                className="btn-secondary"
                style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.85)' }}
                onClick={() => setIsAutoSpinning(!isAutoSpinning)}
              >
                <RotateCw size={12} /> {isAutoSpinning ? 'Pause Spin' : 'Auto Spin'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
              Drag with mouse/touch to inspect axle holes and earthenware texture.
            </div>
          </div>

          {/* Right: History & Phygital Connection */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--terracotta-dark)', marginBottom: '4px' }}>
                📜 4,000-Year Ancient Context
              </h4>
              <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', marginBottom: '14px' }}>
                {toy.historicalContext[language]}
              </p>

              <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--indigo)', marginBottom: '4px' }}>
                🪵 Living GI-Craft Phygital Jump
              </h4>
              <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', marginBottom: '14px' }}>
                {toy.phygitalConnection[language]}
              </p>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', borderColor: 'var(--indigo)' }}
                onClick={() => {
                  onClose();
                  onOpenDiyPrint();
                }}
              >
                <Printer size={16} color="var(--indigo)" />
                <span>Open Printable DIY Craft Blueprint (Channapatna Top)</span>
              </button>

              {all3Passed && !shardClaimed && (
                <button
                  className="btn-primary"
                  onClick={handleClaimShard}
                  style={{
                    background: 'linear-gradient(90deg, #E65100, #C85A32)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    boxShadow: '0 4px 14px rgba(200, 90, 50, 0.4)'
                  }}
                >
                  <Sparkles size={16} />
                  <span>CLAIM LOTHAL KAAL SHARD (+100 GYAAN)!</span>
                </button>
              )}

              {shardClaimed && (
                <div
                  style={{
                    background: '#E8F5E9',
                    border: '1px solid #4CAF50',
                    color: '#2E7D32',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Lothal Kaal Shard Restored to Spinning Top!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
