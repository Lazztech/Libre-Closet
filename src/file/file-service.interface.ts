import { MultipartFileStream } from '@proventuslabs/nestjs-multipart-form';
import { Observable } from 'rxjs';
import { File } from 'src/dal/entity/file.entity';
import { Readable } from 'stream';

export interface FileServiceInterface {
  /**
   * @param file FileUpload with readableStream & supporting information on the upload
   * @param userId user responsible for the file
   * @returns imageFileName as it's stored from the upload
   */
  storeImageFromFileUpload(
    upload$: Observable<MultipartFileStream>,
    userId: any,
  ): Promise<File>;
  delete(fileName: string): Promise<void>;
  deleteById(fileId: any, userId: any): Promise<any>;
  get(fileName: string): Promise<Readable | undefined>;
  getByShareableId(shareableId: string): Promise<Readable | undefined>;
}
