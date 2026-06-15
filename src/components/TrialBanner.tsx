import React from 'react';
import { Link } from 'react-router-dom';

interface TrialBannerProps {
  subscriptionPlan: string | undefined;
  daysRemaining: number;
  trialExpired: boolean;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  subscriptionPlan,
  daysRemaining,
  trialExpired,
}) => {
  if (subscriptionPlan === 'pro') {
    return null; // Pro users don't see any trial banner
  }

  if (trialExpired) {
    return (
      <div className="bg-red-950/90 border border-red-800 text-red-300 text-xs p-3 rounded-lg mx-2.5 mb-3">
        <p className="font-semibold mb-1.5">⏱ Trial expired. Upgrade to continue.</p>
        <Link
          to="/settings?tab=subscription"
          className="block text-center w-full text-white font-bold py-1 px-2 rounded transition-colors text-xs cursor-pointer"
          style={{ backgroundColor: '#b91c1c' }}
        >
          Upgrade Now
        </Link>
      </div>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <div className="bg-amber-950/90 border border-amber-800 text-amber-300 text-xs p-3 rounded-lg mx-2.5 mb-3">
        <p className="mb-1.5">⏱ <strong>{daysRemaining} days left</strong> in trial</p>
        <Link
          to="/settings?tab=subscription"
          className="underline text-amber-200 hover:text-amber-100 font-medium"
        >
          Upgrade Now →
        </Link>
      </div>
    );
  }

  return null;
};
