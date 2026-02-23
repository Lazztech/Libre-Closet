import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test, TestingModule } from '@nestjs/testing';
import { FileUrlService } from '../file/file-url/file-url.service';
import { OpenGraphService } from './open-graph.service';

describe('OpenGraphService', () => {
  let service: OpenGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenGraphService,
        FileUrlService,
        {
          provide: getRepositoryToken(File),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            persistAndFlush: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            query: jest.fn(),
            // you can mock other functions inside
            // the entity manager object, my case only needed query method
          },
        },
      ],
    }).compile();

    service = module.get<OpenGraphService>(OpenGraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
