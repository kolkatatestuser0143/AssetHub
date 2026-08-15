import { BadRequestException, Controller, Delete, Get, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetDocumentsService } from './asset-documents.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

@Controller('assets/:assetId/documents')
@UseGuards(TenantContextGuard, RbacGuard)
export class AssetDocumentsController {
  constructor(private readonly documents: AssetDocumentsService) {}

  @Get()
  @RequirePermission('asset:read')
  list(@Param('assetId') assetId: string, @Req() req: any) {
    return this.documents.list(req.authContext, assetId);
  }

  @Post()
  @RequirePermission('asset:write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_BYTES },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_TYPES.has(file.mimetype)) {
        callback(new BadRequestException('Unsupported document type'), false);
        return;
      }
      callback(null, true);
    },
  }))
  upload(@Param('assetId') assetId: string, @UploadedFile() file: any, @Query('documentType') documentType: string | undefined, @Req() req: any) {
    if (!file) throw new BadRequestException('Multipart field "file" is required');
    return this.documents.upload(req.authContext, assetId, file, documentType);
  }

  @Get(':documentId/download')
  @RequirePermission('asset:read')
  async download(@Param('assetId') assetId: string, @Param('documentId') documentId: string, @Res() res: any, @Req() req: any) {
    const result = await this.documents.download(req.authContext, assetId, documentId);
    res.setHeader('Content-Type', result.contentType);
    const safeFileName = result.fileName.replace(/[\r\n"]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    return res.sendFile(result.path);
  }

  @Delete(':documentId')
  @RequirePermission('asset:write')
  remove(@Param('assetId') assetId: string, @Param('documentId') documentId: string, @Req() req: any) {
    return this.documents.remove(req.authContext, assetId, documentId);
  }
}
