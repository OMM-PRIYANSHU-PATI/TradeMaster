import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';

type JournalEntry = Prisma.JournalEntryGetPayload<{}>;

@Injectable()
export class JournalContextService {
  buildContext(journals: JournalEntry[]): string {
    return JSON.stringify(
      journals.map((j) => ({
        id: j.id,
        title: j.title,
        notes: j.notes,
        entryReason: j.entryReason,
        exitReason: j.exitReason,
        setup: j.setup,
        emotion: j.emotion,
        confidence: j.confidence,
        mistakes: j.mistakes,
        ruleAdherence: j.ruleAdherence,
        reviewType: j.reviewType,
        createdAt: j.createdAt,
      })),
    );
  }
}
