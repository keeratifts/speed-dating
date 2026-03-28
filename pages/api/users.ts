import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllUsers, getUser, saveUser } from '../../lib/kv';
import type { UserProfile } from '../../lib/matchModel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id } = req.query;
    if (id && typeof id === 'string') {
      const user = await getUser(id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(user);
    }
    const users = await getAllUsers();
    return res.json(users);
  }

  if (req.method === 'POST') {
    const user: UserProfile = req.body;
    if (!user?.id || !user?.name) {
      return res.status(400).json({ error: 'Invalid user data' });
    }
    await saveUser(user);
    return res.status(201).json(user);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
