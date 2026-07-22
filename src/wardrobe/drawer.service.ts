import { EntityRepository, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Drawer } from '../dal/entity/drawer.entity';
import { Garment } from '../dal/entity/garment.entity';
import { User } from '../dal/entity/user.entity';
import { CreateDrawerDto } from './dto/create-drawer.dto';
import { UpdateDrawerDto } from './dto/update-drawer.dto';

@Injectable()
export class DrawerService {
  private readonly logger = new Logger(DrawerService.name);

  constructor(
    @InjectRepository(Drawer)
    private readonly drawerRepository: EntityRepository<Drawer>,
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async findAll(userId?: number): Promise<Drawer[]> {
    if (userId != null) {
      return this.drawerRepository.find(
        { owner: { id: userId } },
        { populate: ['garments', 'garments.photo'], orderBy: { name: 'ASC' } },
      );
    }
    // AUTH_ENABLED=false: only return drawers that belong to no user
    return this.drawerRepository.find(
      { owner: null },
      { populate: ['garments', 'garments.photo'], orderBy: { name: 'ASC' } },
    );
  }

  async findOne(id: number, userId?: number): Promise<Drawer> {
    const drawer = await this.drawerRepository.findOne(id, {
      populate: ['garments', 'garments.photo'],
    });
    if (!drawer) throw new NotFoundException('Drawer not found');
    if (userId != null) {
      if (drawer.owner?.id !== userId) throw new ForbiddenException();
    } else {
      if (drawer.owner != null) throw new ForbiddenException();
    }
    return drawer;
  }

  async create(dto: CreateDrawerDto, userId?: number): Promise<Drawer> {
    const drawer = this.drawerRepository.create({
      name: dto.name,
      notes: dto.notes,
    });

    if (dto.garmentIds?.length) {
      const garments = await this.garmentRepository.find({
        id: { $in: dto.garmentIds },
      });
      drawer.garments.set(garments);
    }

    if (userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      drawer.owner = user as any;
    }

    await this.drawerRepository.getEntityManager().persistAndFlush(drawer);
    return drawer;
  }

  async update(
    id: number,
    dto: UpdateDrawerDto,
    userId?: number,
  ): Promise<Drawer> {
    const drawer = await this.findOne(id, userId);

    wrap(drawer).assign({
      name: dto.name ?? drawer.name,
      notes: dto.notes ?? drawer.notes,
    });

    if (dto.garmentIds !== undefined) {
      const garments = await this.garmentRepository.find({
        id: { $in: dto.garmentIds },
      });
      drawer.garments.set(garments);
    }

    await this.drawerRepository.getEntityManager().flush();
    return drawer;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const drawer = await this.findOne(id, userId);
    await this.drawerRepository.getEntityManager().removeAndFlush(drawer);
  }
}
