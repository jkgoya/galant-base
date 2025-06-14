import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { options as authOptions } from '../auth/[...nextauth]';

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const pieceId = String(req.query.id);
  const piece = await prisma.piece.findUnique({
    where: { id: pieceId },
    include: {
      contributor: {
        select: {
          email: true
        }
      }
    }
  });

  if (!piece || piece.contributor?.email !== session.user.email) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  if (req.method === 'PUT') {
    const { title, composer, meiData } = req.body;
    if (!title || !composer) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    try {
      const updatedPiece = await prisma.piece.update({
        where: { id: pieceId },
        data: {
          title,
          composer,
          meiData: meiData || piece.meiData,
        },
      });
      res.status(200).json(updatedPiece);
    } catch (error) {
      console.error('Failed to update piece:', error);
      res.status(500).json({ error: 'Failed to update piece', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 