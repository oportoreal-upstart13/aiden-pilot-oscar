/*
  Warnings:

  - You are about to drop the `TicketSummary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TicketSummary" DROP CONSTRAINT "TicketSummary_ticketId_fkey";

-- DropTable
DROP TABLE "TicketSummary";
