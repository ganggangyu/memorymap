
import React, { useState } from 'react';
import { SparklesIcon } from './icons';

interface PuzzleImageProps {
  src: string;
}

const PuzzleImage: React.FC<PuzzleImageProps> = ({ src }) => {
  const [revealed, setRevealed] = useState<boolean[]>(new Array(9).fill(false));
  const [isComplete, setIsComplete] = useState(false);

  const handlePieceClick = (index: number) => {
    if (revealed[index]) return;
    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);
    
    if (newRevealed.every(Boolean)) {
        setTimeout(() => setIsComplete(true), 500);
    }
  };

  const handleRevealAll = () => {
      setRevealed(new Array(9).fill(true));
      setIsComplete(true);
  };

  return (
    <div className="relative aspect-[4/3] w-full max-w-lg mx-auto bg-paper-dark rounded-lg overflow-hidden shadow-lg border-4 border-white">
        
        {/* Full Image (Revealed State) */}
        <img 
            src={src} 
            alt="Memory" 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isComplete ? 'opacity-100' : 'opacity-20 blur-sm'}`} 
        />

        {/* Puzzle Grid */}
        {!isComplete && (
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5">
                {revealed.map((isRev, i) => (
                    <button
                        key={i}
                        onClick={() => handlePieceClick(i)}
                        className={`
                            relative overflow-hidden transition-all duration-700 border border-white/20
                            ${isRev ? 'opacity-0 pointer-events-none' : 'bg-seal-100 cursor-pointer hover:bg-seal-100'}
                        `}
                    >
                        {!isRev && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                <span className="font-bold text-ink-300 text-2xl">?</span>
                            </div>
                        )}
                        {/* Slice of the actual image revealed on click? No, we just fade the cover. 
                            Actually, simpler: Grid covers the image. Clicking removes a cell.
                        */}
                    </button>
                ))}
            </div>
        )}

        {/* Completion Celebration */}
        {isComplete && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-seal-400 opacity-20"></div>
                <div className="bg-paper-surface/80 backdrop-blur-md px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-fadeIn">
                    <SparklesIcon className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold text-seal-600">Memory Unlocked!</span>
                </div>
            </div>
        )}
        
        {!isComplete && (
            <div className="absolute bottom-4 right-4 z-10">
                <button onClick={handleRevealAll} className="text-xs bg-paper-surface/50 hover:bg-paper-surface text-gray-600 px-2 py-1 rounded backdrop-blur-sm">
                    Skip
                </button>
            </div>
        )}
    </div>
  );
};

export default PuzzleImage;
