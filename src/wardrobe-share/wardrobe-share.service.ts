import { EntityRepository } from '@mikro-orm/core';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  WardrobeShare,
  SharePermission,
} from '../dal/entity/wardrobe-share.entity';
import { User } from '../dal/entity/user.entity';
import { CreateShareDto } from './dto/create-share.dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class WardrobeShareService {
  private readonly logger = new Logger(WardrobeShareService.name);

  constructor(
    @InjectRepository(WardrobeShare)
    private readonly shareRepository: EntityRepository<WardrobeShare>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async createShare(
    grantorId: number,
    dto: CreateShareDto,
  ): Promise<WardrobeShare> {
    if (dto.granteeEmail) {
      const grantee = await this.userRepository.findOne({
        email: dto.granteeEmail,
      });
      if (!grantee) {
        throw new NotFoundException(
          'No account found with that email address.',
        );
      }
      if (grantee.id === grantorId) {
        throw new ForbiddenException(
          'You cannot share your wardrobe with yourself.',
        );
      }

      const existing = await this.shareRepository.findOne({
        grantor: { id: grantorId },
        grantee: { id: grantee.id },
      });
      if (existing) {
        if (existing.acceptedAt) {
          throw new ForbiddenException(
            'You have already shared your wardrobe with this user.',
          );
        }
        existing.permission = dto.permission;
        await this.shareRepository.getEntityManager().flush();
        return existing;
      }

      const share = this.shareRepository.create({
        grantor: grantorId,
        grantee: grantee.id,
        permission: dto.permission,
        inviteToken: randomUUID(),
      } as unknown as WardrobeShare);
      await this.shareRepository.getEntityManager().persistAndFlush(share);
      return share;
    }

    const share = this.shareRepository.create({
      grantor: grantorId,
      grantee: null as any,
      permission: dto.permission,
      inviteToken: randomUUID(),
    } as unknown as WardrobeShare);
    await this.shareRepository.getEntityManager().persistAndFlush(share);
    return share;
  }

  async createInviteLink(
    grantorId: number,
    permission: SharePermission,
  ): Promise<WardrobeShare> {
    const share = this.shareRepository.create({
      grantor: grantorId,
      grantee: null as any,
      permission,
      inviteToken: randomUUID(),
    } as unknown as WardrobeShare);
    await this.shareRepository.getEntityManager().persistAndFlush(share);
    return share;
  }

  async acceptInvite(token: string, granteeId: number): Promise<WardrobeShare> {
    const share = await this.shareRepository.findOne(
      { inviteToken: token },
      { populate: ['grantor', 'grantee'] },
    );
    if (!share) {
      throw new NotFoundException(
        'Invite not found or has already been accepted.',
      );
    }
    if (share.acceptedAt) {
      throw new ForbiddenException('This invite has already been accepted.');
    }
    if (share.grantor.id === granteeId) {
      throw new ForbiddenException('You cannot accept your own invite.');
    }

    if (share.grantee && share.grantee.id !== granteeId) {
      throw new ForbiddenException(
        'This invite was sent to a different email address.',
      );
    }

    share.grantee = granteeId as any;
    share.acceptedAt = new Date();
    share.inviteToken = null as any;
    await this.shareRepository.getEntityManager().flush();
    return share;
  }

  async getOutboundShares(grantorId: number): Promise<WardrobeShare[]> {
    return this.shareRepository.find(
      { grantor: { id: grantorId } },
      { populate: ['grantee', 'grantor'] },
    );
  }

  async getInboundShares(granteeId: number): Promise<WardrobeShare[]> {
    return this.shareRepository.find(
      { grantee: { id: granteeId }, acceptedAt: { $ne: null } },
      { populate: ['grantor', 'grantee'] },
    );
  }

  async getPendingShares(granteeId: number): Promise<WardrobeShare[]> {
    return this.shareRepository.find(
      { grantee: { id: granteeId }, acceptedAt: null },
      { populate: ['grantor', 'grantee'] },
    );
  }

  async removeShare(shareId: number, userId: number): Promise<void> {
    const share = await this.shareRepository.findOne({ id: shareId });
    if (!share) {
      throw new NotFoundException('Share not found.');
    }
    if (share.grantor.id !== userId && share.grantee?.id !== userId) {
      throw new ForbiddenException('You can only remove your own shares.');
    }
    await this.shareRepository.getEntityManager().removeAndFlush(share);
  }

  async getAcceptedGrantorIds(userId: number): Promise<number[]> {
    const shares = await this.shareRepository.find({
      grantee: { id: userId },
      acceptedAt: { $ne: null },
    });
    return shares.map((s) => s.grantor.id);
  }

  async getSharePermission(
    userId: number,
    grantorId: number,
  ): Promise<SharePermission | null> {
    const share = await this.shareRepository.findOne({
      grantor: { id: grantorId },
      grantee: { id: userId },
      acceptedAt: { $ne: null },
    });
    return share?.permission ?? null;
  }

  async canView(userId: number, grantorId: number): Promise<boolean> {
    const permission = await this.getSharePermission(userId, grantorId);
    return permission !== null;
  }

  async canManage(userId: number, grantorId: number): Promise<boolean> {
    const permission = await this.getSharePermission(userId, grantorId);
    return permission === SharePermission.MANAGE;
  }

  async findInviteByToken(token: string): Promise<WardrobeShare | null> {
    return this.shareRepository.findOne(
      { inviteToken: token },
      { populate: ['grantor', 'grantee'] },
    );
  }

  async declineInvite(token: string, userId: number): Promise<void> {
    const share = await this.shareRepository.findOne(
      { inviteToken: token },
      { populate: ['grantee'] },
    );
    if (!share) {
      throw new NotFoundException('Invite not found.');
    }
    if (share.grantee && share.grantee.id !== userId) {
      throw new ForbiddenException('This invite was not sent to you.');
    }
    await this.shareRepository.getEntityManager().removeAndFlush(share);
  }
}
