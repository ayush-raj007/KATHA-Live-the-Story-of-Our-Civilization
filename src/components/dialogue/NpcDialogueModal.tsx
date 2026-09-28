import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import npcsData from '../../content/npcs.json';
import questionsData from '../../content/questions.json';
import foodsData from '../../content/foods.json';
import { sound } from '../../utils/audio';
import { X, Trophy, Ship } from 'lucide-react';
import { usePauseWhile } from '../../hooks/usePauseWhile';

interface NpcDialogueModalProps {
  npcId: string;
  onClose: () => void;
  onStartMiniGame: (gameId: string) => void;
  onOpenCargoDecision?: () => void;
}

export const NpcDialogueModal: React.FC<NpcDialogueModalProps> = ({
  npcId,
  onClose,
  onStartMiniGame,
  onOpenCargoDecision
}) => {
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const inventory = useGameStore((state) => state.inventory);
  const executeBarter = useGameStore((state) => state.executeBarter);
  const answerCheckpointQuestion = useGameStore((state) => state.answerCheckpointQuestion);
  const answeredQuestions = useGameStore((state) => state.answeredQuestions);
  const talkToNpc = useGameStore((state) => state.talkToNpc);

  usePauseWhile(true);
  useEffect(() => {
    talkToNpc(npcId);
  }, [npcId, talkToNpc]);

  const npc = npcsData.find((n) => n.id === npcId);
  const question = questionsData.find((q) => q.id === npc?.checkpointQuestionId);

  const [activeTab, setActiveTab] = useState<'dialogue' | 'barter' | 'checkpoint'>('dialogue');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [questionFeedback, setQuestionFeedback] = useState<{ isCorrect: boolean; message: string; explanation: string } | null>(null);
  const [barterFeedback, setBarterFeedback] = useState<string | null>(null);

  if (!npc) return null;

  const isQuestionAnswered = question && answeredQuestions[question.id]?.answeredCorrectly;

  const handleSelectOption = (idx: number) => {
    if (!question || questionFeedback?.isCorrect) return;
    setSelectedOptionIndex(idx);

    const result = answerCheckpointQuestion(question.id, idx, question.correctIndex);
    if (result.isCorrect) {
      if (soundEnabled) sound.playCorrect();
      setQuestionFeedback({
        isCorrect: true,
        message: result.message,
        explanation: question.explanation[language]
      });
    } else {
      if (soundEnabled) sound.playWrong();
      setQuestionFeedback({
        isCorrect: false,
        message: result.message,
        explanation: question.explanation[language]
      });
    }
  };

  const handleBarterTrade = (giveId: string, giveAmt: number, recvId: string, recvAmt: number) => {
    const success = executeBarter(giveId, giveAmt, recvId, recvAmt);
    if (success) {
      if (soundEnabled) sound.playEat();
      const foodItem = foodsData.find((f) => f.id === recvId);
      setBarterFeedback(`Exchanged ${giveAmt} Beads for ${recvAmt} ${foodItem?.name[language] || 'Food'}!`);
    } else {
      if (soundEnabled) sound.playWrong();
      setBarterFeedback(`You need at least ${giveAmt} beads in your bag to trade.`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px', borderLeft: '8px solid var(--terracotta)' }}
      >
        {/* Header with Avatar and Role */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #F4A261, #C85A32)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                border: '2px solid #FFF',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {npc.avatar}
            </div>
            <div>
              <h2 style={{ color: 'var(--terracotta-dark)', fontSize: '20px' }}>
                {npc.name[language]}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {npc.role[language]}
              </div>
            </div>
          </div>
          <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--earth-border)', paddingBottom: '10px', marginBottom: '16px' }}>
          <button 
            className={`btn-secondary ${activeTab === 'dialogue' ? 'btn-primary' : ''}`}
            style={{ fontSize: '13px', padding: '6px 14px' }}
            onClick={() => setActiveTab('dialogue')}
          >
            💬 {language === 'en' ? 'Conversation' : 'संवाद'}
          </button>

          {npc.barterTrades && npc.barterTrades.length > 0 && (
            <button 
              className={`btn-secondary ${activeTab === 'barter' ? 'btn-primary' : ''}`}
              style={{ fontSize: '13px', padding: '6px 14px' }}
              onClick={() => setActiveTab('barter')}
            >
              ⚖️ {language === 'en' ? 'Barter Rations' : 'वस्तु विनिमय'}
            </button>
          )}

          {question && (
            <button 
              className={`btn-secondary ${activeTab === 'checkpoint' ? 'btn-primary' : ''}`}
              style={{ fontSize: '13px', padding: '6px 14px' }}
              onClick={() => setActiveTab('checkpoint')}
            >
              📜 {language === 'en' ? 'Knowledge Check' : 'ज्ञान परीक्षा'} {isQuestionAnswered && '✓'}
            </button>
          )}
        </div>

        {/* TAB 1: CONVERSATION */}
        {activeTab === 'dialogue' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {npc.introDialogue[language].map((line, idx) => (
                <p 
                  key={idx} 
                  style={{
                    background: '#FFF',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--earth-border)',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)'
                  }}
                >
                  "{line}"
                </p>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              {npc.miniGameId && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    onStartMiniGame(npc.miniGameId!);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--turmeric-dark)', borderColor: '#B8860B' }}
                >
                  <Trophy size={16} />
                  <span>Challenge Champion ({npc.miniGameId === 'bead_driller' ? 'Bead Driller' : npc.miniGameId === 'tide_dock' ? 'Tide Dock' : 'Seal Match'})</span>
                </button>
              )}

              {npc.id === 'npc_dock_master' && onOpenCargoDecision && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    onOpenCargoDecision();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--indigo)', borderColor: '#1A2340' }}
                >
                  <Ship size={16} />
                  <span>🚢 {language === 'en' ? 'Sagar Doot Cargo Consignment' : 'सागर दूत माल निर्णय'}</span>
                </button>
              )}

              {question && !isQuestionAnswered && (
                <button 
                  className="btn-secondary"
                  onClick={() => setActiveTab('checkpoint')}
                  style={{ fontSize: '13px' }}
                >
                  Answer {npc.name[language]}'s Question &rarr;
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BARTER RATIONS (AAJ KA BHOJAN) */}
        {activeTab === 'barter' && (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {language === 'en'
                ? 'Lothal did not use coined money. Commerce relied on trading precious carnelian beads for coastal sustenance!'
                : 'लोथल में सिक्के नहीं थे। अकीक के बहुमूल्य मनकों के बदले अन्न और भोजन प्राप्त होता था!'}
            </p>

            {barterFeedback && (
              <div 
                style={{
                  background: '#E8F5E9',
                  border: '1px solid #4CAF50',
                  color: '#2E7D32',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '12px'
                }}
              >
                {barterFeedback}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {npc.barterTrades?.map((trade, idx) => {
                const foodItem = foodsData.find((f) => f.id === trade.receiveItemId);
                const playerBeads = inventory['carnelian_beads']?.count || 0;
                const canAfford = playerBeads >= trade.giveAmount;

                return (
                  <div 
                    key={idx}
                    style={{
                      background: '#FFF',
                      border: '1.5px solid var(--earth-border)',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '28px' }}>{foodItem?.emoji || '🍱'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>
                          {foodItem?.name[language]}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Cost: <strong>{trade.giveAmount} Carnelian Beads</strong> (You have: {playerBeads})
                        </div>
                      </div>
                    </div>

                    <button 
                      className="btn-primary"
                      disabled={!canAfford}
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        opacity: canAfford ? 1 : 0.5,
                        cursor: canAfford ? 'pointer' : 'not-allowed'
                      }}
                      onClick={() => handleBarterTrade(trade.giveItemId, trade.giveAmount, trade.receiveItemId, trade.receiveAmount)}
                    >
                      Trade &amp; Acquire
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: EDUCATIONAL CHECKPOINT (CURATED JSON KNOWLEDGE BASE) */}
        {activeTab === 'checkpoint' && question && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--terracotta)', textTransform: 'uppercase' }}>
                TOPIC: {question.topic}
              </span>
              <span 
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: question.status === 'VERIFIED' ? '#2E7D32' : '#E65100',
                  background: '#FFF',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--earth-border)'
                }}
              >
                {question.status === 'VERIFIED' ? '✓ Verified Fact' : 'Historians think...'}
              </span>
            </div>

            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '14px', lineHeight: '1.4' }}>
              {question.question[language]}
            </h3>

            {/* 3 Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {question.options[language].map((optText, optIdx) => {
                const isSelected = selectedOptionIndex === optIdx;
                const isCorrect = optIdx === question.correctIndex;
                let borderColor = 'var(--earth-border)';
                let bg = '#FFF';

                if (questionFeedback) {
                  if (isCorrect) {
                    borderColor = '#4CAF50';
                    bg = '#E8F5E9';
                  } else if (isSelected) {
                    borderColor = 'var(--lac-red)';
                    bg = '#FFEBEE';
                  }
                }

                return (
                  <button 
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: `2px solid ${borderColor}`,
                      background: bg,
                      textAlign: 'left',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      cursor: questionFeedback?.isCorrect ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span 
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: '1.5px solid var(--earth-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span style={{ flex: 1 }}>{optText}</span>
                  </button>
                );
              })}
            </div>

            {/* Gentle Correction / Explanation */}
            {questionFeedback && (
              <div 
                style={{
                  background: questionFeedback.isCorrect ? '#E8F5E9' : '#FFF3E0',
                  border: `1.5px solid ${questionFeedback.isCorrect ? '#4CAF50' : '#FF9800'}`,
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                  marginBottom: '10px'
                }}
              >
                <div style={{ fontWeight: 800, color: questionFeedback.isCorrect ? '#2E7D32' : '#E65100', marginBottom: '4px' }}>
                  {questionFeedback.isCorrect 
                    ? `✓ ${language === 'en' ? 'Correct! +5 Urja & +15 Gyaan awarded.' : 'सही उत्तर! +५ ऊर्जा और +१५ ज्ञान।'}`
                    : `⚠️ ${language === 'en' ? 'Gentle Correction: Urja dropped.' : 'संशोधन: ऊर्जा घटी।'}`}
                </div>
                <p>{questionFeedback.explanation}</p>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                  <strong>Source:</strong> {question.source}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
