import type { NextApiRequest, NextApiResponse } from 'next';
import { getRatings, saveRatings } from '../../lib/kv';
import type { RatingSet } from '../../lib/matchModel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId required' });
    }
    const ratings = await getRatings(userId);
    return res.json(ratings);
  }

  if (req.method === 'POST') {
    const { userId, ratings }: { userId: string; ratings: RatingSet } = req.body;
    if (!userId || !ratings) {
      return res.status(400).json({ error: 'userId and ratings required' });
    }
    // Merge with existing ratings
    const existing = await getRatings(userId);
    const merged = { ...existing, ...ratings };
    await saveRatings(userId, merged);
    return res.json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
