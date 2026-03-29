import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SliderField from '../components/SliderField';
import type { UserProfile, RatingSet } from '../lib/matchModel';

const ATTRS = [
  {
    key: 'attr' as const,
    label: 'ความน่าดึงดูด',
    sublabel: 'Attractiveness',
    description: 'รูปลักษณ์และบุคลิกภาพโดยรวมของเขา/เธอ',
  },
  {
    key: 'sinc' as const,
    label: 'ความจริงใจ',
    sublabel: 'Sincerity',
    description: 'ความจริงใจและความเป็นตัวเองของเขา/เธอ',
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
    description: 'บรรยากาศและความสนุกที่รู้สึกได้เมื่ออยู่ด้วยกัน',
  },
  {
    key: 'amb' as const,
    label: 'ความมุ่งมั่น',
    sublabel: 'Ambition',
    description: 'ทิศทางและเป้าหมายในชีวิตที่เขา/เธอแสดงออกมา',
  },
  {
    key: 'shar' as const,
    label: 'ความสนใจร่วม',
    sublabel: 'Shared Interests',
    description: 'ความสนใจและกิจกรรมที่รู้สึกว่าตรงกับตัวเอง',
  },
];

const DEFAULT_RATING = { attr: 7, sinc: 7, intel: 7, fun: 7, amb: 6, shar: 6 };

export default function RatePage() {
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [myRatings, setMyRatings] = useState<RatingSet>({});
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [currentRating, setCurrentRating] = useState({ ...DEFAULT_RATING });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('sd_userId');
    if (!id) { router.push('/'); return; }
    setMyId(id);
    fetchData(id);
  }, []);

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const [usersRes, ratingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/ratings?userId=${id}`),
      ]);
      const allUsers: UserProfile[] = await usersRes.json();
      const ratings: RatingSet = await ratingsRes.json();
      setUsers(allUsers.filter(u => u.id !== id));
      setMyRatings(ratings);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user: UserProfile) => {
    setSelected(user);
    setSaved(false);
    const existing = myRatings[user.id];
    setCurrentRating(existing ? { ...existing } : { ...DEFAULT_RATING });
  };

  const saveRating = async () => {
    if (!myId || !selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId, ratings: { [selected.id]: currentRating } }),
      });
      if (res.ok) {
        setMyRatings(prev => ({ ...prev, [selected.id]: { ...currentRating } }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const ratedCount = Object.keys(myRatings).length;
  const totalCount = users.length;

  return (
    <Layout title="Rate Others">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-dim text-sm animate-pulse">Loading participants...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-4xl mb-4">🌙</div>
          <p className="text-dim">No other participants yet. Share the link!</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Participants list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-dim uppercase tracking-wider">Participants</h2>
              <span className="font-mono text-xs text-teal">
                {ratedCount}/{totalCount} rated
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-border rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-teal rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (ratedCount / totalCount) * 100 : 0}%` }}
              />
            </div>

            {users.map(user => {
              const isRated = !!myRatings[user.id];
              const isSelected = selected?.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-rose/10 border-rose/40'
                      : 'card-glass border-border hover:border-rose/20 hover:bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        isSelected ? 'bg-rose text-white' : 'bg-surface text-dim'
                      }`}>
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text">{user.name}</div>
                        <div className="text-xs text-muted">Age {user.age}</div>
                      </div>
                    </div>
                    {isRated && (
                      <span className="text-teal text-lg">✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rating panel */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="card-glass rounded-2xl p-6 sticky top-20 animate-fade-in">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-rose/20 flex items-center justify-center text-2xl font-display font-black text-rose">
                    {selected.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-bright">{selected.name}</h3>
                    <p className="text-dim text-sm">Age {selected.age}</p>
                  </div>
                  {myRatings[selected.id] && (
                    <span className="ml-auto text-xs bg-teal/10 border border-teal/30 text-teal px-3 py-1 rounded-full">
                      Previously rated
                    </span>
                  )}
                </div>

                <div className="space-y-5 mb-7">
                  {ATTRS.map(({ key, label, sublabel, description }) => (
                    <SliderField
                      key={key}
                      label={label}
                      sublabel={sublabel}
                      description={description}
                      value={currentRating[key]}
                      onChange={v => setCurrentRating(prev => ({ ...prev, [key]: v }))}
                      color="rose"
                    />
                  ))}
                </div>

                <button
                  onClick={saveRating}
                  disabled={saving}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 text-sm ${
                    saved
                      ? 'bg-teal/20 border border-teal/30 text-teal'
                      : 'bg-rose hover:bg-rose-dim text-white glow-rose'
                  }`}
                >
                  {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Rating'}
                </button>

                {ratedCount === totalCount && (
                  <div className="mt-4 p-4 bg-teal/10 border border-teal/20 rounded-xl text-center">
                    <p className="text-teal text-sm font-medium mb-2">🎉 You've rated everyone!</p>
                    <button
                      onClick={() => router.push('/results')}
                      className="text-sm text-teal underline underline-offset-2 hover:no-underline"
                    >
                      See your matches →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 card-glass rounded-2xl border-2 border-dashed border-border">
                <div className="text-center">
                  <div className="text-4xl mb-3 animate-float">👆</div>
                  <p className="text-dim text-sm">Select a person to rate them</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
