import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test, TestingModule } from '@nestjs/testing';
import { File } from '../dal/entity/file.entity';
import { FileUrlService } from '../file/file-url/file-url.service';
import { OpenGraphController } from './open-graph.controller';
import { OpenGraphService } from './open-graph.service';

describe('OpenGraphController', () => {
  let controller: OpenGraphController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenGraphController],
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

    controller = module.get<OpenGraphController>(OpenGraphController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
