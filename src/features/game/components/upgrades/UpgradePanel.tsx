import { motion } from 'framer-motion';
import { UpgradeCard } from './UpgradeCard';
import { UPGRADE_DEFINITIONS } from '../../../../domain/constants';

export function UpgradePanel() {
  return (
    <motion.div
      className="upgrade-panel"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100 }}
    >
      <h3>UPGRADES</h3>
      <div className="upgrade-grid">
        {UPGRADE_DEFINITIONS.map((u) => (
          <UpgradeCard key={u.id} upgradeId={u.id} />
        ))}
      </div>
    </motion.div>
  );
}
