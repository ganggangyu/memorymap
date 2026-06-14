import React, { useState } from 'react';
import { XIcon } from './icons';

interface LoveDiceProps {
  isOpen: boolean;
  onClose: () => void;
}

const IDEAS = [
  // 美食
  { text: '一起去吃火锅 🌶️', category: '美食' },
  { text: '找一家没去过的日料店 🍣', category: '美食' },
  { text: '逛夜市吃到撑 🍢', category: '美食' },
  { text: '自己做一顿烛光晚餐 🕯️', category: '美食' },
  { text: '去甜品店各点一个互相分享 🍰', category: '美食' },
  { text: '试一家新开的烧烤店 🔥', category: '美食' },
  { text: '去茶楼喝早茶慢慢聊 ☕', category: '美食' },
  { text: '买食材回家一起做披萨 🍕', category: '美食' },
  // 出行
  { text: '骑双人自行车逛公园 🚲', category: '出行' },
  { text: '去海边等一次日落 🌅', category: '出行' },
  { text: '找一条没走过的街瞎逛 🚶', category: '出行' },
  { text: '去植物园看花拍照 🌸', category: '出行' },
  { text: '坐摩天轮到最高点许愿 🎡', category: '出行' },
  { text: '去动物园看最喜欢的小动物 🐧', category: '出行' },
  { text: '开车去周边小镇一日游 🚗', category: '出行' },
  // 宅家
  { text: '窝沙发看一部老电影 🎬', category: '宅家' },
  { text: '一起拼一个1000块的拼图 🧩', category: '宅家' },
  { text: '互相给对方按摩十分钟 💆', category: '宅家' },
  { text: '整理相册回忆过去的旅行 📸', category: '宅家' },
  { text: '一起学做一道新菜 👨‍🍳', category: '宅家' },
  { text: '打双人游戏到半夜 🎮', category: '宅家' },
  { text: '给彼此写一封信 ✉️', category: '宅家' },
  // 浪漫
  { text: '晚上去天台看星星 ✨', category: '浪漫' },
  { text: '给对方一个小小的惊喜礼物 🎁', category: '浪漫' },
  { text: '对着对方唱一首情歌 🎤', category: '浪漫' },
  { text: '发一条只有对方懂的暗号朋友圈 📱', category: '浪漫' },
  { text: '重温第一次约会的地方 💕', category: '浪漫' },
  { text: '录一段视频说在一起最开心的时刻 📹', category: '浪漫' },
];

const LoveDice: React.FC<LoveDiceProps> = ({ isOpen, onClose }) => {
  const [result, setResult] = useState<typeof IDEAS[0] | null>(null);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setResult(IDEAS[Math.floor(Math.random() * IDEAS.length)]);
      count++;
      if (count > 10) {
        clearInterval(interval);
        setRolling(false);
      }
    }, 80);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={onClose}>
      <div className="bg-paper-surface rounded-3xl max-w-sm w-full p-6 text-center shadow-glow animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-2 hover:bg-paper-dark rounded-full"><XIcon className="w-5 h-5 text-ink-400" /></button>
        </div>

        {/* 骰子 */}
        <div className="my-6">
          <div
            onClick={roll}
            className={`mx-auto w-28 h-28 rounded-3xl flex items-center justify-center shadow-glow cursor-pointer active:scale-95 transition-all ${rolling ? 'bg-seal-500 animate-pulse' : 'bg-gradient-to-br from-seal-500 to-seal-400 hover:shadow-xl'}`}
          >
            {result ? (
              <span className="text-4xl animate-scale-in">{result.text.match(/[\u{1F300}-\u{1FAFF}]/u)?.[0] || '🎲'}</span>
            ) : (
              <span className="text-4xl">🎲</span>
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold text-ink-800 mb-1">恋爱骰子</h3>
        <p className="text-xs text-ink-400 mb-4">摇一摇手机或点击骰子</p>

        {/* 结果 */}
        {result && !rolling && (
          <div className="bg-paper-cream rounded-2xl p-5 animate-fade-up">
            <p className="text-lg font-bold text-ink-800 mb-1">{result.text}</p>
            <span className="tag-pill text-[10px]">{result.category}</span>
          </div>
        )}

        {!result && (
          <div className="bg-paper-cream rounded-2xl p-5">
            <p className="text-sm text-ink-400">点击骰子，选一个</p>
            <p className="text-sm text-ink-400">今晚做什么吧 💕</p>
          </div>
        )}

        <button onClick={roll} disabled={rolling}
          className="mt-4 px-8 py-3 bg-seal-500 text-white rounded-full font-bold text-sm active:scale-95 transition-all shadow-glow">
          再摇一次
        </button>
      </div>
    </div>
  );
};

export default LoveDice;
