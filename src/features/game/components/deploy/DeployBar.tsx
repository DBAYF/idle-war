import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { UnitCard } from './UnitCard';
import { TargetSelector } from './TargetSelector';
import { useUIStore } from '../../../../store/uiStore';

export function DeployBar() {
  const lastDeployError = useUIStore((s) => s.lastDeployError);
  const lastDeploySuccess = useUIStore((s) => s.lastDeploySuccess);
  const setLastDeployError = useUIStore((s) => s.setLastDeployError);
  const setLastDeploySuccess = useUIStore((s) => s.setLastDeploySuccess);

  useEffect(() => {
    if (!lastDeployError) return;
    const id = setTimeout(() => setLastDeployError(null), 2000);
    return () => clearTimeout(id);
  }, [lastDeployError, setLastDeployError]);

  useEffect(() => {
    if (!lastDeploySuccess) return;
    const id = setTimeout(() => setLastDeploySuccess(null), 1500);
    return () => clearTimeout(id);
  }, [lastDeploySuccess, setLastDeploySuccess]);

  return (
    <motion.div
      className="deploy-bar"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 80 }}
      aria-label="Deploy units"
    >
      <span className="deploy-section-label">Deploy</span>
      {lastDeployError && (
        <div className="deploy-error-toast" role="alert">
          {lastDeployError}
        </div>
      )}
      {lastDeploySuccess && (
        <div className="deploy-success-toast" role="status">
          {lastDeploySuccess}
        </div>
      )}
      <TargetSelector />
      <div className="unit-cards">
        <UnitCard type="runner" />
        <UnitCard type="bruiser" />
        <UnitCard type="saboteur" />
        <UnitCard type="defender" />
      </div>
    </motion.div>
  );
}
