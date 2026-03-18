import { motion } from 'framer-motion';
import { UnitCard } from './UnitCard';
import { TargetSelector } from './TargetSelector';

export function DeployBar() {
  return (
    <motion.div
      className="deploy-bar"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 80 }}
    >
      <TargetSelector />
      <div className="unit-cards">
        <UnitCard type="runner" />
        <UnitCard type="bruiser" />
        <UnitCard type="saboteur" />
      </div>
    </motion.div>
  );
}
