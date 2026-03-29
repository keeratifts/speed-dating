import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import type { UserProfile, RatingSet, MatchResult } from '../lib/matchModel';
import { computeAllMatches } from '../lib/matchModel';

const MATCH_THRESHOLD = 0.30;
type SortKey = 'mutual' | 'iLikeThem' | 'theyLikeMe';

function ThresholdDot({ passes }: { passes: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: passes ? '#00e5cc' : '#3a3a60' }}
    />
  );
}

function MatchVerdict({ match }: { match: MatchResult }) {
  const bothRated  = match.iHaveRated && match.hasRatedMe;
  if (!bothRated) return null;
  const iMatch     = match.pILikeThem  >= MATCH_THRESHOLD;
  const theyMatch  = match.pTheyLikeMe >= MATCH_THRESHOLD;
  const mutual     = iMatch && theyMatch;
  const oneWay     = iMatch || theyMatch;
  if (mutual)  return <span className="inline-flex items-center gap-1.5 bg-teal/15 border border-teal/30 text-teal text-xs font-semibold px-3 py-1 rounded-full">❤ MATCH</span>;
  if (oneWay)  return <span className="inline-flex items-center gap-1.5 bg-amber/10 border border-amber/20 text-amber text-xs font-semibold px-3 py-1 rounded-full">→ {iMatch ? 'You like them' : 'They like you'}</span>;
  return <span className="inline-flex items-center gap-1.5 bg-surface border border-border text-dim text-xs font-medium px-3 py-1 rounded-full">No match</span>;
}

function DirectionBar({ label, value, color, passes }: { label: string; value: number; color: string; passes: boolean }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <ThresholdDot passes={passes} />
        <span className="text-xs text-dim flex-1">{label}</span>
        <span className="font-mono text-xs font-bold" style={{ color }}>{pct}%</span>
        <span className={`text-xs font-medium ${passes ? 'text-teal' : 'text-muted'}`}>
          {passes ? '✓ passed' : '✗ below 30%'}
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="relative h-3">
        <div className="absolute top-0 w-px h-2 bg-dim/40" style={{ left: '30%' }} />
        <span className="absolute top-0.5 text-[9px] text-muted" style={{ left: '30%', transform: 'translateX(-50%)' }}>30%</span>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [myId, setMyId]       = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('mutual');
  const [filter, setFilter]   = useState<'all' | 'match' | 'pending'>('all');

  useEffect(() => {
    const id = localStorage.getItem('sd_userId');
    if (!id) { router.push('/'); return; }
    setMyId(id);
    loadData(id);
  }, []);

  const loadData = async (uid: string) => {
    setLoading(true); setError('');
    try {
      const [usersRes, myRatingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/ratings?userId=${uid}`),
      ]);
      const allUsers: UserProfile[] = await usersRes.json();
      const myRatings: RatingSet    = await myRatingsRes.json();
      const myProfile = allUsers.find(u => u.id === uid);
      if (!myProfile) throw new Error('Profile not found');
      const others = allUsers.filter(u => u.id !== uid);
      const ratingsOfMe: { [fromId: string]: RatingSet } = {};
      await Promise.all(others.map(async u => {
        const r = await fetch(`/api/ratings?userId=${u.id}`);
        ratingsOfMe[u.id] = await r.json();
      }));
      setMatches(computeAllMatches(myProfile, others, myRatings, ratingsOfMe));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const iRatedCount      = matches.filter(m => m.iHaveRated).length;
  const ratedMeCount     = matches.filter(m => m.hasRatedMe).length;
  const iLikeCount       = matches.filter(m => m.iHaveRated && m.pILikeThem >= MATCH_THRESHOLD).length;
  const mutualMatchCount = matches.filter(m => m.iHaveRated && m.hasRatedMe && m.pILikeThem >= MATCH_THRESHOLD && m.pTheyLikeMe >= MATCH_THRESHOLD).length;

  const filtered = matches.filter(m => {
    if (filter === 'match')   return m.iHaveRated && m.hasRatedMe && m.pILikeThem >= MATCH_THRESHOLD && m.pTheyLikeMe >= MATCH_THRESHOLD;
    if (filter === 'pending') return !m.iHaveRated || !m.hasRatedMe;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'mutual') {
      const sa = a.iHaveRated && a.hasRatedMe ? a.pMutual : (a.pILikeThem || a.pTheyLikeMe);
      const sb = b.iHaveRated && b.hasRatedMe ? b.pMutual : (b.pILikeThem || b.pTheyLikeMe);
      return sb - sa;
    }
    if (sortKey === 'iLikeThem') return b.pILikeThem  - a.pILikeThem;
    return b.pTheyLikeMe - a.pTheyLikeMe;
  });

  const topMatch = matches
    .filter(m => m.iHaveRated && m.hasRatedMe && m.pILikeThem >= MATCH_THRESHOLD && m.pTheyLikeMe >= MATCH_THRESHOLD)
    .sort((a, b) => b.pMutual - a.pMutual)[0];

  return (
    <Layout title="Your Matches">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-2 border-rose/30 border-t-rose rounded-full animate-spin" />
          <p className="text-dim text-sm animate-pulse">Crunching the numbers...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-rose">{error}</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16"><p className="text-dim">No other participants yet.</p></div>
      ) : (
        <div className="space-y-6 animate-fade-in">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'You rated',      value: iRatedCount,      sub: `of ${matches.length}`, color: 'text-rose',   bg: 'bg-rose/10 border-rose/20' },
              { label: 'Rated you',      value: ratedMeCount,     sub: `of ${matches.length}`, color: 'text-teal',   bg: 'bg-teal/10 border-teal/20' },
              { label: 'You like',       value: iLikeCount,       sub: 'your side ≥ 30%',      color: 'text-amber',  bg: 'bg-amber/10 border-amber/20' },
              { label: 'Mutual matches', value: mutualMatchCount, sub: 'both sides ≥ 30%',      color: 'text-purple', bg: 'bg-purple/10 border-purple/20' },
            ].map(({ label, value, sub, color, bg }) => (
              <div key={label} className={`card-glass rounded-2xl p-4 border ${bg}`}>
                <div className={`font-display text-3xl font-black ${color}`}>{value}</div>
                <div className="text-xs text-text font-medium mt-0.5">{label}</div>
                <div className="text-xs text-muted">{sub}</div>
              </div>
            ))}
          </div>

          {/* How it works — always visible, concise */}
          <div className="card-glass rounded-xl border border-border px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-teal text-sm mt-0.5">◈</span>
              <div className="text-xs text-dim leading-relaxed">
                <span className="text-text font-medium">How the verdict works: </span>
                Each direction is scored separately (0–100%). A direction <span className="text-teal">passes</span> when its score ≥ 30%.{' '}
                <span className="text-teal font-semibold">MATCH</span> = both directions pass.
                The <span className="text-amber font-semibold">ranking score</span> = A × B — it is only used to sort pairs by strength, not to decide the verdict.
                So a pair can show <span className="text-teal font-semibold">MATCH</span> with a low ranking score if both individual scores are just above 30%.
              </div>
            </div>
          </div>

          {/* Top match */}
          {topMatch && (
            <div className="card-glass rounded-2xl p-6 border border-teal/30">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs text-teal font-medium uppercase tracking-wider mb-2">❤ Top Mutual Match</div>
                  <h3 className="font-display text-2xl font-black text-bright">{topMatch.name}</h3>
                  <p className="text-dim text-sm">Age {topMatch.age}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <span className="text-xs text-dim">You → them</span>
                    <span className="font-mono text-sm font-bold text-rose">{Math.round(topMatch.pILikeThem * 100)}%</span>
                    <ThresholdDot passes={true} />
                  </div>
                  <div className="flex items-center gap-2 justify-end mb-3">
                    <span className="text-xs text-dim">They → you</span>
                    <span className="font-mono text-sm font-bold text-teal">{Math.round(topMatch.pTheyLikeMe * 100)}%</span>
                    <ThresholdDot passes={true} />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted">Ranking score</span>
                    <span className="font-mono text-xl font-black text-amber">{Math.round(topMatch.pMutual * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pending nudge */}
          {iLikeCount > 0 && ratedMeCount < matches.length && (
            <div className="card-glass rounded-xl px-4 py-3 border border-amber/20">
              <p className="text-xs text-amber">
                <span className="font-semibold">Your side passed 30% on {iLikeCount} {iLikeCount === 1 ? 'person' : 'people'}.</span>
                {' '}Waiting for {matches.length - ratedMeCount} more {matches.length - ratedMeCount === 1 ? 'person' : 'people'} to rate you — mutual verdict will appear once both sides have rated.
              </p>
            </div>
          )}

          {/* Sort + filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Sort:</span>
            {([['mutual','Ranking score','amber'],['iLikeThem','I like them','rose'],['theyLikeMe','They like me','teal']] as [SortKey,string,string][]).map(([key,label,color]) => (
              <button key={key} onClick={() => setSortKey(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortKey===key ? color==='rose'?'bg-rose/20 border border-rose/30 text-rose':color==='teal'?'bg-teal/20 border border-teal/30 text-teal':'bg-amber/20 border border-amber/30 text-amber' : 'bg-surface border border-border text-dim hover:text-text'}`}>{label}</button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              {([['all','All'],['match','❤ Matches'],['pending','⏳ Pending']] as [typeof filter,string][]).map(([key,label]) => (
                <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${filter===key?'bg-surface border border-teal/20 text-text font-medium':'text-muted hover:text-dim'}`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {sorted.length === 0 && (
              <div className="text-center py-12 text-dim text-sm card-glass rounded-2xl">
                {filter==='match'?'No mutual matches yet — keep rating!':filter==='pending'?'No pending ratings':'Nothing to show'}
              </div>
            )}

            {sorted.map((match, idx) => {
              const bothRated = match.iHaveRated && match.hasRatedMe;
              const iMatch    = match.pILikeThem  >= MATCH_THRESHOLD;
              const theyMatch = match.pTheyLikeMe >= MATCH_THRESHOLD;
              const isMutual  = bothRated && iMatch && theyMatch;
              const isOneWay  = bothRated && (iMatch || theyMatch) && !isMutual;

              return (
                <div key={match.userId} className={`card-glass rounded-2xl p-5 border transition-all ${isMutual?'border-teal/30':isOneWay?'border-amber/20':'border-border'}`}>

                  {/* Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-display font-black ${isMutual?'bg-teal/20 text-teal':'bg-rose/10 text-rose'}`}>
                        {match.name[0].toUpperCase()}
                      </div>
                      <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-mono text-muted">{idx+1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/match/${match.userId}`}
                          className="font-semibold text-text hover:text-rose transition-colors underline-offset-2 hover:underline"
                          title="See how Naive Bayes calculated this"
                        >
                          {match.name}
                        </Link>
                        <MatchVerdict match={match} />
                      </div>
                      <div className="text-xs text-muted mt-0.5">Age {match.age}</div>
                    </div>
                    {bothRated ? (
                      <div className="text-right flex-shrink-0">
                        <div className={`font-mono text-xl font-black ${isMutual?'text-teal':isOneWay?'text-amber':'text-dim'}`}>
                          {Math.round(match.pMutual * 100)}%
                        </div>
                        <div className="text-xs text-muted">ranking score</div>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-muted space-y-0.5 flex-shrink-0">
                        {!match.iHaveRated && <div className="text-rose/60">You haven't rated them</div>}
                        {!match.hasRatedMe  && <div>Waiting for their rating</div>}
                      </div>
                    )}
                  </div>

                  {/* Bars */}
                  {bothRated ? (
                    <div className="space-y-1">
                      <DirectionBar label={`You → ${match.name}`}   value={match.pILikeThem}  color="#ff4d8d" passes={iMatch} />
                      <DirectionBar label={`${match.name} → You`}   value={match.pTheyLikeMe} color="#00e5cc" passes={theyMatch} />

                      {/* Ranking score row — visually separated */}
                      <div className="pt-3 mt-1 border-t border-border/40">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber flex-shrink-0" />
                          <span className="text-xs text-dim flex-1">
                            Ranking score
                            <span className="text-muted ml-1.5 font-mono">
                              {Math.round(match.pILikeThem*100)}% × {Math.round(match.pTheyLikeMe*100)}% = {Math.round(match.pMutual*100)}%
                            </span>
                          </span>
                          <span className="text-xs text-muted italic">for sorting only</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width:`${Math.round(match.pMutual*100)}%`, background:'#ffb347' }} />
                        </div>
                      </div>

                      {/* Plain-English verdict summary */}
                      <div className={`text-xs rounded-lg px-3 py-2 mt-2 leading-relaxed ${isMutual?'bg-teal/10 border border-teal/20 text-teal':isOneWay?'bg-amber/10 border border-amber/20 text-amber':'bg-surface border border-border text-dim'}`}>
                        {isMutual
                          ? `✓ Both sides scored ≥ 30% → MATCH. Ranking score ${Math.round(match.pMutual*100)}% is just used to sort matches against each other.`
                          : isOneWay
                          ? iMatch
                            ? `Your side passed (${Math.round(match.pILikeThem*100)}%) but ${match.name}'s side didn't (${Math.round(match.pTheyLikeMe*100)}%) → one-way interest only.`
                            : `${match.name}'s side passed (${Math.round(match.pTheyLikeMe*100)}%) but your side didn't (${Math.round(match.pILikeThem*100)}%) → one-way interest only.`
                          : `Neither side reached 30% → no match.`
                        }
                      </div>
                    </div>

                  ) : match.iHaveRated ? (
                    <div className="space-y-2">
                      <DirectionBar label={`You → ${match.name}`} value={match.pILikeThem} color="#ff4d8d" passes={iMatch} />
                      <div className="flex items-center gap-2 text-xs text-muted mt-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-border flex-shrink-0" />
                        <span>{match.name} → You: waiting for their rating...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-1 bg-border rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Model note */}
          <div className="card-glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="text-teal mt-0.5">◈</div>
              <p className="text-xs text-dim leading-relaxed">
                <span className="text-text font-medium">About the model: </span>
                Scores come from a Gaussian Naive Bayes classifier trained on the{' '}
                <a href="https://www.kaggle.com/datasets/annavictoria/speed-dating-experiment" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
                  Columbia University Speed Dating dataset
                </a>{' '}
                (~8,000 real speed dates, 2002–2004). A score ≥ 30% means the rating pattern closely resembles real matched pairs. Naive Bayes tends to produce polarised scores — the ranking is reliable even when absolute numbers look extreme.
              </p>
            </div>
          </div>

          <button onClick={() => loadData(myId!)} className="w-full py-3 border border-border hover:border-rose/30 text-dim hover:text-text rounded-xl text-sm transition-colors">
            ↻ Refresh Results
          </button>

        </div>
      )}
    </Layout>
  );
}
