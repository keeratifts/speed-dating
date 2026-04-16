import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import Layout from '../components/Layout';
import SliderField from '../components/SliderField';
import type { UserProfile } from '../lib/matchModel';

const ATTRS = [
  {
    key: 'attr' as const,
    label: 'ความน่าดึงดูด',
    sublabel: 'Attractiveness',
    description: 'รูปลักษณ์ภายนอกและบุคลิกภาพโดยรวมที่ผู้อื่นมองเห็น',
  },
  {
    key: 'sinc' as const,
    label: 'ความจริงใจ',
    sublabel: 'Sincerity',
    description: 'ความซื่อสัตย์และความเป็นตัวของตัวเองในการแสดงออก',
  },
  {
    key: 'intel' as const,
    label: 'สติปัญญา',
    sublabel: 'Intelligence',
    description: 'ความสามารถในการสนทนาและแลกเปลี่ยนความคิด',
  },
  {
    key: 'fun' as const,
    label: 'ความสนุกสนาน',
    sublabel: 'Fun',
    description: 'ความสามารถในการสร้างบรรยากาศที่ผ่อนคลายและมีชีวิตชีวา',
  },
  {
    key: 'amb' as const,
    label: 'ความมุ่งมั่น',
    sublabel: 'Ambition',
    description: 'การมีเป้าหมายและทิศทางในชีวิตที่ชัดเจน',
  },
  {
    key: 'shar' as const,
    label: 'ความสนใจร่วม',
    sublabel: 'Shared Interests',
    description: 'ความสนใจและกิจกรรมที่คล้ายคลึงกับผู้อื่น',
  },
] as const;

type AttrKey = typeof ATTRS[number]['key'];

// Icons for each attribute
const ATTR_ICONS: Record<AttrKey, string> = {
  attr: '✨',
  sinc: '🤝',
  intel: '💡',
  fun: '🎉',
  amb: '🎯',
  shar: '🎨',
};

// Rank order → weight mapping (rank 1 = most important)
// Uses a descending scale that sums to 100
const RANK_WEIGHTS = [35, 25, 17, 11, 7, 5]; // 6 ranks, sums to 100

function rankToWeights(rankOrder: AttrKey[]): Record<string, number> {
  const weights: Record<string, number> = {};
  rankOrder.forEach((key, idx) => {
    weights[`pref_${key}`] = RANK_WEIGHTS[idx];
  });
  return weights;
}

// Default rank order
const DEFAULT_RANK: AttrKey[] = ['attr', 'intel', 'fun', 'sinc', 'shar', 'amb'];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [selfRatings, setSelfRatings] = useState<Record<AttrKey, number>>({
    attr: 7, sinc: 7, intel: 7, fun: 7, amb: 6, shar: 6,
  });
  // Preference ranking — ordered list from most to least important
  const [rankOrder, setRankOrder] = useState<AttrKey[]>(DEFAULT_RANK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('sd_userId');
    if (id) setAlreadyRegistered(true);
    const n = localStorage.getItem('sd_name');
    if (n) setName(n);
  }, []);

  // Move a card up or down by one position
  const moveCard = (idx: number, dir: -1 | 1) => {
    const newOrder = [...rankOrder];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    setRankOrder(newOrder);
  };

  // Drag handlers
  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const onDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const newOrder = [...rankOrder];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    setRankOrder(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Please enter your name');
    setLoading(true);
    setError('');
    try {
      const prefWeights = rankToWeights(rankOrder);
      const id = uuidv4();
      const user: UserProfile = {
        id, name: name.trim(), age,
        ...selfRatings,
        ...prefWeights as any,
        createdAt: Date.now(),
      };
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error('Registration failed');
      localStorage.setItem('sd_userId', id);
      localStorage.setItem('sd_name', name.trim());
      router.push('/rate');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReRegister = () => {
    localStorage.removeItem('sd_userId');
    localStorage.removeItem('sd_name');
    setAlreadyRegistered(false);
  };

  const rankLabels = ['สำคัญที่สุด', 'สำคัญมาก', 'ค่อนข้างสำคัญ', 'ปานกลาง', 'น้อย', 'น้อยที่สุด'];
  const rankColors = [
    'border-rose/60 bg-rose/10',
    'border-rose/40 bg-rose/7',
    'border-teal/40 bg-teal/8',
    'border-teal/25 bg-teal/5',
    'border-border bg-surface/60',
    'border-border bg-surface/40',
  ];
  const rankBadgeColors = [
    'bg-rose text-white',
    'bg-rose/70 text-white',
    'bg-teal/80 text-void',
    'bg-teal/50 text-void',
    'bg-muted/60 text-dim',
    'bg-muted/40 text-muted',
  ];

  return (
    <Layout>
      {/* Hero */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-rose/10 border border-rose/20 rounded-full px-4 py-1.5 mb-4">
          <span className="text-rose text-xs">❤</span>
          <span className="text-xs text-rose font-medium tracking-wide uppercase">Speed Dating · AI Matching</span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-black text-bright mb-4 leading-none">
          Find your<br />
          <span className="text-gradient-rose">perfect match</span>
        </h1>
        <p className="text-dim max-w-md mx-auto text-sm leading-relaxed">
          Rate each other, and our Naive Bayes model — trained on real Columbia University
          speed dating data — predicts your mutual attraction.
        </p>
      </div>

      {alreadyRegistered ? (
        <div className="max-w-md mx-auto card-glass rounded-2xl p-8 text-center animate-slide-up">
          <div className="w-16 h-16 bg-rose/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-bright mb-2">You're registered!</h2>
          <p className="text-dim text-sm mb-6">You can go rate others or check your results.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/rate')}
              className="w-full py-3 bg-rose hover:bg-rose-dim text-white rounded-xl font-semibold transition-colors"
            >
              Rate Others →
            </button>
            <button
              onClick={() => router.push('/results')}
              className="w-full py-3 bg-surface hover:bg-card border border-border text-text rounded-xl font-semibold transition-colors"
            >
              See Results →
            </button>
            <button
              onClick={handleReRegister}
              className="text-xs text-muted hover:text-dim transition-colors mt-2"
            >
              Re-register with new profile
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
          {/* Basic Info */}
          <section className="card-glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold text-bright mb-5 flex items-center gap-2">
              <span className="text-rose">01</span> Your Profile
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-surface border border-border focus:border-rose/50 rounded-xl px-4 py-3 text-text placeholder-muted outline-none transition-colors text-sm"
                />
              </div>
              <SliderField
                label="Age"
                value={age}
                min={18}
                max={60}
                onChange={v => setAge(v)}
                color="rose"
              />
            </div>
          </section>

          {/* Self-ratings */}
          <section className="card-glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold text-bright mb-1 flex items-center gap-2">
              <span className="text-rose">02</span> Rate Yourself
            </h2>
            <p className="text-xs text-muted mb-5">How would others objectively rate you? Be honest.</p>
            <div className="grid sm:grid-cols-2 gap-5">
              {ATTRS.map(({ key, label, sublabel, description }) => (
                <SliderField
                  key={key}
                  label={label}
                  sublabel={sublabel}
                  description={description}
                  value={selfRatings[key]}
                  onChange={v => setSelfRatings(prev => ({ ...prev, [key]: v }))}
                  color="rose"
                />
              ))}
            </div>
          </section>

          {/* Preference ranking — replaces the old slider/weight section */}
          <section className="card-glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold text-bright mb-1 flex items-center gap-2">
              <span className="text-teal">03</span> What Matters to You?
            </h2>
            <p className="text-xs text-muted mb-5">
              เรียงลำดับสิ่งที่คุณให้ความสำคัญในคู่เดต — ลาก หรือกดลูกศรเพื่อจัดลำดับ
              <span className="block text-muted/70 mt-0.5">Drag or use arrows to rank what you value most in a date.</span>
            </p>

            <div className="space-y-2">
              {rankOrder.map((key, idx) => {
                const attr = ATTRS.find(a => a.key === key)!;
                const isDragging = dragIdx === idx;
                const isDragOver = dragOverIdx === idx;

                return (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDrop={() => onDrop(idx)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing
                      transition-all duration-150 select-none
                      ${rankColors[idx]}
                      ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
                      ${isDragOver && !isDragging ? 'scale-[1.02] border-teal/60' : ''}
                    `}
                  >
                    {/* Rank badge */}
                    <div className={`
                      w-7 h-7 rounded-lg flex items-center justify-center
                      text-xs font-bold font-mono flex-shrink-0
                      ${rankBadgeColors[idx]}
                    `}>
                      {idx + 1}
                    </div>

                    {/* Icon */}
                    <span className="text-lg flex-shrink-0">{ATTR_ICONS[key]}</span>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-semibold text-text leading-tight"
                        style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}
                      >
                        {attr.label}
                      </div>
                      <div className="text-xs text-muted">{attr.sublabel}</div>
                    </div>

                    {/* Importance label */}
                    <div
                      className="hidden sm:block text-xs text-right flex-shrink-0"
                      style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif", color: '#6b6b99' }}
                    >
                      {rankLabels[idx]}
                    </div>

                    {/* Arrow controls (mobile-friendly alternative to drag) */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveCard(idx, -1)}
                        disabled={idx === 0}
                        className="w-6 h-5 flex items-center justify-center rounded text-muted hover:text-text hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveCard(idx, 1)}
                        disabled={idx === rankOrder.length - 1}
                        className="w-6 h-5 flex items-center justify-center rounded text-muted hover:text-text hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Drag handle */}
                    <div className="text-muted/40 flex-shrink-0 text-sm">⠿</div>
                  </div>
                );
              })}
            </div>

            {/* Visual weight summary */}
            <div className="mt-4 p-3 bg-surface/60 rounded-xl">
              <p className="text-xs text-muted mb-2">น้ำหนักที่ใช้ในการคำนวณ · Weight used in matching</p>
              <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                {rankOrder.map((key, idx) => {
                  const attr = ATTRS.find(a => a.key === key)!;
                  const w = RANK_WEIGHTS[idx];
                  return (
                    <div
                      key={key}
                      title={`${attr.sublabel}: ${w}%`}
                      className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: `${w}%`,
                        background: idx < 2
                          ? `rgba(255,77,141,${1 - idx * 0.3})`
                          : idx < 4
                          ? `rgba(0,229,204,${0.9 - (idx - 2) * 0.3})`
                          : `rgba(107,107,153,${0.6 - (idx - 4) * 0.2})`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex gap-1 mt-1.5">
                {rankOrder.map((key, idx) => {
                  const attr = ATTRS.find(a => a.key === key)!;
                  return (
                    <div
                      key={key}
                      className="text-center"
                      style={{ width: `${RANK_WEIGHTS[idx]}%` }}
                    >
                      <span className="text-xs text-muted/60 truncate block" style={{ fontSize: '9px' }}>
                        {RANK_WEIGHTS[idx]}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {error && (
            <div className="bg-rose/10 border border-rose/30 rounded-xl px-4 py-3 text-sm text-rose">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-rose hover:bg-rose-dim disabled:opacity-50 text-white rounded-2xl font-semibold text-base transition-all duration-200 glow-rose hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? 'Registering...' : 'Register & Start Rating →'}
          </button>
        </div>
      )}
    </Layout>
  );
}
