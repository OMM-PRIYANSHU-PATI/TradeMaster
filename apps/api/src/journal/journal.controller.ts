import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { JournalService } from './journal.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Controller('api/v1/journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() createJournalDto: CreateJournalDto) {
    return this.journalService.create(user.id, createJournalDto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }, @Query() query: Record<string, string | string[]>) {
    return this.journalService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.journalService.findOne(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() updateJournalDto: UpdateJournalDto) {
    return this.journalService.update(user.id, id, updateJournalDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.journalService.remove(user.id, id);
  }
}
