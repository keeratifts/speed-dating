import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ProbBar from '../components/ProbBar';
import type { UserProfile, RatingSet, MatchResult } from '../lib/matchModel';
import { computeAllMatches } from '../lib/matchModel';

// ── Single source of truth for match threshold ─────────────────────────────
// Matches matchModel.ts THRESHOLD = 0.30
// A pair is a "match" when BOTH pILikeThem >= 0.30 AND pTheyLikeMe >= 0.30
// pMutual = pILikeThem * pTheyLikeMe is shown as a combined confidence score
const MATCH_THRESHOLD = 0.30;

type SortKey = 'mutual' | 'iLikeThem' | 'theyLikeMe';

function MatchVerdict({ match }: { match: MatchResult }) {
  const bothRated = match.iHaveRated && match.hasRatedMe;
  if (!bothRated) return null;

  const iMatch = match.pILikeThem >= MATCH_THRESHOLD;
  const theyMatch = match.pTheyLikeMe >= MATCH_THRESHOLD;
  const mutual = iMatch && theyMatch;
  const oneWay = iMatch || theyMatch;

  if (mutual) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-teal/15 border border-teal/30 text-teal text-xs font-semibold px-3 py-1 rounded-full">
        <span>❤</span> MATCH
      </span>
    );
  }
  if (oneWay) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-amber/10 border border-amber/20 text-amber text-xs font-semibold px-3 py-1 rounded-full">
        <span>→</span> {iMatch ? 'You like them' : 'They like you'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-surface border border-border text-dim text-xs font-medium px-3 py-1 rounded-full">
      No match
    </span>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('mutual');
  const [filter, setFilter] = useState<'all' | 'match' | 'pending'>('all');

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

  // ── Derived counts using consistent MATCH_THRESHOLD ──────────────────────
  const iRatedCount      = matches.filter(m => m.iHaveRated).length;
  const ratedMeCount     = matches.filter(m => m.hasRatedMe).length;
  const bothRatedCount   = matches.filter(m => m.iHaveRated && m.hasRatedMe).length;

  // Match = both rated AND both directions >= threshold
  const mutualMatchCount = matches.filter(
    m => m.iHaveRated && m.hasRatedMe &&
         m.pILikeThem >= MATCH_THRESHOLD &&
         m.pTheyLikeMe >= MATCH_THRESHOLD
  ).length;

  // One-way: I like them but they may not have rated yet
  const iLikeCount = matches.filter(
    m => m.iHaveRated && m.pILikeThem >= MATCH_THRESHOLD
  ).length;

  // ── Sort & filter ─────────────────────────────────────────────────────────
  const filtered = matches.filter(m => {
    if (filter === 'match') {
      return m.iHaveRated && m.hasRatedMe &&
             m.pILikeThem >= MATCH_THRESHOLD &&
             m.pTheyLikeMe >= MATCH_THRESHOLD;
    }
    if (filter === 'pending') {
      return !m.iHaveRated || !m.hasRatedMe;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'mutual') {
      // Sort by mutual score — but for incomplete pairs use max of available
      const scoreA = a.iHaveRated && a.hasRatedMe ? a.pMutual : (a.pILikeThem || a.pTheyLikeMe);
      const scoreB = b.iHaveRated && b.hasRatedMe ? b.pMutual : (b.pILikeThem || b.pTheyLikeMe);
      return scoreB - scoreA;
    }
    if (sortKey === 'iLikeThem') return b.pILikeThem - a.pILikeThem;
    return b.pTheyLikeMe - a.pTheyLikeMe;
  });

  // Top match = best mutual score among fully-rated pairs
  const topMatch = matches
    .filter(m => m.iHaveRated && m.hasRatedMe && m.pMutual > 0)
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
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🌑</div>
          <p className="text-dim">No other participants yet. Share the app!</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">

          {/* ── Stats overview ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'You rated', value: iRatedCount, sub: `of ${matches.length}`, color: 'text-rose', bg: 'bg-rose/10 border-rose/20' },
              { label: 'Rated you', value: ratedMeCount, sub: `of ${matches.length}`, color: 'text-teal', bg: 'bg-teal/10 border-teal/20' },
              { label: 'You like (≥30%)', value: iLikeCount, sub: 'one-way', color: 'text-amber', bg: 'bg-amber/10 border-amber/20' },
              { label: 'Mutual matches', value: mutualMatchCount, sub: 'both ≥30%', color: 'text-purple', bg: 'bg-purple/10 border-purple/20' },
            ].map(({ label, value, sub, color, bg }) => (
              <div key={label} className={`card-glass rounded-2xl p-4 border ${bg}`}>
                <div className={`font-display text-3xl font-black ${color}`}>{value}</div>
                <div className="text-xs text-text font-medium mt-0.5">{label}</div>
                <div className="text-xs text-muted">{sub}</div>
              </div>
            ))}
          </div>

          {/* ── Threshold explanation ───────────────────────────────────── */}
          <div className="card-glass rounded-xl px-4 py-3 border border-border flex items-start gap-3">
            <span className="text-teal mt-0.5 text-sm">◈</span>
            <p className="text-xs text-dim leading-relaxed">
              <span className="text-text font-medium">How matching works: </span>
              Each direction is predicted independently. A score <span className="text-teal font-mono">≥ 30%</span> in
              both directions = <span className="text-teal font-semibold">Mutual Match</span>. Scores below 30% in
              either direction = No Match. Scores reflect similarity to real match patterns in the Columbia dataset —
              not literal probabilities.
            </p>
          </div>

          {/* ── Top match callout ───────────────────────────────────────── */}
          {topMatch && topMatch.pILikeThem >= MATCH_THRESHOLD && topMatch.pTheyLikeMe >= MATCH_THRESHOLD && (
            <div className="relative overflow-hidden card-glass rounded-2xl p-6 border border-teal/30">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-teal text-xs font-medium uppercase tracking-wider">❤ Top Mutual Match</span>
                  </div>
                  <h3 className="font-display text-2xl font-black text-bright">{topMatch.name}</h3>
                  <p className="text-dim text-sm">Age {topMatch.age}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-3xl font-black text-teal">
                    {Math.round(topMatch.pMutual * 100)}%
                  </div>
                  <div className="text-xs text-muted">mutual score</div>
                  <div className="text-xs text-teal mt-1 font-medium">Both sides ≥ 30%</div>
                </div>
              </div>
            </div>
          )}

          {/* ── If I like someone but they haven't rated yet ────────────── */}
          {iLikeCount > 0 && ratedMeCount < matches.length && (
            <div className="card-glass rounded-xl px-4 py-3 border border-amber/20">
              <p className="text-xs text-amber">
                <span className="font-semibold">You scored ≥30% on {iLikeCount} {iLikeCount === 1 ? 'person' : 'people'}.</span>
                {' '}Waiting for {matches.length - ratedMeCount} {matches.length - ratedMeCount === 1 ? 'person' : 'people'} to rate you back to see if it's mutual.
              </p>
            </div>
          )}

          {/* ── Sort & filter controls ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Sort:</span>
            {([
              ['mutual', 'Mutual score', 'amber'],
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
            <div className="ml-auto flex items-center gap-1.5 flex-wrap">
              {([
                ['all', 'All'],
                ['match', '❤ Matches'],
                ['pending', '⏳ Pending'],
              ] as [typeof filter, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    filter === key
                      ? 'bg-surface border border-teal/20 text-text font-medium'
                      : 'text-muted hover:text-dim'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Match list ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            {sorted.length === 0 && (
              <div className="text-center py-12 text-dim text-sm card-glass rounded-2xl">
                {filter === 'match'
                  ? 'No mutual matches yet — keep rating!'
                  : filter === 'pending'
                  ? 'No pending ratings'
                  : 'Nothing to show'}
              </div>
            )}

            {sorted.map((match, idx) => {
              const bothRated = match.iHaveRated && match.hasRatedMe;
              const iMatch = match.pILikeThem >= MATCH_THRESHOLD;
              const theyMatch = match.pTheyLikeMe >= MATCH_THRESHOLD;
              const isMutual = bothRated && iMatch && theyMatch;
              const isOneWay = bothRated && (iMatch || theyMatch) && !isMutual;

              return (
                <div
                  key={match.userId}
                  className={`card-glass rounded-2xl p-5 transition-all duration-200 border ${
                    isMutual
                      ? 'border-teal/30'
                      : isOneWay
                      ? 'border-amber/20'
                      : 'border-border'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-display font-black ${
                        isMutual ? 'bg-teal/20 text-teal' : 'bg-rose/10 text-rose'
                      }`}>
                        {match.name[0].toUpperCase()}
                      </div>
                      <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-mono text-muted">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text">{match.name}</span>
                        <MatchVerdict match={match} />
                      </div>
                      <div className="text-xs text-muted mt-0.5">Age {match.age}</div>
                    </div>

                    {/* Mutual score — only show when both have rated */}
                    {bothRated ? (
                      <div className="text-right flex-shrink-0">
                        <div className={`font-mono text-xl font-black ${
                          isMutual ? 'text-teal' : isOneWay ? 'text-amber' : 'text-dim'
                        }`}>
                          {Math.round(match.pMutual * 100)}%
                        </div>
                        <div className="text-xs text-muted">mutual</div>
                      </div>
                    ) : (
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-muted space-y-0.5">
                          {!match.iHaveRated && (
                            <div className="text-rose/60">You haven't rated them</div>
                          )}
                          {!match.hasRatedMe && (
                            <div className="text-dim">Waiting for their rating</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Probability bars */}
                  {bothRated ? (
                    <div className="space-y-2.5">
                      {/* My direction */}
                      <div>
                        <ProbBar
                          label={`You → ${match.name}  ${match.pILikeThem >= MATCH_THRESHOLD ? '✓ ≥30%' : '✗ <30%'}`}
                          value={match.pILikeThem}
                          color="rose"
                        />
                      </div>
                      {/* Their direction */}
                      <div>
                        <ProbBar
                          label={`${match.name} → You  ${match.pTheyLikeMe >= MATCH_THRESHOLD ? '✓ ≥30%' : '✗ <30%'}`}
                          value={match.pTheyLikeMe}
                          color="teal"
                        />
                      </div>
                      {/* Mutual */}
                      <ProbBar
                        label="Mutual score (combined)"
                        value={match.pMutual}
                        color="amber"
                      />
                    </div>
                  ) : match.iHaveRated ? (
                    /* I have rated them — show my direction only */
                    <div className="space-y-2.5">
                      <ProbBar
                        label={`You → ${match.name}  ${match.pILikeThem >= MATCH_THRESHOLD ? '✓ ≥30%' : '✗ <30%'}`}
                        value={match.pILikeThem}
                        color="rose"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 flex-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full w-0 bg-teal rounded-full" />
                        </div>
                        <span className="text-xs text-muted">
                          {match.name} → You: waiting...
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Haven't rated them yet */
                    <div className="h-1 bg-border rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Model note ──────────────────────────────────────────────── */}
          <div className="card-glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="text-teal mt-0.5">◈</div>
              <div>
                <h4 className="text-sm font-semibold text-text mb-1">About the predictions</h4>
                <p className="text-xs text-dim leading-relaxed">
                  Scores are predicted by a Gaussian Naive Bayes model trained on the{' '}
                  <a
                    href="https://www.kaggle.com/datasets/annavictoria/speed-dating-experiment"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal hover:underline"
                  >
                    Columbia University Speed Dating dataset
                  </a>{' '}
                  (~8,000 real speed dates, 2002–2004). A score ≥ 30% means the rating pattern
                  resembles real matches in the training data. Naive Bayes tends to produce extreme
                  scores — the ranking between pairs is reliable even when numbers look dramatic.
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
