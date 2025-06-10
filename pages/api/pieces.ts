import prisma from '../../lib/prisma';

export default async function handle(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { title, composer, scoreUrl, email } = req.body;
  if (!title || !composer || !scoreUrl || !email) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  try {
    const piece = await prisma.piece.create({
      data: {
        title,
        composer,
        scoreUrl,
        contributor: { connect: { email } },
      },
    });
    res.status(201).json(piece);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 