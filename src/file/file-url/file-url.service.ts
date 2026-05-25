import { Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Injectable()
export class FileUrlService {
  getFileUrl(fileName: string, req: FastifyRequest): string {
    if (fileName) {
      return `${req.protocol}://${req.host}/file/${fileName}`;
    } else {
      return fileName;
    }
  }

  getWatermarkedFileUrl(shareableId: string, req: FastifyRequest): string {
    return `${req.protocol}://${req.host}/file/watermark/${shareableId}`;
  }
}
