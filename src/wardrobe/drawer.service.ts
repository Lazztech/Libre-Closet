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

  private static readonly PREVIEW_LIMIT = 6;

  async findAll(userId?: number): Promise<Drawer[]> {
    // Preview thumbnails are fetched separately (findPreviewGarments) so this
    // list doesn't have to populate every garment in every drawer just to
    // render the drawers index.
    const where = userId != null ? { owner: { id: userId } } : { owner: null };
    return this.drawerRepository.find(where, { orderBy: { name: 'ASC' } });
  }

  async findPreviewGarments(
    drawerId: number,
    limit = DrawerService.PREVIEW_LIMIT,
  ): Promise<{ items: Garment[]; total: number }> {
    const [items, total] = await this.garmentRepository.findAndCount(
      { drawers: { id: drawerId } },
      { populate: ['photo'], orderBy: { id: 'DESC' }, limit },
    );
    return { items, total };
  }

  private checkAccess(
    drawer: Drawer | null,
    userId?: number,
  ): asserts drawer is Drawer {
    if (!drawer) throw new NotFoundException('Drawer not found');
    if (userId != null) {
      if (drawer.owner?.id !== userId) throw new ForbiddenException();
    } else {
      if (drawer.owner != null) throw new ForbiddenException();
    }
  }

  /** Drawer metadata (name/notes/owner) without populating its garments collection. */
  async findOneMeta(id: number, userId?: number): Promise<Drawer> {
    const drawer = await this.drawerRepository.findOne(id);
    this.checkAccess(drawer, userId);
    return drawer;
  }

  async findOne(id: number, userId?: number): Promise<Drawer> {
    const drawer = await this.drawerRepository.findOne(id, {
      populate: ['garments', 'garments.photo'],
    });
    this.checkAccess(drawer, userId);
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
