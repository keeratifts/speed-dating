import { kv } from '@vercel/kv';
import type { UserProfile, RatingSet } from './matchModel';

export async function getAllUsers(): Promise<UserProfile[]> {
  const keys = await kv.keys('user:*');
  if (!keys.length) return [];
  const users = await Promise.all(keys.map(k => kv.get<UserProfile>(k)));
  return users.filter(Boolean) as UserProfile[];
}

export async function getUser(id: string): Promise<UserProfile | null> {
  return kv.get<UserProfile>(`user:${id}`);
}

export async function saveUser(user: UserProfile): Promise<void> {
  await kv.set(`user:${user.id}`, user);
}

export async function getRatings(userId: string): Promise<RatingSet> {
  return (await kv.get<RatingSet>(`ratings:${userId}`)) ?? {};
}

export async function saveRatings(userId: string, ratings: RatingSet): Promise<void> {
  await kv.set(`ratings:${userId}`, ratings);
}

export async function resetAll(): Promise<void> {
  const keys = await kv.keys('*');
  if (keys.length) {
    await Promise.all(keys.map(k => kv.del(k)));
  }
}
