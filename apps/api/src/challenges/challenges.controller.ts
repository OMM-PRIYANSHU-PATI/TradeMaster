import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/challenge.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Challenge, Achievement } from 'database';

export interface ChallengeParticipantResponse {
  id: string;
  userId: string;
  challengeId: string;
  status: string;
  joinedAt: Date;
  completedAt: Date | null;
}

export interface ProgressResponse {
  status: string;
  currentReturn: number;
  targetReturn: number;
  achievements?: Achievement[];
}

export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  avatarUrl: string | null;
  joinedAt: Date;
  completedAt: Date | null;
  status: string;
}

@UseGuards(AuthGuard)
@Controller('api/v1/challenges')
export class ChallengesController {
  constructor(private challengesService: ChallengesService) {}

  @Get()
  async list(): Promise<Challenge[]> {
    return this.challengesService.listPublished();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateChallengeDto): Promise<Challenge> {
    return this.challengesService.createChallenge(dto);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<Challenge | null> {
    return this.challengesService.getChallenge(id);
  }

  @Post(':id/join')
  async join(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<ChallengeParticipantResponse> {
    return this.challengesService.joinChallenge(user.id, id);
  }

  @Get(':id/progress')
  async progress(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<ProgressResponse> {
    return this.challengesService.checkProgress(user.id, id);
  }

  @Get(':id/leaderboard')
  async leaderboard(@Param('id') id: string): Promise<LeaderboardEntry[]> {
    return this.challengesService.getLeaderboard(id);
  }
}

@UseGuards(AuthGuard)
@Controller('api/v1/skills')
export class SkillsController {
  constructor(private challengesService: ChallengesService) {}

  @Get('achievements')
  async getAchievements(@CurrentUser() user: { id: string }): Promise<Achievement[]> {
    return this.challengesService.getUserAchievements(user.id);
  }
}
