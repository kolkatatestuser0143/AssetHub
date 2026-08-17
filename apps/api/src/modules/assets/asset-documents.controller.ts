import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AssetDocumentsService } from './asset-documents.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel']);
const DOCUMENT_TYPES = ['INVOICE','PURCHASE_ORDER','WARRANTY_CERTIFICATE','PHOTO','DISPOSAL_RECORD','OTHER'] as const;

class RegisterUploadcareDocumentDto {
  @IsString() uuid!: string;
  @IsString() fileName!: string;
  @IsString() contentType!: string;
  @IsInt() @Min(1) sizeBytes!: number;
  @IsOptional() @IsIn(DOCUMENT_TYPES) documentType?: typeof DOCUMENT_TYPES[number];
}

@Controller('assets/:assetId/documents')
@UseGuards(TenantContextGuard, RbacGuard)
export class AssetDocumentsController {
  constructor(private readonly documents: AssetDocumentsService) {}

  @Get()
  @RequirePermission('asset:read')
  list(@Param('assetId') assetId: string, @Req() req: any) { return this.documents.list(req.authContext, assetId); }

  @Post('uploadcare')
  @RequirePermission('asset:write')
  registerUploadcare(@Param('assetId') assetId: string, @Body() dto: RegisterUploadcareDocumentDto, @Req() req: any) { return this.documents.registerUpload(req.authContext, assetId, dto); }

  @Post()
  @RequirePermission('asset:write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES }, fileFilter: (_req, file, callback) => { if (!ALLOWED_TYPES.has(String(file.mimetype).toLowerCase())) { callback(new BadRequestException('Unsupported document type'), false); return; } callback(null, true); } }))
  upload(@Param('assetId') assetId: string, @UploadedFile() file: any, @Query('documentType') documentType: string | undefined, @Req() req: any) { if (!file) throw new BadRequestException('Multipart field "file" is required'); return this.documents.upload(req.authContext, assetId, file, documentType); }

  @Get(':documentId/download')
  @RequirePermission('asset:read')
  async download(@Param('assetId') assetId: string, @Param('documentId') documentId: string, @Res() res: any, @Req() req: any) {
    const result = await this.documents.download(req.authContext, assetId, documentId);
    const safeFileName = String(result.fileName ?? 'document').replace(/[\r\n\\\"]/g, '').replace(/[\/]/g, '_').trim() || 'document';
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Length', String(result.buffer.length));
    res.end(result.buffer);
  }

  @Delete(':documentId')
  @RequirePermission('asset:write')
  remove(@Param('assetId') assetId: string, @Param('documentId') documentId: string, @Req() req: any) { return this.documents.remove(req.authContext, assetId, documentId); }
}
