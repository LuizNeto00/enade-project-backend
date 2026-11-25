import { Controller, Get } from '@nestjs/common';
import { handleControllerError } from './common/errors/handle-controller-error';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    try {
      return this.appService.getHello();
    } catch (error) {
      handleControllerError(error, 'AppController.getHello');
    }
  }
}
