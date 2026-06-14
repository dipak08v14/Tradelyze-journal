import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-[#1A1D27] rounded-xl h-64 w-full animate-pulse border border-[#2A2D3A] p-5 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-[#0F1117] h-6 w-12 rounded border border-[#2A2D3A]" />
            <div className="bg-gray-700 h-6 w-32 rounded" />
          </div>
          <div className="bg-gray-700 h-6 w-20 rounded-full" />
        </div>
        <div className="bg-gray-700 h-4 w-24 rounded-full mt-2" />
        
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800 h-12 rounded p-2 flex flex-col justify-between">
              <div className="bg-gray-700 h-4 w-3/4 rounded" />
              <div className="bg-gray-700 h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-[#2A2D3A] pt-3 flex justify-between items-center mt-4">
        <div className="bg-gray-700 h-4 w-28 rounded" />
        <div className="bg-gray-700 h-4 w-20 rounded" />
      </div>
    </div>
  );
};
