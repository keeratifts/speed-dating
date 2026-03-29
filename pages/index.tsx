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

const PREF_ATTRS = [
  {
    key: 'attr' as const,
    prefKey: 'pref_attr' as const,
    label: 'ความน่าดึงดูด',
    sublabel: 'Attractiveness',
    description: 'คุณให้ความสำคัญกับรูปลักษณ์และบุคลิกภาพมากแค่ไหน',
  },
  {
    key: 'sinc' as const,
    prefKey: 'pref_sinc' as const,
    label: 'ความจริงใจ',
    sublabel: 'Sincerity',
    description: 'คุณให้ความสำคัญกับความจริงใจและความซื่อตรงมากแค่ไหน',
  },
  {
    key: 'intel' as const,
    prefKey: 'pref_intel' as const,
    label: 'สติปัญญา',
    sublabel: 'Intelligence',
    description: 'คุณให้ความสำคัญกับการสนทนาที่มีความลึกมากแค่ไหน',
  },
  {
    key: 'fun' as const,
    prefKey: 'pref_fun' as const,
    label: 'ความสนุกสนาน',
    sublabel: 'Fun',
    description: 'คุณให้ความสำคัญกับความสนุกและบรรยากาศดีมากแค่ไหน',
  },
  {
    key: 'amb' as const,
    prefKey: 'pref_amb' as const,
    label: 'ความมุ่งมั่น',
    sublabel: 'Ambition',
    description: 'คุณให้ความสำคัญกับคนที่มีเป้าหมายชีวิตมากแค่ไหน',
  },
  {
    key: 'shar' as const,
    prefKey: 'pref_shar' as const,
    label: 'ความสนใจร่วม',
    sublabel: 'Shared Interests',
    description: 'คุณให้ความสำคัญกับการมีความสนใจเหมือนกันมากแค่ไหน',
  },
];

type AttrKey = typeof ATTRS[number]['key'];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [selfRatings, setSelfRatings] = useState<Record<AttrKey, number>>({
    attr: 7, sinc: 7, intel: 7, fun: 7, amb: 6, shar: 6,
  });
  const [prefWeights, setPrefWeights] = useState<Record<string, number>>({
    pref_attr: 20, pref_sinc: 15, pref_intel: 20, pref_fun: 20, pref_amb: 10, pref_shar: 15,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('sd_userId');
    if (id) setAlreadyRegistered(true);
    const n = localStorage.getItem('sd_name');
    if (n) setName(n);
  }, []);

  const totalWeight = Object.values(prefWeights).reduce((s, v) => s + v, 0);

  const setPref = (key: string, val: number) => {
    setPrefWeights(prev => ({ ...prev, [key]: val }));
  };

  const normalize = () => {
    const total = Object.values(prefWeights).reduce((s, v) => s + v, 0);
    if (total === 0) return;
    const factor = 100 / total;
    setPrefWeights(prev =>
      Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Math.round(v * factor)]))
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Please enter your name');
    if (totalWeight < 95 || totalWeight > 105) return setError('Preference weights must sum to ~100');

    setLoading(true);
    setError('');
    try {
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
                <label className="block text-sm font-medium text-text mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-surface border border-border focus:border-rose/50 rounded-xl px-4 py-3 text-text placeholder-muted outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Age <span className="text-rose font-mono font-bold">{age}</span>
                </label>
                <input
                  type="range"
                  min={18}
                  max={60}
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                  className="w-full mt-3"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted">18</span>
                  <span className="text-xs text-muted">60</span>
                </div>
              </div>
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

          {/* Preference weights */}
          <section className="card-glass rounded-2xl p-6">
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-display text-xl font-bold text-bright flex items-center gap-2">
                <span className="text-teal">03</span> What Matters to You?
              </h2>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-sm font-bold ${Math.abs(totalWeight - 100) < 6 ? 'text-teal' : 'text-rose'}`}>
                  {totalWeight}/100
                </span>
                <button
                  onClick={normalize}
                  className="text-xs bg-surface border border-border hover:border-teal/40 text-dim hover:text-teal px-3 py-1 rounded-lg transition-colors"
                >
                  Auto-balance
                </button>
              </div>
            </div>
            <p className="text-xs text-muted mb-5">Weights must sum to 100. Used in match prediction.</p>
            <div className="grid sm:grid-cols-2 gap-5">
              {PREF_ATTRS.map(({ key, label, sublabel, description, prefKey }) => (
                <SliderField
                  key={prefKey}
                  label={label}
                  sublabel={sublabel}
                  description={description}
                  value={prefWeights[prefKey]}
                  min={0}
                  max={50}
                  onChange={v => setPref(prefKey, v)}
                  color="teal"
                  suffix="%"
                />
              ))}
            </div>
            {Math.abs(totalWeight - 100) >= 6 && (
              <p className="text-xs text-rose mt-3 bg-rose/10 border border-rose/20 rounded-lg px-3 py-2">
                ⚠ Weights currently sum to {totalWeight}. Click "Auto-balance" or adjust manually.
              </p>
            )}
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
