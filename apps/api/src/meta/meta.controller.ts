import { Controller, Get } from '@nestjs/common';
import { MetaService } from './meta.service';

@Controller()
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get()
  getRoot() {
    return this.metaService.getMetadata();
  }
}
