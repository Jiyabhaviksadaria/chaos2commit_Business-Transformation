-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "title" TEXT NOT NULL DEFAULT 'New chat',
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ChatSession_userId_kind_updatedAt_idx" ON "ChatSession"("userId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");
