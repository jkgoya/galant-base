-- CreateTable
CREATE TABLE "MusicSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "indexFile" TEXT NOT NULL,
    "composer" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicSource_pkey" PRIMARY KEY ("id")
);
