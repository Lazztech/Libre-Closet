import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class FileUrlService {
  getFileUrl(fileName: string, req: Request): string {
    if (fileName) {
      return `${req.protocol}://${req.get('host')}/file/${fileName}`;
    } else {
      return fileName;
    }
  }

  getWatermarkedFileUrl(shareableId: string, req: Request): string {
    return `${req.protocol}://${req.get('host')}/file/watermark/${shareableId}`;
  }
}
