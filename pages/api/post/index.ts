//import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';

// POST /api/post
// Required fields in body: title
// Optional fields in body: content
export default async function handle(req, res) {
  const { title, content, email } = req.body;
  //console.log("HERE IS THE BODY");
  //console.log(req.body);

  //const session = await getSession({ req });
  //console.log("HERE IS THE SESSION");
  //console.log(session);
  const result = await prisma.post.create({
    data: {
      title: title,
      content: content,
      author: { connect: { email: email } },
    },
  });
  res.json(result);
}