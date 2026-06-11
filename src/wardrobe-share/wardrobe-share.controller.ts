import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { User } from '../auth/user.decorator';
import { WardrobeShareService } from './wardrobe-share.service';
import { SharePermission } from '../dal/entity/wardrobe-share.entity';
import type { FastifyReply, FastifyRequest } from 'fastify';

@UseGuards(ConditionalAuthGuard)
@Controller('wardrobe-share')
export class WardrobeShareController {
  private readonly logger = new Logger(WardrobeShareController.name);

  constructor(private readonly shareService: WardrobeShareService) {}

  @UseGuards(AuthGuard)
  @Get('manage')
  @Render('wardrobe-share/manage')
  async manage(@User() payload: Payload, @Req() req: FastifyRequest) {
    const [outbound, inbound, pending] = await Promise.all([
      this.shareService.getOutboundShares(payload.userId),
      this.shareService.getInboundShares(payload.userId),
      this.shareService.getPendingShares(payload.userId),
    ]);

    return {
      outbound,
      inbound,
      pending,
      baseUrl: `${req.protocol}://${req.hostname}`,
    };
  }

  @UseGuards(AuthGuard)
  @Post('create-invite-link')
  async createInviteLink(
    @User() payload: Payload,
    @Body() body: { permission: SharePermission },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const share = await this.shareService.createInviteLink(
      payload.userId,
      body.permission || SharePermission.VIEW,
    );
    const inviteUrl = `${req.protocol}://${req.hostname}/wardrobe-share/invite/${share.inviteToken}`;

    if (req.headers['hx-request']) {
      return reply.view('wardrobe-share/partials/invite-link-result', {
        layout: false,
        inviteUrl,
      });
    }

    return reply.redirect('/wardrobe-share/manage', 302);
  }

  @UseGuards(AuthGuard)
  @Post(':id/remove')
  async removeShare(
    @User() payload: Payload,
    @Param('id') shareId: number,
    @Res() reply: FastifyReply,
  ) {
    try {
      await this.shareService.removeShare(shareId, payload.userId);
    } catch (e) {
      this.logger.warn(e);
    }
    return reply.redirect('/wardrobe-share/manage', 302);
  }

  @UseGuards(ConditionalAuthGuard)
  @Get('invite/:token')
  @Render('wardrobe-share/invite')
  async viewInvite(
    @Param('token') token: string,
    @User() payload: Payload | undefined,
  ) {
    const share = await this.shareService.findInviteByToken(token);
    if (!share) {
      return { error: true, message: 'Invite not found or has expired.' };
    }

    const permissionLabel =
      share.permission === SharePermission.VIEW ? 'View only' : 'Can edit';

    return {
      share,
      permissionLabel,
      grantorName:
        share.grantor.unwrap().firstName ||
        share.grantor.unwrap().email ||
        'A user',
      token,
      isLoggedIn: !!payload,
    };
  }

  @UseGuards(AuthGuard)
  @Post('invite/:token/accept')
  async acceptInvite(
    @User() payload: Payload,
    @Param('token') token: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      await this.shareService.acceptInvite(token, payload.userId);
    } catch (e) {
      this.logger.warn(e);
    }
    return reply.redirect('/wardrobe-share/manage', 302);
  }

  @UseGuards(AuthGuard)
  @Post('invite/:token/decline')
  async declineInvite(
    @User() payload: Payload,
    @Param('token') token: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      await this.shareService.declineInvite(token, payload.userId);
    } catch (e) {
      this.logger.warn(e);
    }
    return reply.redirect('/wardrobe-share/manage', 302);
  }
}
