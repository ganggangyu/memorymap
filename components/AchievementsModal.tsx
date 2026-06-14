
import React, { useState, useMemo } from 'react';
import { Achievement, AchievementId, AchievementStatus } from '../types';
import { 
    PlusIcon, BookOpenIcon, CameraIcon, MusicIcon, SparklesIcon, HeartIcon, PlaneIcon,
    PaletteIcon, EditIcon, TrashIcon, XIcon, StarIcon, TrophyIcon,
    TicketIcon, SaveIcon 
} from './icons';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievementStatuses: Record<AchievementId, AchievementStatus>;
  achievements: Achievement[];
  onAdd: (ach: Achievement) => void;
  onEdit: (ach: Achievement) => void;
  onDelete: (id: string) => void;
  onToggleManual: (id: string, isCompleted: boolean) => void;
}

const ICON_MAP: Record<string, any> = {
    'PlusIcon': PlusIcon,
    'BookOpenIcon': BookOpenIcon,
    'CameraIcon': CameraIcon,
    'MusicIcon': MusicIcon,
    'SparklesIcon': SparklesIcon,
    'HeartIcon': HeartIcon,
    'PlaneIcon': PlaneIcon,
    'PaletteIcon': PaletteIcon,
    'StarIcon': StarIcon,
    'TrophyIcon': TrophyIcon,
    'TicketIcon': TicketIcon
};

// Poetic names for the icons to give them meaning
const ICON_LABELS: Record<string, string> = {
    'PlusIcon': '初心的起点',
    'BookOpenIcon': '我们的故事',
    'CameraIcon': '定格瞬间',
    'MusicIcon': '爱的乐章',
    'SparklesIcon': '闪耀奇迹',
    'HeartIcon': '怦然心动',
    'PlaneIcon': '携手天涯',
    'PaletteIcon': '缤纷世界',
    'StarIcon': '星语心愿',
    'TrophyIcon': '荣耀时刻',
    'TicketIcon': '通往幸福'
};

const AchievementsModal: React.FC<AchievementsModalProps> = ({ 
    isOpen, onClose, achievementStatuses, achievements, onAdd, onEdit, onDelete, onToggleManual 
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isEditing, setIsEditing] = useState<Achievement | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Achievement>>({
      title: '', description: '', iconName: 'StarIcon', goal: 1, isManual: true
  });

  const filteredAchievements = useMemo(() => {
    return achievements.filter(ach => {
        // Explicitly cast status to avoid 'unknown' property access error
        const status = achievementStatuses[ach.id] as AchievementStatus | undefined;
        const isUnlocked = status?.isUnlocked;
        
        if (filter === 'unlocked') return !!isUnlocked;
        if (filter === 'locked') return !isUnlocked;
        return true;
    });
  }, [achievements, achievementStatuses, filter]);

  // Cast Object.values to AchievementStatus[] to avoid 'unknown' type error
  const totalUnlocked = (Object.values(achievementStatuses) as AchievementStatus[]).filter(s => s.isUnlocked).length;
  const totalCount = achievements.length;
  const progressPercent = Math.round((totalUnlocked / (totalCount || 1)) * 100) || 0;

  const handleStartCreate = () => {
      setFormData({ 
          id: Date.now().toString(), 
          title: '', 
          description: '', 
          iconName: 'StarIcon', 
          goal: 1, 
          isCustom: true, 
          isManual: true // Default custom to manual check
      });
      setIsCreating(true);
      setIsEditing(null);
  };

  const handleStartEdit = (ach: Achievement) => {
      setFormData({ ...ach });
      setIsEditing(ach);
      setIsCreating(false);
  };

  const handleDelete = () => {
      if (isEditing && isEditing.id) {
          if (confirm(`确定要删除“${isEditing.title}”这个愿望吗？此操作不可恢复。`)) {
              onDelete(isEditing.id);
              setIsEditing(null);
          }
      }
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title) return;

      const achievementToSave = formData as Achievement;

      if (isCreating) {
          onAdd(achievementToSave);
      } else if (isEditing) {
          onEdit(achievementToSave);
      }
      
      setIsCreating(false);
      setIsEditing(null);
  };

  const handleCancel = () => {
      setIsCreating(false);
      setIsEditing(null);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[4000] flex justify-center items-center p-4 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-paper-surface rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden border border-gray-200" 
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar Dashboard */}
        <div className="w-64 bg-paper-cream border-r border-gray-200 p-6 flex-col hidden md:flex">
            <h2 className="text-2xl font-title font-bold text-gray-800 mb-8 flex items-center gap-2">
                <TrophyIcon className="w-6 h-6 text-yellow-500" />
                里程碑
            </h2>

            {/* Circular Progress */}
            <div className="relative w-40 h-40 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="transparent" />
                    <circle 
                        cx="80" cy="80" r="70" 
                        stroke="var(--seal-500)" 
                        strokeWidth="12" 
                        fill="transparent" 
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * progressPercent / 100)}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{progressPercent}%</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">已完成</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2 flex-1">
                {['all', 'unlocked', 'locked'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center justify-between
                            ${filter === f ? 'bg-seal-500 text-white shadow-md' : 'text-gray-600 hover:bg-paper-dark'}
                        `}
                    >
                        <span className="capitalize">{f === 'all' ? '全部成就' : f === 'unlocked' ? '已达成' : '进行中'}</span>
                        {f === 'all' && <span className="bg-paper-surface/20 px-2 py-0.5 rounded text-xs">{totalCount}</span>}
                    </button>
                ))}
            </nav>

            <button 
                onClick={handleStartCreate}
                className="mt-auto w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
                <PlusIcon className="w-4 h-4" /> 新建愿望
            </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-paper-cream/50 relative overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden p-4 border-b bg-paper-surface flex justify-between items-center">
                <h2 className="font-bold text-lg">里程碑 ({totalUnlocked}/{totalCount})</h2>
                <button onClick={onClose}><XIcon className="w-6 h-6 text-gray-500" /></button>
            </div>
            
            {/* Desktop Close */}
            <button onClick={onClose} className="hidden md:block absolute top-4 right-4 z-10 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <XIcon className="w-6 h-6" />
            </button>

            {/* Content or Edit Form */}
            {(isCreating || isEditing) ? (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-slideInUp custom-scrollbar">
                    <div className="max-w-2xl mx-auto bg-paper-surface p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">{isCreating ? '新建愿望' : '编辑成就'}</h3>
                            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 p-2"><XIcon className="w-5 h-5"/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">选择一个代表图标</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {Object.keys(ICON_MAP).map(iconName => {
                                        const Icon = ICON_MAP[iconName];
                                        const label = ICON_LABELS[iconName] || '图标';
                                        const isSelected = formData.iconName === iconName;
                                        return (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, iconName }))}
                                                className={`
                                                    flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
                                                    ${isSelected 
                                                        ? 'bg-seal-50 border-seal-500 text-seal-600 shadow-md transform scale-105' 
                                                        : 'bg-paper-surface border-gray-100 text-gray-400 hover:border-gray-300 hover:bg-paper-cream'
                                                    }
                                                `}
                                            >
                                                <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-seal-500' : 'text-gray-400'}`} />
                                                <span className={`text-xs font-bold ${isSelected ? 'text-seal-600' : 'text-gray-500'}`}>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">愿望标题</label>
                                <input 
                                    type="text" 
                                    value={formData.title} 
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-paper-cream focus:bg-paper-surface focus:ring-2 focus:ring-seal-500 focus:border-seal-500 outline-none transition-all"
                                    placeholder="例如：一起去冰岛看极光..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">描述与细节</label>
                                <textarea 
                                    value={formData.description} 
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-paper-cream focus:bg-paper-surface focus:ring-2 focus:ring-seal-500 focus:border-seal-500 outline-none h-24 transition-all"
                                    placeholder="描述这个美好的愿望，或者如何去实现它..."
                                />
                            </div>
                            
                            {/* System achievements default to manual if edited, or keep existing logic */}
                            {(formData.isCustom || isEditing) && (
                                <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
                                    <TicketIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-blue-800">手动完成模式</p>
                                        <p className="text-xs text-blue-600 mt-1">就像愿望清单一样，当你实现它时，可以随时回来手动勾选完成。</p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                {isEditing && (
                                    <button 
                                        type="button" 
                                        onClick={handleDelete}
                                        className="flex-1 bg-paper-surface text-red-500 border border-red-200 py-3.5 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <TrashIcon className="w-5 h-5" /> 删除
                                    </button>
                                )}
                                <button type="submit" className="flex-[2] bg-seal-500 text-white py-3.5 rounded-xl font-bold hover:bg-seal-600 transition-transform active:scale-95 shadow-lg shadow-seal-100 flex items-center justify-center gap-2">
                                    <SaveIcon className="w-5 h-5" /> 保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                     {/* Mobile Add Button */}
                    <div className="md:hidden mb-6">
                        <button onClick={handleStartCreate} className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2">
                            <PlusIcon className="w-5 h-5" /> 添加新愿望
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredAchievements.map(ach => {
                            // Explicitly cast status
                            const status = achievementStatuses[ach.id] as AchievementStatus | undefined;
                            const isUnlocked = status?.isUnlocked; 
                            const IconComp = ICON_MAP[ach.iconName] || StarIcon;
                            const showProgress = !ach.isManual && ach.goal > 1;

                            return (
                                <div 
                                    key={ach.id}
                                    className={`group relative p-5 rounded-2xl border transition-all duration-300 flex flex-col
                                        ${isUnlocked 
                                            ? 'bg-paper-surface border-seal-100 shadow-lg shadow-seal-50/50' 
                                            : 'bg-paper-surface/60 border-gray-200 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300
                                            ${isUnlocked ? 'bg-gradient-to-br from-seal-400 to-seal-500 text-white shadow-md' : 'bg-paper-dark text-gray-400'}
                                        `}>
                                            <IconComp className="w-6 h-6" />
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleStartEdit(ach)} className="p-2 hover:bg-paper-dark rounded-full text-gray-400 hover:text-blue-500 transition-colors">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className={`font-bold text-lg mb-1 ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>{ach.title}</h3>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed line-clamp-2 min-h-[40px]">{ach.description}</p>

                                    <div className="mt-auto">
                                        {ach.isManual || ach.isCustom ? (
                                            <label className="flex items-center cursor-pointer gap-3 bg-paper-cream p-2 rounded-lg hover:bg-paper-dark transition-colors select-none">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isUnlocked ? 'bg-green-500 border-green-500' : 'bg-paper-surface border-gray-300'}`}>
                                                    {isUnlocked && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden" 
                                                    checked={!!isUnlocked} 
                                                    onChange={(e) => onToggleManual(ach.id, e.target.checked)} 
                                                />
                                                <span className={`text-xs font-bold uppercase tracking-wider ${isUnlocked ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {isUnlocked ? '已实现' : '标记实现'}
                                                </span>
                                            </label>
                                        ) : (
                                            showProgress && status && (
                                                <div className="w-full">
                                                    <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                                                        <span>Progress</span>
                                                        <span>{status.progress} / {ach.goal}</span>
                                                    </div>
                                                    <div className="h-2 bg-paper-dark rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-seal-500 transition-all duration-500 ease-out"
                                                            style={{ width: `${(status.progress / ach.goal) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        )}
                                        {/* Tag for System vs Custom */}
                                        {!ach.isCustom && !ach.isManual && !showProgress && isUnlocked && (
                                             <div className="text-xs font-bold text-seal-500 uppercase tracking-wider mt-2 flex items-center gap-1">
                                                 <SparklesIcon className="w-3 h-3" /> System Unlocked
                                             </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Empty State for Filters */}
                        {filteredAchievements.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                                <TrophyIcon className="w-16 h-16 text-gray-300 mb-4" />
                                <p>没有找到相关成就。</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AchievementsModal;
