import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../hooks/useI18n';

export default function QuoteStep({ event }) {
  const { formatMoney } = useI18n();
  const deal = event.deal;

  return (
    <div className="space-y-4">
      <h3 className="font-inter font-bold text-lg">Deal / Quote</h3>
      {deal ? (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white">{deal.title}</p>
              <p className="text-sm text-gray-400">{event.client?.companyName}</p>
            </div>
            <Link to={`/deals/${deal.id}`} className="btn-pg-outline text-xs">View Deal</Link>
          </div>
          {deal.lineItems?.length > 0 && (
            <div className="border-t border-pg-border pt-3 space-y-1">
              {deal.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-300">{item.description}</span>
                  <span className="font-mono text-pg-purple">{item.quantity}× {formatMoney(item.unitPrice)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-pg-border">
            <span>Total</span>
            <span className="text-pg-purple font-mono">{formatMoney((deal.price || 0) - (deal.discount || 0))}</span>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-gray-400 mb-3">No deal linked to this event</p>
          <Link to="/deals" className="btn-pg-primary text-sm">Go to Deals</Link>
        </div>
      )}
    </div>
  );
}
