import prisma from '../../lib/prisma';
import { put } from '@vercel/blob';
import fetch from 'node-fetch';
// @ts-ignore
import verovio from 'verovio';

export default async function handle(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { title, composer, scoreUrl, scoreFormat, email } = req.body;
  if (!title || !composer || !scoreUrl || !scoreFormat || !email) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  let meiUrl = null;

  try {
    // Download the file from scoreUrl
    const fileRes = await fetch(scoreUrl);
    if (!fileRes.ok) throw new Error('Could not fetch score file');
    const fileBuffer = await fileRes.arrayBuffer();
    let meiData: string | null = null;

    if (scoreFormat === 'mei') {
      meiData = Buffer.from(fileBuffer).toString('utf-8');
    } else if (['krn', 'musicxml', 'musedata'].includes(scoreFormat)) {
      // Convert to MEI using Verovio
      // @ts-ignore
      const tk = new verovio.toolkit();
      tk.setOptions({ });
      tk.loadData(Buffer.from(fileBuffer).toString('utf-8'), { inputFrom: scoreFormat });
      meiData = tk.exportMei();
    }

    if (meiData) {
      // Upload to Vercel Blob
      const blob = await put(
        `pieces/${title.replace(/\\s+/g, '_')}_${Date.now()}.mei`,
        Buffer.from(meiData, 'utf-8'),
        { access: 'public' }
      );
      meiUrl = blob.url;
    }

    const piece = await prisma.piece.create({
      data: {
        title,
        composer,
        scoreUrl,
        scoreFormat,
        meiUrl,
        contributor: { connect: { email } },
      },
    });
    res.status(201).json(piece);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 