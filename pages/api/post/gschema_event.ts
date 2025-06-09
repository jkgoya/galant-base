import prisma from '../../../lib/prisma';

export default async function handle(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { gschemaId, events } = req.body;
  if (!gschemaId || !Array.isArray(events)) {
    res.status(400).json({ error: 'Missing gschemaId or events' });
    return;
  }
  try {
    const createdEvents = await prisma.gschema_event.createMany({
      data: events.map(ev => ({
        gschemaId: gschemaId,
        index: ev.index,
        type: ev.type,
        value: ev.value,
      })),
    });
    res.status(201).json(createdEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 