import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div 
      style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', borderRadius: '12px' }} 
      className="h-64 w-full p-5 flex flex-col justify-between relative overflow-hidden"
    >
      <div>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="skeleton h-6 w-12" style={{ borderRadius: '4px' }} />
            <div className="skeleton h-6 w-32" style={{ borderRadius: '4px' }} />
          </div>
          <div className="skeleton h-6 w-20" style={{ borderRadius: '12px' }} />
        </div>
        <div className="skeleton h-4 w-24 mt-2" style={{ borderRadius: '4px' }} />
        
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', borderRadius: '8px' }} 
              className="h-12 p-2 flex flex-col justify-between"
            >
              <div className="skeleton h-4 w-3/4" style={{ borderRadius: '4px' }} />
              <div className="skeleton h-3 w-1/2" style={{ borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderColor: 'var(--border)' }} className="border-t pt-3 flex justify-between items-center mt-4">
        <div className="skeleton h-4 w-28" style={{ borderRadius: '4px' }} />
        <div className="skeleton h-4 w-20" style={{ borderRadius: '4px' }} />
      </div>
    </div>
  );
};
