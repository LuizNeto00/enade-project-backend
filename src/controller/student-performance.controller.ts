import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { FilterPerformanceRequest } from '../request/student-performance/filter-performance.request';
import { handleControllerError } from '../common/errors/handle-controller-error';
import { StudentPerformanceService } from '../service/student-performance.service';

@Controller('student/performance')
@UseGuards(AuthTokenGuard)
export class StudentPerformanceController {
  constructor(private readonly service: StudentPerformanceService) {}

  @Get()
  async getSummary(
    @Query() filters: FilterPerformanceRequest,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.service.getSummary(authenticatedRequest.user, filters);
    } catch (error) {
      handleControllerError(error, 'StudentPerformanceController.getSummary');
    }
  }

  @Get('attempts')
  async getAttempts(
    @Query() filters: FilterPerformanceRequest,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.service.getAttempts(authenticatedRequest.user, filters);
    } catch (error) {
      handleControllerError(error, 'StudentPerformanceController.getAttempts');
    }
  }

  @Get('attempts/:attemptId')
  async getAttempt(
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.service.getAttempt(
        authenticatedRequest.user,
        attemptId,
      );
    } catch (error) {
      handleControllerError(error, 'StudentPerformanceController.getAttempt');
    }
  }
}
