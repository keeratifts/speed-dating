import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ProbBar from '../components/ProbBar';
import type { UserProfile, RatingSet, MatchResult } from '../lib/matchModel';
import { computeAllMatches } from '../lib/matchModel';

type SortKey = 'mutual' | 'iLikeThem' | 'theyLikeMe';

export default function ResultsPage() {
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('mutual');
  const [filter, setFilter] = useState<'all' | 'mutual'>('all');

  useEffect(() => {
    const id = localStorage.getItem('sd_userId');
    if (!id) { router.push('/'); return; }
    setMyId(id);
    loadData(id);
  }, []);

  const loadData = async (myUserId: string) => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, myRatingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/ratings?userId=${myUserId}`),
      ]);
      const allUsers: UserProfile[] = await usersRes.json();
      const myRatings: RatingSet = await myRatingsRes.json();

      const myProfile = allUsers.find(u => u.id === myUserId);
      if (!myProfile) throw new Error('Profile not found');
      setMe(myProfile);

      const others = allUsers.filter(u => u.id !== myUserId);

      // Fetch ratings from all other users
      const otherRatingsArr = await Promise.all(
        others.map(async u => {
          const res = await fetch(`/api/ratings?userId=${u.id}`);
          return { userId: u.id, ratings: (await res.json()) as RatingSet };
        })
      );
      const ratingsOfMe: { [fromId: string]: RatingSet } = {};
      for (const { userId, ratings } of otherRatingsArr) {
        ratingsOfMe[userId] = ratings;
      }

      const results = computeAllMatches(myProfile, others, myRatings, ratingsOfMe);
      setMatches(results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...matches]
    .filter(m => filter === 'all' || (m.pMutual > 0.09 && m.iHaveRated && m.hasRatedMe))
    .sort((a, b) => {
      if (sortKey === 'mutual') return b.pMutual - a.pMutual;
      if (sortKey === 'iLikeThem') return b.pILikeThem - a.pILikeThem;
      return b.pTheyLikeMe - a.pTheyLikeMe;
    });

  const topMatch = sorted[0];
  const mutualCount = matches.filter(m => m.pMutual > 0.09).length;

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
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🌑</div>
          <p className="text-dim">No other participants yet. Share the app!</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Stats overview */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { label: 'People Rated', value: matches.filter(m => m.iHaveRated).length, icon: '♥', color: 'text-rose' },
              { label: 'Rated You', value: matches.filter(m => m.hasRatedMe).length, icon: '◈', color: 'text-teal' },
              { label: 'Potential Matches', value: mutualCount, icon: '✦', color: 'text-amber' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="card-glass rounded-2xl p-4 text-center">
                <div className={`text-2xl font-display font-black ${color}`}>{value}</div>
                <div className="text-xs text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Top match callout */}
          {topMatch && topMatch.iHaveRated && topMatch.hasRatedMe && topMatch.pMutual > 0.05 && (
            <div className="relative overflow-hidden card-glass rounded-2xl p-6 border border-rose/20 glow-rose">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-rose/5 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-purple/5 blur-xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-rose">❤</span>
                  <span className="text-xs text-rose font-medium uppercase tracking-wider">Top Match</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-black text-bright">{topMatch.name}</h3>
                    <p className="text-dim text-sm">Age {topMatch.age}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-3xl font-black text-gradient-rose">
                      {Math.round(topMatch.pMutual * 100)}%
                    </div>
                    <div className="text-xs text-muted">mutual chance</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sort & filter controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Sort by:</span>
            {([
              ['mutual', 'Mutual', 'amber'],
              ['iLikeThem', 'I like them', 'rose'],
              ['theyLikeMe', 'They like me', 'teal'],
            ] as [SortKey, string, string][]).map(([key, label, color]) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortKey === key
                    ? color === 'rose'
                      ? 'bg-rose/20 border border-rose/30 text-rose'
                      : color === 'teal'
                      ? 'bg-teal/20 border border-teal/30 text-teal'
                      : 'bg-amber/20 border border-amber/30 text-amber'
                    : 'bg-surface border border-border text-dim hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${filter === 'all' ? 'bg-surface border border-rose/20 text-text' : 'text-muted hover:text-dim'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('mutual')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${filter === 'mutual' ? 'bg-surface border border-teal/20 text-text' : 'text-muted hover:text-dim'}`}
              >
                Potential Matches
              </button>
            </div>
          </div>

          {/* Match list */}
          <div className="space-y-3">
            {sorted.map((match, idx) => {
              const incomplete = !match.iHaveRated || !match.hasRatedMe;
              return (
                <div
                  key={match.userId}
                  className={`card-glass rounded-2xl p-5 transition-all duration-200 ${
                    incomplete ? 'opacity-60' : 'hover:border-rose/20'
                  }`}
                  style={{
                    animationDelay: `${idx * 50}ms`,
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-rose/10 flex items-center justify-center text-lg font-display font-black text-rose">
                        {match.name[0].toUpperCase()}
                      </div>
                      <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-mono text-muted">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text">{match.name}</div>
                      <div className="text-xs text-muted">Age {match.age}</div>
                    </div>
                    <div className="text-right">
                      {!incomplete ? (
                        <div className="font-mono text-xl font-black text-amber">
                          {Math.round(match.pMutual * 100)}%
                        </div>
                      ) : (
                        <div className="text-xs text-muted text-right">
                          {!match.iHaveRated && <div>You haven't rated them</div>}
                          {!match.hasRatedMe && <div>They haven't rated you</div>}
                        </div>
                      )}
                      {!incomplete && <div className="text-xs text-muted">mutual</div>}
                    </div>
                  </div>

                  {!incomplete ? (
                    <div className="space-y-2.5">
                      <ProbBar label="P(I like them)" value={match.pILikeThem} color="rose" />
                      <ProbBar label="P(they like me)" value={match.pTheyLikeMe} color="teal" />
                      <ProbBar label="P(mutual match)" value={match.pMutual} color="amber" />
                    </div>
                  ) : (
                    <div className="h-1 bg-border rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Model attribution */}
          <div className="card-glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="text-teal mt-0.5">◈</div>
              <div>
                <h4 className="text-sm font-semibold text-text mb-1">About the Model</h4>
                <p className="text-xs text-dim leading-relaxed">
                  Match probabilities are predicted using a Gaussian Naive Bayes classifier trained on the{' '}
                  <a
                    href="https://www.kaggle.com/datasets/annavictoria/speed-dating-experiment"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal hover:underline"
                  >
                    Columbia University Speed Dating Experiment
                  </a>{' '}
                  dataset (2002–2004, ~8,000 speed dates). Features include how you rate each other on
                  attractiveness, sincerity, intelligence, fun, ambition, and shared interests — plus age and
                  your preference weights. A probability ≥30% indicates a predicted match.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => loadData(myId!)}
            className="w-full py-3 border border-border hover:border-rose/30 text-dim hover:text-text rounded-xl text-sm transition-colors"
          >
            ↻ Refresh Results
          </button>
        </div>
      )}
    </Layout>
  );
}
