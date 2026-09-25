import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from 'database';

@Injectable()
export class InstrumentsService {
  async getInstruments(): Promise<any> {
    return prisma.instrument.findMany();
  }

  async getInstrument(id: string): Promise<any> {
    const instrument = await prisma.instrument.findUnique({ where: { id } });
    if (!instrument) throw new NotFoundException('Instrument not found');
    return instrument;
  }
}
