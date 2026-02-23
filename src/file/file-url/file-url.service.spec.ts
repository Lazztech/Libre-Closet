import { Test, TestingModule } from '@nestjs/testing';
import { FileUrlService } from './file-url.service';

describe('FileUrlService', () => {
  let service: FileUrlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileUrlService],
    }).compile();

    service = module.get<FileUrlService>(FileUrlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
