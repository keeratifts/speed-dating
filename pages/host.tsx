import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import type { UserProfile, RatingSet, MatchResult } from '../lib/matchModel';
import { computeAllMatches, THRESHOLD } from '../lib/matchModel';

export default function HostPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ratings, setRatings] = useState<{ [userId: string]: RatingSet }>({});
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/users');
      const allUsers: UserProfile[] = await res.json();
      setUsers(allUsers.sort((a, b) => a.createdAt - b.createdAt));

      // Fetch rating counts for each user
      const ratingsMap: { [userId: string]: RatingSet } = {};
      await Promise.all(
        allUsers.map(async u => {
          const r = await fetch(`/api/ratings?userId=${u.id}`);
          ratingsMap[u.id] = await r.json();
        })
      );
      setRatings(ratingsMap);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('This will permanently delete ALL users, ratings, and data. Are you sure?')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'DELETE' });
      if (res.ok) {
        setUsers([]);
        setRatings({});
        setResetDone(true);
        setTimeout(() => setResetDone(false), 4000);
      }
    } finally {
      setResetting(false);
    }
  };

  const totalRatings = Object.values(ratings).reduce(
    (sum, r) => sum + Object.keys(r).length,
    0
  );
  const maxPossibleRatings = users.length * (users.length - 1);
  const completionPct =
    maxPossibleRatings > 0 ? Math.round((totalRatings / maxPossibleRatings) * 100) : 0;

  const selectedUser = users.find(u => u.id === selectedUserId) ?? null;
  const selectedUserMatches: MatchResult[] = selectedUser
    ? computeAllMatches(
        selectedUser,
        users.filter(u => u.id !== selectedUser.id),
        ratings[selectedUser.id] ?? {},
        ratings
      ).sort((a, b) => b.pMutual - a.pMutual)
    : [];

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-amber/10 border border-amber/20 rounded-full px-4 py-1.5 mb-4">
          <span className="text-amber text-xs">⚙</span>
          <span className="text-xs text-amber font-medium tracking-wide uppercase">Host Dashboard</span>
        </div>
        <h1 className="font-display text-4xl font-black text-bright">Event Control</h1>
        <p className="text-dim text-sm mt-1">Manage your speed dating event in real time.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 animate-slide-up">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Participants', value: users.length, icon: '♥', color: 'text-rose', bg: 'bg-rose/10 border-rose/20' },
              { label: 'Total Ratings', value: totalRatings, icon: '◈', color: 'text-teal', bg: 'bg-teal/10 border-teal/20' },
              { label: 'Max Possible', value: maxPossibleRatings, icon: '✦', color: 'text-amber', bg: 'bg-amber/10 border-amber/20' },
              { label: 'Completion', value: `${completionPct}%`, icon: '▲', color: 'text-purple', bg: 'bg-purple/10 border-purple/20' },
            ].map(({ label, value, icon, color, bg }) => (
              <div key={label} className={`card-glass rounded-2xl p-4 border ${bg}`}>
                <div className={`text-xs font-medium mb-1 ${color} flex items-center gap-1`}>
                  <span>{icon}</span> {label}
                </div>
                <div className={`font-display text-2xl font-black ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Completion bar */}
          {maxPossibleRatings > 0 && (
            <div className="card-glass rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-text">Rating Completion</h3>
                <span className="font-mono text-sm text-purple font-bold">{completionPct}%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose to-purple rounded-full transition-all duration-700"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="text-xs text-muted mt-2">
                {totalRatings} of {maxPossibleRatings} possible ratings submitted
              </p>
            </div>
          )}

          {/* Participants table */}
          <div className="card-glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display text-lg font-bold text-bright">
                Registered Participants
              </h2>
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-dim hover:text-text border border-border hover:border-rose/30 px-3 py-1.5 rounded-lg transition-all"
              >
                <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-12 text-dim text-sm">
                No participants registered yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user, idx) => {
                  const userRatings = ratings[user.id] ?? {};
                  const ratedCount = Object.keys(userRatings).length;
                  const others = users.length - 1;
                  const pct = others > 0 ? Math.round((ratedCount / others) * 100) : 0;

                  return (
                    <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface/50 transition-colors">
                      {/* Index */}
                      <span className="w-6 text-xs font-mono text-muted text-center flex-shrink-0">
                        {idx + 1}
                      </span>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-rose/15 flex items-center justify-center text-sm font-display font-black text-rose flex-shrink-0">
                        {user.name[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text text-sm">{user.name}</span>
                          <span className="text-xs text-muted">Age {user.age}</span>
                        </div>
                        <div className="text-xs text-muted font-mono mt-0.5 truncate">
                          {user.id.slice(0, 16)}…
                        </div>
                      </div>

                      {/* Rating progress */}
                      <div className="flex-shrink-0 text-right hidden sm:block">
                        <div className="text-xs text-dim mb-1">
                          Rated <span className="text-teal font-mono font-bold">{ratedCount}/{others}</span>
                        </div>
                        <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Self-rating snapshot */}
                      <div className="flex-shrink-0 hidden lg:flex items-center gap-1">
                        {(['attr', 'sinc', 'intel', 'fun', 'amb', 'shar'] as const).map(k => (
                          <div
                            key={k}
                            title={k}
                            className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold"
                            style={{
                              background: `rgba(255,77,141,${(user[k] / 10) * 0.3})`,
                              color: user[k] >= 7 ? '#ff4d8d' : '#6b6b99',
                              border: '1px solid rgba(255,77,141,0.15)',
                            }}
                          >
                            {user[k]}
                          </div>
                        ))}
                      </div>

                      {/* Joined time */}
                      <div className="flex-shrink-0 text-right hidden md:block">
                        <span className="text-xs text-muted">
                          {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* View results button */}
                      <button
                        onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          selectedUserId === user.id
                            ? 'bg-amber/20 border-amber/40 text-amber font-semibold'
                            : 'border-border text-dim hover:text-text hover:border-amber/30'
                        }`}
                      >
                        {selectedUserId === user.id ? '▲ Hide' : '▼ Results'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Individual Results Panel */}
          {selectedUser && (
            <div className="card-glass rounded-2xl overflow-hidden border border-amber/20 animate-fade-in">
              <div className="px-5 py-4 border-b border-border bg-amber/5 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-bright flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-amber/20 flex items-center justify-center text-amber text-sm font-black">
                      {selectedUser.name[0].toUpperCase()}
                    </span>
                    {selectedUser.name}'s Results
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Match predictions ranked by mutual probability
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="text-dim hover:text-text text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Summary stats */}
              {(() => {
                const mutual = selectedUserMatches.filter(m => m.isMutualMatch).length;
                const iLike = selectedUserMatches.filter(m => m.pILikeThem >= THRESHOLD).length;
                const theyLike = selectedUserMatches.filter(m => m.pTheyLikeMe >= THRESHOLD).length;
                return (
                  <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                    {[
                      { label: 'Mutual Matches', value: mutual, color: 'text-rose' },
                      { label: 'They Like', value: iLike, color: 'text-teal' },
                      { label: 'Liked By', value: theyLike, color: 'text-purple' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="px-5 py-3 text-center">
                        <div className={`font-display text-2xl font-black ${color}`}>{value}</div>
                        <div className="text-xs text-muted mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Match table */}
              {selectedUserMatches.length === 0 ? (
                <div className="text-center py-8 text-dim text-sm">
                  Not enough ratings yet to compute matches.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {/* Header */}
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-3 px-5 py-2 text-xs text-muted font-medium">
                    <span className="w-6 text-center">#</span>
                    <span>I Like Them</span>
                    <span>They Like Me</span>
                    <span>Mutual</span>
                    <span className="w-20 text-center">Status</span>
                  </div>
                  {selectedUserMatches.map((m, idx) => {
                    const pctI = Math.round(m.pILikeThem * 100);
                    const pctThey = Math.round(m.pTheyLikeMe * 100);
                    const pctMutual = Math.round(m.pMutual * 100);
                    return (
                      <div
                        key={m.userId}
                        className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-3 px-5 py-3 items-center transition-colors ${
                          m.isMutualMatch ? 'bg-rose/5' : 'hover:bg-surface/30'
                        }`}
                      >
                        {/* Rank + Name */}
                        <div className="w-6 text-center">
                          <span className="text-xs font-mono text-muted">{idx + 1}</span>
                        </div>

                        {/* I like them */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-text">{m.name}</span>
                            <span className={`text-xs font-mono ${m.iHaveRated ? 'text-teal' : 'text-muted'}`}>
                              {m.iHaveRated ? `${pctI}%` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-border rounded-full overflow-hidden w-full">
                            {m.iHaveRated && (
                              <div
                                className={`h-full rounded-full transition-all ${pctI >= THRESHOLD * 100 ? 'bg-teal' : 'bg-border-bright'}`}
                                style={{ width: `${pctI}%` }}
                              />
                            )}
                          </div>
                        </div>

                        {/* They like me */}
                        <div>
                          <div className="flex items-center justify-end mb-1">
                            <span className={`text-xs font-mono ${m.hasRatedMe ? 'text-purple' : 'text-muted'}`}>
                              {m.hasRatedMe ? `${pctThey}%` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-border rounded-full overflow-hidden w-full">
                            {m.hasRatedMe && (
                              <div
                                className={`h-full rounded-full transition-all ${pctThey >= THRESHOLD * 100 ? 'bg-purple' : 'bg-border-bright'}`}
                                style={{ width: `${pctThey}%` }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Mutual */}
                        <div>
                          <div className="flex items-center justify-end mb-1">
                            <span className={`text-xs font-mono font-bold ${m.isMutualMatch ? 'text-rose' : 'text-dim'}`}>
                              {m.iHaveRated && m.hasRatedMe ? `${pctMutual}%` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-border rounded-full overflow-hidden w-full">
                            {m.iHaveRated && m.hasRatedMe && (
                              <div
                                className={`h-full rounded-full transition-all ${m.isMutualMatch ? 'bg-rose' : 'bg-border-bright'}`}
                                style={{ width: `${pctMutual}%` }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="w-20 text-center">
                          {!m.iHaveRated && !m.hasRatedMe ? (
                            <span className="text-xs text-muted">pending</span>
                          ) : m.isMutualMatch ? (
                            <span className="inline-block text-xs bg-rose/15 text-rose border border-rose/30 rounded-full px-2 py-0.5 font-semibold">
                              ♥ Match
                            </span>
                          ) : m.iHaveRated && m.hasRatedMe ? (
                            <span className="text-xs text-dim">no match</span>
                          ) : (
                            <span className="text-xs text-muted">partial</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rating matrix */}
          {users.length > 1 && users.length <= 12 && (
            <div className="card-glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-display text-lg font-bold text-bright">Rating Matrix</h2>
                <p className="text-xs text-muted mt-0.5">Row = rater, Column = rated. ✓ = submitted</p>
              </div>
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left text-muted pb-2 pr-3 font-normal min-w-[80px]">↓ rates →</th>
                      {users.map(u => (
                        <th key={u.id} className="text-center pb-2 px-1 font-normal text-dim min-w-[36px]">
                          <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center mx-auto text-text font-bold">
                            {u.name[0].toUpperCase()}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(rater => (
                      <tr key={rater.id} className="border-t border-border/40">
                        <td className="py-1.5 pr-3 text-dim truncate max-w-[80px]">
                          {rater.name.split(' ')[0]}
                        </td>
                        {users.map(ratee => {
                          const isSelf = rater.id === ratee.id;
                          const hasRated = !isSelf && !!ratings[rater.id]?.[ratee.id];
                          return (
                            <td key={ratee.id} className="text-center py-1.5 px-1">
                              {isSelf ? (
                                <span className="text-border">—</span>
                              ) : hasRated ? (
                                <span className="text-teal">✓</span>
                              ) : (
                                <span className="text-border text-xs">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Self-ratings summary */}
          {users.length > 0 && (
            <div className="card-glass rounded-2xl p-5">
              <h2 className="font-display text-lg font-bold text-bright mb-4">Self-Rating Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(['attr', 'sinc', 'intel', 'fun', 'amb', 'shar'] as const).map(attr => {
                  const vals = users.map(u => u[attr]);
                  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                  const labels: Record<string, string> = {
                    attr: 'Attractiveness', sinc: 'Sincerity', intel: 'Intelligence',
                    fun: 'Fun', amb: 'Ambition', shar: 'Shared Int.',
                  };
                  return (
                    <div key={attr} className="bg-surface rounded-xl p-3">
                      <div className="text-xs text-muted mb-1">{labels[attr]}</div>
                      <div className="text-lg font-mono font-bold text-rose">{avg.toFixed(1)}</div>
                      <div className="text-xs text-muted">avg / 10</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reset section */}
          <div className="card-glass rounded-2xl p-6 border border-rose/10">
            <h2 className="font-display text-lg font-bold text-bright mb-1">Danger Zone</h2>
            <p className="text-dim text-sm mb-5">
              Resetting clears all users, ratings, and data from the database. This cannot be undone.
            </p>

            {resetDone && (
              <div className="mb-4 bg-teal/10 border border-teal/30 rounded-xl px-4 py-3 text-teal text-sm">
                ✓ All data has been reset successfully.
              </div>
            )}

            <button
              onClick={handleReset}
              disabled={resetting || users.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-rose/10 hover:bg-rose/20 disabled:opacity-40 border border-rose/30 text-rose rounded-xl font-semibold text-sm transition-all duration-200 hover:glow-rose"
            >
              <span>{resetting ? '⏳' : '⚠'}</span>
              {resetting ? 'Resetting...' : `Reset All Data (${users.length} users)`}
            </button>
          </div>

          {/* Sharing tip */}
          <div className="rounded-2xl border border-dashed border-border p-5">
            <h3 className="text-sm font-medium text-text mb-2">📎 Share with participants</h3>
            <div className="bg-surface rounded-lg px-3 py-2 font-mono text-xs text-dim break-all">
              {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}
            </div>
            <p className="text-xs text-muted mt-2">
              Participants register at <span className="text-text">/</span>, rate others at{' '}
              <span className="text-text">/rate</span>, and see results at{' '}
              <span className="text-text">/results</span>.
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}