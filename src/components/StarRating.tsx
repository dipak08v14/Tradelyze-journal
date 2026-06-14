import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange: (rating: number) => void;
  id?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, id }) => {
  const handleClick = (starNum: number) => {
    if (rating === starNum) {
      onChange(0); // Clicking current rating clears it
    } else {
      onChange(starNum);
    }
  };

  return (
    <div id={id} className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">
        Trade Rating
      </label>
      
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((starNum) => {
          const isFilled = rating >= starNum;
          return (
            <button
               key={starNum}
               type="button"
               onClick={() => handleClick(starNum)}
               className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-zinc-600 hover:text-amber-300'
                }`}
              />
            </button>
          );
        })}
      </div>
      
      <div className="text-xs text-zinc-400 font-medium">
        {rating > 0 ? `★ ${rating}/5` : 'Not rated'}
      </div>
    </div>
  );
};
