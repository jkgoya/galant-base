import prisma from "../../../lib/prisma";

export default async function handle(req, res) {
  if (req.method === "GET") {
    // List all music sources
    const sources = await prisma.musicSource.findMany({
      orderBy: { name: "asc" },
    });
    res.status(200).json(sources);
  } else if (req.method === "POST") {
    // Add a new music source (expand validation as needed)
    const { name, description, baseUrl, indexFile, composer, format, active } =
      req.body;
    if (!name || !baseUrl || !composer || !format) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    try {
      const source = await prisma.musicSource.create({
        data: {
          name,
          description,
          baseUrl,
          indexFile,
          composer,
          format,
          active: active ?? true,
        },
      });
      res.status(201).json(source);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
