import React, { useEffect, useState, useMemo } from 'react';
import { CakeIcon, XIcon, HeartIcon } from './icons';
import { getLunarBirthdayThisYear, MY_BIRTHDAY, HER_BIRTHDAY } from '../src/utils/lunar';

interface BirthdaySurpriseProps {
  isOpen: boolean;
  onClose: () => void;
  name?: string;
}

const BirthdaySurprise: React.FC<BirthdaySurpriseProps> = ({ isOpen, onClose }) => {
  const [showContent, setShowContent] = useState(false);

  const birthdayInfo = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    const mySolar = getLunarBirthdayThisYear(MY_BIRTHDAY);
    const herSolar = getLunarBirthdayThisYear(HER_BIRTHDAY);

    const myStr = `${mySolar.getFullYear()}-${mySolar.getMonth() + 1}-${mySolar.getDate()}`;
    const herStr = `${herSolar.getFullYear()}-${herSolar.getMonth() + 1}-${herSolar.getDate()}`;

    const isMy = todayStr === myStr;
    const isHer = todayStr === herStr;

    return {
      isToday: isMy || isHer,
      isMy,
      isHer,
      mySolar,
      herSolar,
      name: isMy ? '你' : '她',
    };
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => setShowContent(true), 100);
    else setShowContent(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] bg-black/90 flex flex-col items-center justify-center overflow-hidden" onClick={onClose}>

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="absolute rounded-full animate-floatUp"
            style={{
              left: `${Math.random() * 100}%`, bottom: '-20px',
              width: `${Math.random() * 10 + 5}px`, height: `${Math.random() * 10 + 5}px`,
              backgroundColor: ['var(--seal-500)', '#fbbf24', '#34d399', '#60a5fa'][Math.floor(Math.random() * 4)],
              animationDuration: `${Math.random() * 3 + 2}s`, animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      <div className={`relative z-10 flex flex-col items-center text-center transition-all duration-1000 transform ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-yellow-400 blur-[60px] opacity-20 rounded-full animate-pulse" />
          <div className="bg-gradient-to-b from-seal-50 to-seal-100 p-8 rounded-full shadow-[0_0_50px_rgba(244,63,94,0.5)] border-4 border-white animate-bounce-slow">
            <CakeIcon className="w-32 h-32 text-seal-500" />
          </div>
        </div>

        {birthdayInfo.isToday ? (
          <>
            <h1 className="text-5xl md:text-7xl font-title text-white font-bold mb-4 drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-ink-300 via-yellow-200 to-gold-300 animate-shimmer">
              {birthdayInfo.name} 生日快乐！
            </h1>
            <p className="text-white/80 text-lg mb-4">
              🎂 农历 {birthdayInfo.isMy ? '九月十八' : '正月初五'}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl md:text-5xl font-title text-white font-bold mb-4">
              生日查询
            </h1>
            <div className="bg-paper-surface/10 backdrop-blur rounded-2xl p-6 mb-6 space-y-3 text-white text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-seal-400 rounded-full flex items-center justify-center text-sm font-bold">你</div>
                <div>
                  <p className="font-bold">农历 九月十八</p>
                  <p className="text-xs text-white/60">今年公历：{birthdayInfo.mySolar.getMonth() + 1}月{birthdayInfo.mySolar.getDate()}日</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-seal-400 rounded-full flex items-center justify-center text-sm font-bold">她</div>
                <div>
                  <p className="font-bold">农历 正月初五</p>
                  <p className="text-xs text-white/60">今年公历：{birthdayInfo.herSolar.getMonth() + 1}月{birthdayInfo.herSolar.getDate()}日</p>
                </div>
              </div>
            </div>
          </>
        )}

        <p className="text-white/80 max-w-md text-lg leading-relaxed mb-12 font-serif italic px-4">
          "愿你的生活每天都像今天一样精彩，<br/>愿我们的故事永远未完待续。"
        </p>

        <button onClick={onClose} className="px-10 py-4 bg-paper-surface text-seal-600 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-all flex items-center gap-2">
          <HeartIcon className="w-6 h-6" />
          <span>{birthdayInfo.isToday ? '接收祝福' : '关闭'}</span>
        </button>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-shimmer {
          background-size: 200% auto;
          background: linear-gradient(90deg, #fda4af, #fde68a, #fda4af);
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default BirthdaySurprise;
