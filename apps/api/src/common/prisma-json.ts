import { Prisma } from '@prisma/client';

/** Type bridge for JSON values assembled from validated application objects. */
export function asPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
