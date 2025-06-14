import prisma from '../../../lib/prisma';

export default async function handle(req, res) {
  const id = req.query.id as string;
  if (req.method === 'GET') {
    const gschema = await prisma.gschema.findUnique({ where: { id }, include: { events: true, contributor: { select: { email: true, name: true } } } });
    res.json(gschema);
  } else if (req.method === 'PUT') {
    const { name, citation, type, eventcount, active } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (citation !== undefined) data.citation = citation;
    if (type !== undefined) data.type = type;
    if (eventcount !== undefined) data.eventcount = eventcount;
    if (active !== undefined) data.active = active;
    const gschema = await prisma.gschema.update({
      where: { id },
      data,
    });
    res.json(gschema);
  } else if (req.method === 'DELETE') {
    await prisma.gschema.delete({ where: { id } });
    res.json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 