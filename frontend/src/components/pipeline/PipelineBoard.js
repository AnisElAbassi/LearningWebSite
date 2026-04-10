import React from 'react';
import PipelineCard from './PipelineCard';

export default function PipelineBoard({ pipeline, loading }) {
  if (loading) {
    return (
      <div className="w-full overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="inline-flex gap-4 min-w-max">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-56 flex-none">
              <div className="h-8 bg-pg-card rounded mb-3 animate-pulse" />
              <div className="space-y-2">
                <div className="h-24 bg-pg-card rounded-lg animate-pulse" />
                <div className="h-24 bg-pg-card rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-4 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="inline-flex gap-3 min-w-max">
        {pipeline.map(stage => (
          <div key={stage.stage} className="w-56 flex-none">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
              <h3 className="font-inter font-bold text-sm text-white">{stage.label}</h3>
              <span className="text-xs text-gray-500 bg-pg-dark2 px-1.5 py-0.5 rounded-full">{stage.count}</span>
            </div>

            {/* Cards */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {stage.events.map((event, i) => (
                <PipelineCard key={event.id} event={event} color={stage.color} index={i} />
              ))}
              {stage.events.length === 0 && (
                <div className="p-4 border border-dashed border-pg-border rounded-lg text-center">
                  <p className="text-[10px] text-gray-600">No events</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
