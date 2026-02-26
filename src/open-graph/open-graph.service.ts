import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { FileUrlService } from '../file/file-url/file-url.service';
import { InjectRepository } from '@mikro-orm/nestjs';
import { File } from '../dal/entity/file.entity';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/core';

export interface OpenGraphTagValues {
  ogUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

@Injectable()
export class OpenGraphService {
  constructor(
    private readonly fileUrlService: FileUrlService,
    @InjectRepository(File)
    private readonly fileRepository: EntityRepository<File>,
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    @InjectRepository(Outfit)
    private readonly outfitRepository: EntityRepository<Outfit>,
    private readonly em: EntityManager,
  ) {}

  public async getShareableTagValues(
    shareableId: string,
    type: string,
    req: Request,
  ) {
    if (type == 'file') {
      const file = await this.fileRepository.findOne(
        { shareableId },
        {
          populate: ['createdBy'],
        },
      );
      const createdBy = await file?.createdBy?.load();
      return {
        ogUrl: `${req.protocol}://${req.get('host')}/file/${shareableId}`,
        ogTitle: file?.fileName,
        ogDescription: `From ${createdBy?.email}`,
        ogImage: this.fileUrlService.getWatermarkedFileUrl(shareableId, req),
        file,
        createdBy,
      };
    }

    if (type == 'garment') {
      const garment = await this.garmentRepository.findOne(
        { shareableId },
        { populate: ['owner', 'photo'] },
      );
      const createdBy = await garment?.owner?.load();
      const ogImage = garment?.photo
        ? this.fileUrlService.getWatermarkedFileUrl(
            garment.photo.shareableId!,
            req,
          )
        : undefined;
      return {
        ogUrl: `${req.protocol}://${req.get('host')}/share?shareableId=${shareableId}&type=garment`,
        ogTitle: garment?.name,
        ogDescription: `From ${createdBy?.email}`,
        ogImage,
        garment,
        createdBy,
      };
    }

    if (type == 'outfit') {
      const outfit = await this.outfitRepository.findOne(
        { shareableId },
        { populate: ['owner', 'garments', 'garments.photo'] },
      );
      const createdBy = await outfit?.owner?.load();
      const firstPhotoGarment = outfit?.garments
        .getItems()
        .find((g) => g.photo);
      const ogImage = firstPhotoGarment?.photo
        ? this.fileUrlService.getWatermarkedFileUrl(
            firstPhotoGarment.photo.shareableId!,
            req,
          )
        : undefined;
      return {
        ogUrl: `${req.protocol}://${req.get('host')}/share?shareableId=${shareableId}&type=outfit`,
        ogTitle: outfit?.name,
        ogDescription: `From ${createdBy?.email}`,
        ogImage,
        outfit,
        createdBy,
      };
    }
  }
}
