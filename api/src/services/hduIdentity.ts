import { Prisma } from '@prisma/client';

const GLOBAL_SEQUENCE_ID = 'GLOBAL';

export interface HduIdentity {
  hduNumber: number;
  displayId: string;
  resolution: 'RESTORED_SOURCE' | 'ALLOCATED_NEW' | 'SOURCE_CONFLICT';
}

/**
 * Extracts an identifier that came from the external work-item title/body.
 * It is metadata only; it never becomes the SaaS canonical displayId.
 */
export function extractSourceHduDisplayId(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const match = value?.match(/(?:^|[\[\s(])HDU\s*[-_:]?\s*(\d+)\b/i);
    if (match) return `HDU-${String(Number(match[1])).padStart(3, '0')}`;
  }
  return null;
}

export function parseHduNumber(displayId: string | null | undefined): number | null {
  const match = displayId?.match(/^HDU-(\d+)$/i);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/**
 * Reserves the next SaaS-wide HDU number atomically.
 *
 * The sequence is independent of GitHub issue numbers and of any HDU number
 * found in an external title. The row lock acquired by the upsert prevents two
 * concurrent imports/creations from receiving the same number. The max check
 * also repairs the sequence if an old repair script or legacy data advanced
 * UserStory.hduNumber without advancing HduSequence.
 *
 * Must be called inside the same Prisma transaction that creates the HDU.
 */
export async function allocateHduIdentity(tx: Prisma.TransactionClient): Promise<HduIdentity> {
  return reserveHduIdentity(tx);
}

/**
 * Recovers a source canonical number when it is still free. If another SaaS
 * item already owns it, the allocator returns the next free SaaS number and
 * the caller can persist the conflict as source metadata.
 */
export async function reserveHduIdentity(
  tx: Prisma.TransactionClient,
  preferredNumber?: number | null,
): Promise<HduIdentity> {
  const rows = await tx.$queryRaw<Array<{ nextNumber: number }>>(Prisma.sql`
    INSERT INTO "HduSequence" ("id", "nextNumber", "createdAt", "updatedAt")
    VALUES (
      ${GLOBAL_SEQUENCE_ID},
      COALESCE((SELECT MAX("hduNumber") + 1 FROM "UserStory"), 1),
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE SET
      "nextNumber" = GREATEST(
        "HduSequence"."nextNumber",
        COALESCE((SELECT MAX("hduNumber") + 1 FROM "UserStory"), 1)
      ),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "HduSequence"."id" = ${GLOBAL_SEQUENCE_ID}
    RETURNING "nextNumber"
  `);

  const sequenceNumber = Number(rows[0]?.nextNumber);
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('No se pudo reservar un identificador HDU válido.');
  }

  // The first query normalizes the sequence and serializes callers through
  // the row-level upsert lock. Reserve the source number only if it is free;
  // otherwise continue from the next SaaS number. The unique constraint is a
  // final safety net for unexpected legacy data.
  const candidate = preferredNumber && preferredNumber > 0
    ? preferredNumber
    : sequenceNumber;
  const existing = preferredNumber && preferredNumber > 0
    ? await tx.userStory.findUnique({ where: { hduNumber: preferredNumber }, select: { id: true } })
    : null;
  const hduNumber = existing ? sequenceNumber : candidate;

  await tx.$executeRaw(Prisma.sql`
    UPDATE "HduSequence"
    SET "nextNumber" = GREATEST("nextNumber", ${hduNumber + 1}),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${GLOBAL_SEQUENCE_ID}
  `);

  return {
    hduNumber,
    displayId: `HDU-${String(hduNumber).padStart(3, '0')}`,
    resolution: preferredNumber && preferredNumber > 0
      ? existing ? 'SOURCE_CONFLICT' : 'RESTORED_SOURCE'
      : 'ALLOCATED_NEW',
  };
}
