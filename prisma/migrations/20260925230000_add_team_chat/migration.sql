-- CreateEnum
CREATE TYPE "TeamConversationType" AS ENUM ('CHANNEL', 'DIRECT_MESSAGE', 'GROUP');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT;

-- CreateTable
CREATE TABLE "TeamConversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "TeamConversationType" NOT NULL DEFAULT 'CHANNEL',
    "name" TEXT,
    "description" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamConversationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamConversation_workspaceId_idx" ON "TeamConversation"("workspaceId");

-- CreateIndex
CREATE INDEX "TeamConversation_workspaceId_type_idx" ON "TeamConversation"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "TeamConversation_projectId_idx" ON "TeamConversation"("projectId");

-- CreateIndex
CREATE INDEX "TeamConversation_lastMessageAt_idx" ON "TeamConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "TeamConversationMember_userId_idx" ON "TeamConversationMember"("userId");

-- CreateIndex
CREATE INDEX "TeamConversationMember_conversationId_idx" ON "TeamConversationMember"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamConversationMember_conversationId_userId_key" ON "TeamConversationMember"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "TeamMessage_conversationId_createdAt_idx" ON "TeamMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamMessage_senderId_idx" ON "TeamMessage"("senderId");

-- CreateIndex
CREATE INDEX "TeamMessage_createdAt_idx" ON "TeamMessage"("createdAt");

-- CreateIndex
CREATE INDEX "TeamMessageReaction_messageId_idx" ON "TeamMessageReaction"("messageId");

-- CreateIndex
CREATE INDEX "TeamMessageReaction_userId_idx" ON "TeamMessageReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMessageReaction_messageId_userId_emoji_key" ON "TeamMessageReaction"("messageId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "TeamConversation" ADD CONSTRAINT "TeamConversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamConversation" ADD CONSTRAINT "TeamConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamConversation" ADD CONSTRAINT "TeamConversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamConversationMember" ADD CONSTRAINT "TeamConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TeamConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamConversationMember" ADD CONSTRAINT "TeamConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TeamConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessageReaction" ADD CONSTRAINT "TeamMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TeamMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessageReaction" ADD CONSTRAINT "TeamMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
