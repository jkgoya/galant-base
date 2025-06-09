import prisma from '../../../../lib/prisma';

export default async function handle(req, res) {
  const { name, citation, type, events, email } = req.body;
  const result = await prisma.gschema.create({
    data: {
      name: name,
      citation: citation,
      type: type,
      eventcount: events,
      contributor: { connect: { email: email } },
    },
  });
  res.json(result);
} 