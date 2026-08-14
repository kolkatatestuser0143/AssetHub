import { Controller, Delete, Get, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AssetsService } from './assets.service';
import { AssetDocumentsService } from './asset-documents.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('assets/:assetId/documents')
@UseGuards(TenantContextGuard, RbacGuard)
export class AssetDocumentsController {
  constructor(private readonly documents: AssetDocumentsService) {}

  @Get()
  @RequirePermission('asset:read')
  list(@Param('assetId') assetId: string, @Query() _query: Record<string, string>, @Res({ passthrough: true }) _res: Response, req: any) {
    return this.documents.list(req.authContext, assetId);
  }

  @Post()
  @RequirePermission('asset:write')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('assetId') assetId: string, @UploadedFile() file: Express.Multer.File, @Query('documentType') documentType: string | undefined, req: any) {
    if (!file) throw new BadRequestException('Multipart field "file" is required');
    return this.documents.upload(req.authContext, assetId, file, documentType);
  }

  @Get(':documentId/download')
  @RequirePermission('asset:read')
  async download(@Param('assetId') assetId: string, @Param('documentId') documentId: string, @Res() res: Response, req: any) {
    const result = await this.documents.download(req.authContext, assetId, documentId);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName.replace(/"/g, '')}"`);
    return res.sendFile(result.path);
  }

  @Delete(':documentId')
  @RequirePermission('asset:write')
  remove(@Param('assetId') assetId: string, @Param('documentId') documentId: string, req: any) {
    return this.documents.remove(req.authContext, assetId, documentId);
  }
}
