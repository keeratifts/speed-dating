import type { NextApiRequest, NextApiResponse } from 'next';
import { resetAll } from '../../lib/kv';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    await resetAll();
    return res.json({ success: true });
  }

  res.setHeader('Allow', ['DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
