-- CreateTable
CREATE TABLE "Piece" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT NOT NULL,
    "contributorId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "meiUrl" TEXT,
    "meiData" TEXT,
    "contributorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "format" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Piece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gschema" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contributorId" TEXT,
    "citation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "eventcount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 1000,

    CONSTRAINT "Gschema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gschema_event" (
    "id" TEXT NOT NULL,
    "gschemaId" TEXT,
    "index" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Gschema_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gschema_Piece" (
    "id" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "contributorId" TEXT,
    "pieceId" TEXT,
    "gschemaId" TEXT,
    "measureend" INTEGER,
    "measurestart" INTEGER,

    CONSTRAINT "Gschema_Piece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gschema_event_Piece" (
    "id" TEXT NOT NULL,
    "Gschema_PieceId" TEXT,
    "piece_location" TEXT,
    "Gschema_eventId" TEXT NOT NULL,

    CONSTRAINT "Gschema_event_Piece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_provider_account_id_key" ON "Account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_token_key" ON "Session"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gschema" ADD CONSTRAINT "Gschema_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gschema_event" ADD CONSTRAINT "Gschema_event_gschemaId_fkey" FOREIGN KEY ("gschemaId") REFERENCES "Gschema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gschema_Piece" ADD CONSTRAINT "Gschema_Piece_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gschema_Piece" ADD CONSTRAINT "Gschema_Piece_gschemaId_fkey" FOREIGN KEY ("gschemaId") REFERENCES "Gschema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gschema_Piece" ADD CONSTRAINT "Gschema_Piece_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gschema_event_Piece" ADD CONSTRAINT "Gschema_event_Piece_Gschema_PieceId_fkey" FOREIGN KEY ("Gschema_PieceId") REFERENCES "Gschema_Piece"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gschema_event_Piece" ADD CONSTRAINT "Gschema_event_Piece_Gschema_eventId_fkey" FOREIGN KEY ("Gschema_eventId") REFERENCES "Gschema_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

