import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { handleControllerError } from '../common/errors/handle-controller-error';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { TeacherDashboardRequest } from '../request/teacher-dashboard/teacher-dashboard.request';
import { TeacherDashboardService } from '../service/teacher-dashboard.service';

@Controller('teacher/dashboard')
@UseGuards(AuthTokenGuard)
export class TeacherDashboardController {
  constructor(private readonly service: TeacherDashboardService) {}

  @Get()
  async getDashboard(
    @Query() request: TeacherDashboardRequest,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.service.getDashboard(
        authenticatedRequest.user,
        request,
      );
    } catch (error) {
      handleControllerError(error, 'TeacherDashboardController.getDashboard');
    }
  }
}
