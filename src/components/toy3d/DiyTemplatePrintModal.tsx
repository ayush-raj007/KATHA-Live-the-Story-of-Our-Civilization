import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import toysData from '../../content/toys.json';
import { Printer, X } from 'lucide-react';

interface DiyTemplatePrintModalProps {
  toyId: string;
  onClose: () => void;
}

export const DiyTemplatePrintModal: React.FC<DiyTemplatePrintModalProps> = ({ toyId, onClose }) => {
  const language = useGameStore((state) => state.language);
  const toy = toysData.find((t) => t.id === toyId) || toysData[0];
  const { diyTemplate } = toy;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', width: '95%', borderLeft: '8px solid var(--turmeric)' }}
      >
        {/* Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta)', textTransform: 'uppercase' }}>
              PHYGITAL LIVING CRAFT BLUEPRINT (GI-TAGGED)
            </span>
            <h2 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>
              {diyTemplate.title[language]}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handlePrint}>
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
            <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Blueprint Canvas Layout */}
        <div 
          id="printable-craft-area"
          style={{
            background: '#FFF',
            border: '2px dashed var(--earth-border)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #2C1810', paddingBottom: '8px', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: '#2C1810' }}>KATHA: KAAL YATRI • DIY CRAFT BLUEPRINT</h3>
              <div style={{ fontSize: '11px', color: '#666' }}>
                Activity: Channapatna Lacquered Wooden Top &amp; Harappan Rolling Bull
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#888' }}>
              Scale: 1:1 Actual Size<br />Age 10–16 Hands-on Craft
            </div>
          </div>

          {/* SVG Printable Cutout Diagrams */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
            <svg viewBox="0 0 540 220" style={{ width: '100%', height: 'auto', background: '#FFFDF9', border: '1px solid #DDD', borderRadius: '8px' }}>
              {/* Outer Cutout Circle 1 (Large Top Disc) */}
              <circle cx="100" cy="110" r="70" fill="none" stroke="#C85A32" strokeWidth="2.5" strokeDasharray="5,3" />
              <circle cx="100" cy="110" r="45" fill="none" stroke="#E9B44C" strokeWidth="2" />
              <circle cx="100" cy="110" r="20" fill="none" stroke="#B22222" strokeWidth="2" />
              <circle cx="100" cy="110" r="4" fill="#2C1810" />
              <text x="100" y="195" textAnchor="middle" fontSize="10" fill="#666">Channapatna Top Disc (Cut along dash)</text>

              {/* Terracotta Bull Wheels (Cutout 2 & 3) */}
              <circle cx="260" cy="70" r="42" fill="none" stroke="#8D3B1B" strokeWidth="2" strokeDasharray="5,3" />
              <circle cx="260" cy="70" r="6" fill="#2C1810" />
              <text x="260" y="125" textAnchor="middle" fontSize="10" fill="#666">Bull Wheel A (Axle hole center)</text>

              <circle cx="260" cy="165" r="42" fill="none" stroke="#8D3B1B" strokeWidth="2" strokeDasharray="5,3" />
              <circle cx="260" cy="165" r="6" fill="#2C1810" />
              <text x="260" y="195" textAnchor="middle" fontSize="10" fill="#666">Bull Wheel B</text>

              {/* Bull Torso Profile Silhouette for Folding */}
              <path
                d="M 370,160 C 370,110 390,90 420,90 C 440,90 450,110 470,100 C 480,95 490,110 500,120 C 485,130 480,160 480,160 Z"
                fill="none"
                stroke="#C85A32"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
              <circle cx="400" cy="155" r="5" fill="#2C1810" />
              <circle cx="460" cy="155" r="5" fill="#2C1810" />
              <text x="440" y="195" textAnchor="middle" fontSize="10" fill="#666">Terracotta Bull Clay/Card Form</text>
            </svg>
          </div>

          {/* Materials & Step-by-Step Instructions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
            <div style={{ background: '#F8F5EE', padding: '10px 12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#8D3B1B', marginBottom: '4px' }}>
                ✂️ Materials Needed:
              </div>
              <ul style={{ fontSize: '11.5px', color: '#444', paddingLeft: '16px', lineHeight: '1.4' }}>
                {diyTemplate.materials.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: '#F8F5EE', padding: '10px 12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#2B3A67', marginBottom: '4px' }}>
                📋 Build Instructions:
              </div>
              <ol style={{ fontSize: '11px', color: '#444', paddingLeft: '14px', lineHeight: '1.4' }}>
                {diyTemplate.instructions.map((inst, idx) => (
                  <li key={idx}>{inst}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Students can color with natural dyes (turmeric &amp; beetroot juice) just as ancient Harappans and Channapatna artisans did!
          </div>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
