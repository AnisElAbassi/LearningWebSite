import React from 'react';
import { motion } from 'framer-motion';
import { HiCheck } from 'react-icons/hi';

const STAGES = [
  { key: 'quote', label: 'Quote' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'planning', label: 'Planning' },
  { key: 'prep', label: 'Prep' },
  { key: 'active', label: 'Active' },
  { key: 'review', label: 'Review' },
  { key: 'closed', label: 'Closed' },
];

const STAGE_COLORS = {
  quote: '#6b7280', confirmed: '#3b82f6', planning: '#a855f7',
  prep: '#f59e0b', active: '#fbbf24', review: '#f97316', closed: '#10b981',
};

export default function WorkflowStepper({ currentStage, onStageClick }) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1">
      {STAGES.map((stage, i) => {
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isFuture = i > currentIdx;

        return (
          <React.Fragment key={stage.key}>
            {i > 0 && (
              <div className={`flex-shrink-0 w-6 h-[2px] ${isCompleted ? 'bg-neon-green' : 'bg-pg-border'}`} />
            )}
            <button
              onClick={() => onStageClick && onStageClick(stage.key, i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                isCurrent
                  ? 'text-white ring-2 ring-offset-2 ring-offset-pg-black'
                  : isCompleted
                    ? 'bg-neon-green/10 text-neon-green hover:bg-neon-green/20'
                    : 'bg-pg-dark2 text-gray-500'
              }`}
              style={isCurrent ? { backgroundColor: STAGE_COLORS[stage.key], ringColor: STAGE_COLORS[stage.key] } : {}}
            >
              {isCompleted ? (
                <HiCheck className="w-3 h-3" />
              ) : isCurrent ? (
                <motion.div
                  className="w-2 h-2 rounded-full bg-white"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              ) : (
                <div className="w-2 h-2 rounded-full bg-gray-600" />
              )}
              <span className="hidden sm:inline">{stage.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export { STAGES, STAGE_COLORS };
