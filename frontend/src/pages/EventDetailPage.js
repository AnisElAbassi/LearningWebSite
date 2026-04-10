import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineChevronRight, HiOutlineX } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import StatusBadge from '../components/layout/StatusBadge';
import WorkflowStepper, { STAGE_COLORS } from '../components/workflow/WorkflowStepper';
import QuoteStep from '../components/workflow/steps/QuoteStep';
import ConfirmedStep from '../components/workflow/steps/ConfirmedStep';
import PlanningStep from '../components/workflow/steps/PlanningStep';
import PrepStep from '../components/workflow/steps/PrepStep';
import ActiveStep from '../components/workflow/steps/ActiveStep';
import ReviewStep from '../components/workflow/steps/ReviewStep';
import ClosedStep from '../components/workflow/steps/ClosedStep';

const STAGES_ORDER = ['quote', 'confirmed', 'planning', 'prep', 'active', 'review', 'closed'];

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [viewStage, setViewStage] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [missingItems, setMissingItems] = useState([]);

  const fetchEvent = () => {
    api.get(`/events/${id}`).then(r => {
      setEvent(r.data);
      setViewStage(null);
    }).catch(() => toast.error('Failed to load event'));
  };

  useEffect(() => { fetchEvent(); }, [id]);

  if (!event) return <div className="animate-pulse space-y-4"><div className="h-8 bg-pg-card rounded w-48" /><div className="h-64 bg-pg-card rounded-xl" /></div>;

  const currentStage = event.status;
  const activeView = viewStage || currentStage;
  const currentIdx = STAGES_ORDER.indexOf(currentStage);
  const viewIdx = STAGES_ORDER.indexOf(activeView);
  const isViewingPast = viewIdx < currentIdx;
  const isViewingCurrent = viewIdx === currentIdx;
  const canAdvance = currentStage !== 'closed' && currentStage !== 'cancelled';

  const handleAdvance = async () => {
    setAdvancing(true);
    setMissingItems([]);
    try {
      const res = await api.put(`/events/${event.id}/advance`);
      if (res.data.canAdvance) {
        toast.success(`Advanced to ${res.data.event.status}`);
        fetchEvent();
      } else {
        setMissingItems(res.data.missing || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to advance');
    }
    setAdvancing(false);
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this event? This cannot be undone.')) return;
    try {
      await api.put(`/events/${event.id}/status`, { status: 'cancelled' });
      toast.success('Event cancelled');
      fetchEvent();
    } catch { toast.error('Failed'); }
  };

  const handleStageClick = (stage, idx) => {
    if (idx <= currentIdx) setViewStage(stage);
  };

  const renderStep = () => {
    const props = { event, onRefresh: fetchEvent };
    switch (activeView) {
      case 'quote': return <QuoteStep {...props} />;
      case 'confirmed': return <ConfirmedStep {...props} />;
      case 'planning': return <PlanningStep {...props} />;
      case 'prep': return <PrepStep {...props} />;
      case 'active': return <ActiveStep {...props} />;
      case 'review': return <ReviewStep {...props} />;
      case 'closed': return <ClosedStep {...props} />;
      default: return <p className="text-gray-500">Unknown stage</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 text-gray-400 hover:text-pg-purple"><HiOutlineArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-inter font-bold text-xl text-white truncate">Event #{event.id}</h1>
            <StatusBadge status={currentStage} color={STAGE_COLORS[currentStage]} />
          </div>
          <p className="text-sm text-gray-400 truncate">{event.client?.companyName} — {event.experience?.name}</p>
        </div>
        {canAdvance && (
          <button onClick={handleCancel} className="btn-pg-danger text-xs flex items-center gap-1">
            <HiOutlineX className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>

      {/* Stepper */}
      {currentStage !== 'cancelled' && (
        <WorkflowStepper currentStage={currentStage} onStageClick={handleStageClick} />
      )}

      {currentStage === 'cancelled' && (
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-neon-red font-bold text-lg">Event Cancelled</p>
        </div>
      )}

      {/* Viewing past stage banner */}
      {isViewingPast && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-pg-purple/5 border border-pg-purple/20 text-xs text-pg-purple">
          <span>Viewing completed step: <strong>{activeView}</strong></span>
          <button onClick={() => setViewStage(null)} className="ml-auto btn-pg-outline text-xs">Back to current</button>
        </div>
      )}

      {/* Step Content */}
      {currentStage !== 'cancelled' && renderStep()}

      {/* Missing items warning */}
      {missingItems.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-pg-yellow/30 bg-pg-yellow/5">
          <p className="font-bold text-sm text-pg-yellow mb-2">Complete these before advancing:</p>
          <ul className="space-y-1">
            {missingItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-pg-yellow flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advance Button */}
      {isViewingCurrent && canAdvance && (
        <div className="flex justify-end pt-4 border-t border-pg-border">
          <button onClick={handleAdvance} disabled={advancing} className="btn-pg-primary flex items-center gap-2 text-sm disabled:opacity-50">
            {advancing ? 'Advancing...' : `Move to ${STAGES_ORDER[currentIdx + 1]?.charAt(0).toUpperCase() + STAGES_ORDER[currentIdx + 1]?.slice(1)}`}
            <HiOutlineChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
