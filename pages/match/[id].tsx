import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import type { UserProfile, RatingSet } from '../../lib/matchModel';
import { predictMatchProbability } from '../../lib/matchModel';

const MATCH_THRESHOLD = 0.30;

const THETA_0 = [5.964,7.055,7.251,6.199,6.712,5.32,5.952,7.024,7.235,6.184,6.698,5.3,0.19,26.391,26.391,22.397,17.462,20.223,17.436,10.694,11.917];
const THETA_1 = [7.334,7.82,7.948,7.591,7.317,6.699,7.295,7.786,7.957,7.589,7.295,6.68,0.213,26.034,26.05,23.135,16.792,20.464,18.011,10.548,11.174];
const VAR_0   = [3.662,2.976,2.41,3.631,3.036,3.942,3.638,3.048,2.404,3.684,3.009,4.023,0.09,13.049,12.964,148.389,48.391,46.056,35.955,37.322,39.703];
const VAR_1   = [2.391,2.041,1.575,2.19,2.39,3.127,2.436,2.137,1.548,2.172,2.414,3.013,0.092,10.551,11.093,194.707,48.765,46.775,42.333,37.85,41.509];
const PRIOR   = [0.8353, 0.1647];

const FEATURE_LABELS = [
  { key: 'attr',    label: 'Attractiveness',    group: 'you→them', thai: 'ความน่าดึงดูด' },
  { key: 'sinc',    label: 'Sincerity',          group: 'you→them', thai: 'ความจริงใจ' },
  { key: 'intel',   label: 'Intelligence',       group: 'you→them', thai: 'สติปัญญา' },
  { key: 'fun',     label: 'Fun',                group: 'you→them', thai: 'ความสนุกสนาน' },
  { key: 'amb',     label: 'Ambition',           group: 'you→them', thai: 'ความมุ่งมั่น' },
  { key: 'shar',    label: 'Shared Interests',   group: 'you→them', thai: 'ความสนใจร่วม' },
  { key: 'attr_o',  label: 'Attractiveness',     group: 'them→you', thai: 'ความน่าดึงดูด' },
  { key: 'sinc_o',  label: 'Sincerity',          group: 'them→you', thai: 'ความจริงใจ' },
  { key: 'intel_o', label: 'Intelligence',       group: 'them→you', thai: 'สติปัญญา' },
  { key: 'fun_o',   label: 'Fun',                group: 'them→you', thai: 'ความสนุกสนาน' },
  { key: 'amb_o',   label: 'Ambition',           group: 'them→you', thai: 'ความมุ่งมั่น' },
  { key: 'shar_o',  label: 'Shared Interests',   group: 'them→you', thai: 'ความสนใจร่วม' },
  { key: 'int_corr',label: 'Interest correlation',group: 'context', thai: 'ความสัมพันธ์ความสนใจ' },
  { key: 'age',     label: 'Age (you)',           group: 'context', thai: 'อายุ (คุณ)' },
  { key: 'age_o',   label: 'Age (them)',          group: 'context', thai: 'อายุ (เขา/เธอ)' },
  { key: 'attr1_1', label: 'Pref: Attractiveness',group: 'prefs',   thai: 'ให้ความสำคัญ: รูปลักษณ์' },
  { key: 'sinc1_1', label: 'Pref: Sincerity',     group: 'prefs',   thai: 'ให้ความสำคัญ: จริงใจ' },
  { key: 'intel1_1',label: 'Pref: Intelligence',  group: 'prefs',   thai: 'ให้ความสำคัญ: ฉลาด' },
  { key: 'fun1_1',  label: 'Pref: Fun',           group: 'prefs',   thai: 'ให้ความสำคัญ: สนุก' },
  { key: 'amb1_1',  label: 'Pref: Ambition',      group: 'prefs',   thai: 'ให้ความสำคัญ: มุ่งมั่น' },
  { key: 'shar1_1', label: 'Pref: Shared Int.',   group: 'prefs',   thai: 'ให้ความสำคัญ: ความสนใจร่วม' },
];

function gaussianLogProb(x: number, mean: number, variance: number): number {
  const diff = x - mean;
  return -0.5 * Math.log(2 * Math.PI * variance) - (diff * diff) / (2 * variance);
}

function gaussianProb(x: number, mean: number, variance: number): number {
  return Math.exp(gaussianLogProb(x, mean, variance));
}

interface FeatureRow {
  label: string;
  thai: string;
  group: string;
  value: number;
  mean0: number;
  mean1: number;
  logP0: number;
  logP1: number;
  favoursMatch: boolean;
  contribution: number; // logP1 - logP0, positive = favours match
}

function buildFeatureRows(features: number[]): FeatureRow[] {
  return features.map((val, i) => {
    const lp0 = gaussianLogProb(val, THETA_0[i], VAR_0[i]);
    const lp1 = gaussianLogProb(val, THETA_1[i], VAR_1[i]);
    return {
      label: FEATURE_LABELS[i].label,
      thai:  FEATURE_LABELS[i].thai,
      group: FEATURE_LABELS[i].group,
      value: val,
      mean0: THETA_0[i],
      mean1: THETA_1[i],
      logP0: lp0,
      logP1: lp1,
      favoursMatch: lp1 > lp0,
      contribution: lp1 - lp0,
    };
  });
}

function buildFeatureVec(
  me: UserProfile,
  other: UserProfile,
  myRatingOfThem: { attr:number;sinc:number;intel:number;fun:number;amb:number;shar:number } | null,
  theirRatingOfMe: { attr:number;sinc:number;intel:number;fun:number;amb:number;shar:number } | null
): number[] {
  const med = { attr:6,sinc:7,intel:7,fun:7,amb:7,shar:6 };
  const mr  = myRatingOfThem  ?? med;
  const tr  = theirRatingOfMe ?? { attr: other.attr, sinc: other.sinc, intel: other.intel, fun: other.fun, amb: other.amb, shar: other.shar };
  return [
    mr.attr, mr.sinc, mr.intel, mr.fun, mr.amb, mr.shar,
    tr.attr, tr.sinc, tr.intel, tr.fun, tr.amb, tr.shar,
    0.21, me.age, other.age,
    me.pref_attr, me.pref_sinc, me.pref_intel, me.pref_fun, me.pref_amb, me.pref_shar,
  ];
}

const GROUP_LABELS: Record<string, string> = {
  'you→them': 'How you rated them',
  'them→you': 'How they rated you',
  'context':  'Context',
  'prefs':    'Your preference weights',
};

const GROUP_COLORS: Record<string, string> = {
  'you→them': '#ff4d8d',
  'them→you': '#00e5cc',
  'context':  '#ffb347',
  'prefs':    '#a855f7',
};

function ContributionBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = Math.abs(value) / maxAbs * 100;
  const favours = value > 0;
  return (
    <div className="flex items-center gap-2 w-full">
      {/* Left side (favours no match) */}
      <div className="flex-1 flex justify-end">
        {!favours && (
          <div
            className="h-3 rounded-sm transition-all duration-500"
            style={{ width: `${pct}%`, background: '#3a3a60' }}
          />
        )}
      </div>
      {/* Centre line */}
      <div className="w-px h-4 bg-border flex-shrink-0" />
      {/* Right side (favours match) */}
      <div className="flex-1">
        {favours && (
          <div
            className="h-3 rounded-sm transition-all duration-500"
            style={{ width: `${pct}%`, background: '#00e5cc' }}
          />
        )}
      </div>
    </div>
  );
}

export default function MatchDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [me, setMe]           = useState<UserProfile | null>(null);
  const [other, setOther]     = useState<UserProfile | null>(null);
  const [myRating, setMyRating]     = useState<any>(null);
  const [theirRating, setTheirRating] = useState<any>(null);
  const [direction, setDirection] = useState<'me→them' | 'them→me'>('me→them');

  useEffect(() => {
    const myId = localStorage.getItem('sd_userId');
    if (!myId || !id) return;
    loadData(myId, id as string);
  }, [id]);

  const loadData = async (myId: string, otherId: string) => {
    setLoading(true);
    try {
      const [usersRes, myRatingsRes, theirRatingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/ratings?userId=${myId}`),
        fetch(`/api/ratings?userId=${otherId}`),
      ]);
      const allUsers: UserProfile[] = await usersRes.json();
      const myRatings: RatingSet    = await myRatingsRes.json();
      const theirRatings: RatingSet = await theirRatingsRes.json();

      const myProfile    = allUsers.find(u => u.id === myId);
      const otherProfile = allUsers.find(u => u.id === otherId);
      if (!myProfile || !otherProfile) return;

      setMe(myProfile);
      setOther(otherProfile);
      setMyRating(myRatings[otherId] ?? null);
      setTheirRating(theirRatings[myId] ?? null);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !me || !other) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-rose/30 border-t-rose rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  // Build feature vector for the selected direction
  const isMe2Them = direction === 'me→them';
  const rater   = isMe2Them ? me    : other;
  const target  = isMe2Them ? other : me;
  const raterRatingOfTarget = isMe2Them ? myRating    : theirRating;
  const targetRatingOfRater = isMe2Them ? theirRating : myRating;

  const features = buildFeatureVec(rater, target, raterRatingOfTarget, targetRatingOfRater);
  const rows     = buildFeatureRows(features);

  // Full NB calculation
  let logP0 = Math.log(PRIOR[0]);
  let logP1 = Math.log(PRIOR[1]);
  rows.forEach(r => { logP0 += r.logP0; logP1 += r.logP1; });
  const maxLog = Math.max(logP0, logP1);
  const prob   = Math.exp(logP1 - maxLog) / (Math.exp(logP0 - maxLog) + Math.exp(logP1 - maxLog));
  const passes = prob >= MATCH_THRESHOLD;

  const maxAbs = Math.max(...rows.map(r => Math.abs(r.contribution)));

  // Group rows
  const groups = ['you→them', 'them→you', 'context', 'prefs'];
  const topFeatures = [...rows].sort((a,b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 5);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

        {/* Back button */}
        <button
          onClick={() => router.push('/results')}
          className="flex items-center gap-2 text-sm text-dim hover:text-text transition-colors"
        >
          ← Back to results
        </button>

        {/* Header */}
        <div className="card-glass rounded-2xl p-6 border border-border">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs text-dim uppercase tracking-wider mb-2">Match calculation</div>
              <h1 className="font-display text-3xl font-black text-bright">{other.name}</h1>
              <p className="text-dim text-sm mt-1">Age {other.age}</p>
            </div>
            <div className="text-right">
              <div className={`font-mono text-4xl font-black ${passes ? 'text-teal' : 'text-dim'}`}>
                {Math.round(prob * 100)}%
              </div>
              <div className={`text-xs font-semibold mt-1 ${passes ? 'text-teal' : 'text-muted'}`}>
                {passes ? '✓ Passes 30% threshold' : '✗ Below 30% threshold'}
              </div>
            </div>
          </div>

          {/* Direction toggle */}
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setDirection('me→them')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                direction === 'me→them'
                  ? 'bg-rose/20 border border-rose/40 text-rose'
                  : 'bg-surface border border-border text-dim hover:text-text'
              }`}
            >
              {me.name} → {other.name}
              <div className="text-xs font-normal mt-0.5 opacity-70">P(you like them)</div>
            </button>
            <button
              onClick={() => setDirection('them→me')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                direction === 'them→me'
                  ? 'bg-teal/20 border border-teal/40 text-teal'
                  : 'bg-surface border border-border text-dim hover:text-text'
              }`}
            >
              {other.name} → {me.name}
              <div className="text-xs font-normal mt-0.5 opacity-70">P(they like you)</div>
            </button>
          </div>

          {/* Missing data warning */}
          {!raterRatingOfTarget && (
            <div className="mt-4 bg-amber/10 border border-amber/20 rounded-lg px-3 py-2 text-xs text-amber">
              ⚠ {isMe2Them ? "You haven't rated them yet" : `${other.name} hasn't rated you yet`} — using default values for their direction.
            </div>
          )}
        </div>

        {/* Formula explanation */}
        <div className="card-glass rounded-2xl p-5 border border-border">
          <h2 className="font-display text-lg font-bold text-bright mb-3">How Naive Bayes calculates this</h2>
          <div className="text-xs text-dim leading-relaxed space-y-2">
            <p>
              The model was trained on ~8,000 real speed dates from Columbia University. It learned the average rating values for pairs that matched vs. pairs that didn't — for each of the 21 features.
            </p>
            <p>
              For a new pair, it asks: <span className="text-text">"Does this set of ratings look more like a match or a non-match?"</span>
            </p>
            <div className="bg-surface rounded-lg p-3 font-mono text-xs mt-2 space-y-1">
              <div className="text-muted">// For each feature i, compute Gaussian log-probability:</div>
              <div className="text-rose">log P(feature_i | no match) = Gaussian(value, mean₀ᵢ, var₀ᵢ)</div>
              <div className="text-teal">log P(feature_i | match)    = Gaussian(value, mean₁ᵢ, var₁ᵢ)</div>
              <div className="text-muted mt-2">// Sum across all 21 features + prior:</div>
              <div className="text-dim">log P(no match) = log(0.8353) + Σ log P(featureᵢ | no match)</div>
              <div className="text-dim">log P(match)    = log(0.1647) + Σ log P(featureᵢ | match)</div>
              <div className="text-muted mt-2">// Normalise to get probability:</div>
              <div className="text-amber">P(match) = e^logP(match) / (e^logP(no match) + e^logP(match))</div>
            </div>
            <p className="mt-2">
              Prior probabilities: <span className="text-rose font-mono">P(no match) = 83.5%</span>, <span className="text-teal font-mono">P(match) = 16.5%</span> — reflecting the real match rate in the dataset.
            </p>
          </div>
        </div>

        {/* Prior */}
        <div className="card-glass rounded-2xl p-5 border border-border">
          <h2 className="font-display text-lg font-bold text-bright mb-1">Step 1 — Prior probability</h2>
          <p className="text-xs text-dim mb-4">Before looking at any ratings, what is the base rate of matching?</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-xl p-4">
              <div className="text-xs text-muted mb-1">P(no match) — prior</div>
              <div className="font-mono text-xl font-bold text-rose">83.5%</div>
              <div className="text-xs text-muted mt-1">log = {Math.log(PRIOR[0]).toFixed(3)}</div>
              <div className="text-xs text-dim mt-1">Only 16.5% of speed dates result in a match — model starts pessimistic</div>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="text-xs text-muted mb-1">P(match) — prior</div>
              <div className="font-mono text-xl font-bold text-teal">16.5%</div>
              <div className="text-xs text-muted mt-1">log = {Math.log(PRIOR[1]).toFixed(3)}</div>
              <div className="text-xs text-dim mt-1">The ratings must overcome this prior to push the score above 30%</div>
            </div>
          </div>
        </div>

        {/* Top 5 features */}
        <div className="card-glass rounded-2xl p-5 border border-border">
          <h2 className="font-display text-lg font-bold text-bright mb-1">Step 2 — Top 5 most influential features</h2>
          <p className="text-xs text-dim mb-4">
            Features to the right push toward match. Features to the left push toward no match. Width = strength of influence.
          </p>
          <div className="flex items-center justify-between text-xs text-muted mb-3 px-1">
            <span>← Pushes toward no match</span>
            <span>Pushes toward match →</span>
          </div>
          <div className="space-y-3">
            {topFeatures.map((row, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: GROUP_COLORS[row.group] + '20',
                        color: GROUP_COLORS[row.group],
                        border: `1px solid ${GROUP_COLORS[row.group]}40`,
                      }}
                    >
                      {row.thai}
                    </span>
                    <span className="font-mono text-xs text-dim">{row.value.toFixed(1)}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold ${row.favoursMatch ? 'text-teal' : 'text-rose'}`}>
                      {row.favoursMatch ? '+' : ''}{row.contribution.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted ml-1">log odds</span>
                  </div>
                </div>
                <ContributionBar value={row.contribution} maxAbs={maxAbs} />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>Avg no-match: {row.mean0.toFixed(1)}</span>
                  <span>Avg match: {row.mean1.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All 21 features table */}
        <div className="card-glass rounded-2xl overflow-hidden border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-bright">Step 2 (full) — All 21 features</h2>
            <span className="text-xs text-muted">log P(match) − log P(no match) per feature</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left px-4 py-2.5 text-muted font-normal">Feature</th>
                  <th className="text-right px-3 py-2.5 text-muted font-normal">Your value</th>
                  <th className="text-right px-3 py-2.5 text-muted font-normal">Avg no-match</th>
                  <th className="text-right px-3 py-2.5 text-muted font-normal">Avg match</th>
                  <th className="text-right px-3 py-2.5 text-muted font-normal">Contribution</th>
                  <th className="text-center px-3 py-2.5 text-muted font-normal">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <>
                    <tr key={group} className="border-t border-border/40 bg-surface/30">
                      <td
                        colSpan={6}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: GROUP_COLORS[group] }}
                      >
                        {GROUP_LABELS[group]}
                      </td>
                    </tr>
                    {rows.filter(r => r.group === group).map((row, i) => (
                      <tr key={i} className="border-t border-border/20 hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-text">{row.thai}</div>
                          <div className="text-muted text-[10px]">{row.label}</div>
                        </td>
                        <td className="text-right px-3 py-2.5 font-mono text-text font-bold">
                          {row.value.toFixed(1)}
                        </td>
                        <td className="text-right px-3 py-2.5 font-mono text-rose/80">
                          {row.mean0.toFixed(1)}
                        </td>
                        <td className="text-right px-3 py-2.5 font-mono text-teal/80">
                          {row.mean1.toFixed(1)}
                        </td>
                        <td className="text-right px-3 py-2.5 font-mono font-bold"
                          style={{ color: row.favoursMatch ? '#00e5cc' : '#6b6b99' }}
                        >
                          {row.favoursMatch ? '+' : ''}{row.contribution.toFixed(3)}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            row.favoursMatch
                              ? 'bg-teal/15 text-teal'
                              : 'bg-surface text-dim'
                          }`}>
                            {row.favoursMatch ? '↑ match' : '↓ no match'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Final calculation */}
        <div className="card-glass rounded-2xl p-5 border border-border">
          <h2 className="font-display text-lg font-bold text-bright mb-4">Step 3 — Final score</h2>
          <div className="space-y-3 font-mono text-sm">
            <div className="bg-surface rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">log P(no match) = prior + Σ feature contributions</span>
                <span className="text-rose">{(Math.log(PRIOR[0]) + rows.reduce((s,r)=>s+r.logP0,0)).toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">log P(match) = prior + Σ feature contributions</span>
                <span className="text-teal">{(Math.log(PRIOR[1]) + rows.reduce((s,r)=>s+r.logP1,0)).toFixed(3)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>Apply log-sum-exp trick to normalise →</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim text-xs">P(match) =</span>
                  <span className={`font-bold text-base ${passes ? 'text-teal' : 'text-rose'}`}>
                    {Math.round(prob * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className={`rounded-xl px-4 py-3 text-sm font-semibold text-center ${
              passes
                ? 'bg-teal/15 border border-teal/30 text-teal'
                : 'bg-surface border border-border text-dim'
            }`}>
              {passes
                ? `✓ ${Math.round(prob * 100)}% ≥ 30% — this direction PASSES the match threshold`
                : `✗ ${Math.round(prob * 100)}% < 30% — this direction does NOT pass the match threshold`
              }
            </div>
          </div>
        </div>

        {/* Back */}
        <button
          onClick={() => router.push('/results')}
          className="w-full py-3 border border-border hover:border-rose/30 text-dim hover:text-text rounded-xl text-sm transition-colors"
        >
          ← Back to all results
        </button>

      </div>
    </Layout>
  );
}
