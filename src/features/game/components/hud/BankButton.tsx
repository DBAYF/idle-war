import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { audioService } from '../../../../shared/audio/audioService';

export function BankButton() {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);
  const bankCoins = useGameStore((s) => s.bankCoins);
  const [bankAnimating, setBankAnimating] = useState(false);
  const [lastBanked, setLastBanked] = useState(0);

  const player = players.find((p) => p.id === localPlayerId);
  if (!player) return null;

  const canBank = player.economy.looseCoins > 0;
  const amount = Math.floor(player.economy.looseCoins);

  const handleBank = () => {
    if (!canBank) return;
    setLastBanked(amount);
    setBankAnimating(true);
    bankCoins(localPlayerId, amount);
    audioService.playBank();
    setTimeout(() => setBankAnimating(false), 600);
  };

  return (
    <div className="bank-button-wrap">
      <AnimatePresence>
        {bankAnimating && (
          <motion.div
            key="bank-transfer"
            className="bank-transfer-fx"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.2, y: -20 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            +{lastBanked} → secured
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        className="bank-button"
        onClick={handleBank}
        disabled={!canBank}
        whileHover={canBank ? { scale: 1.05 } : {}}
        whileTap={canBank ? { scale: 0.98 } : {}}
      >
        <span className="bank-label">BANK</span>
        <span className="bank-amount">{amount}</span>
      </motion.button>
    </div>
  );
}
