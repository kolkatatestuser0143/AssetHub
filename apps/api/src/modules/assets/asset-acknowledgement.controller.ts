import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards, Req } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Response } from 'express';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AssetAcknowledgementService } from './asset-acknowledgement.service';

class TemplateDto { @IsString() @MinLength(1) name!: string; @IsString() @MinLength(1) content!: string; }

@Controller('asset-acknowledgements')
@UseGuards(TenantContextGuard, RbacGuard)
export class AssetAcknowledgementController {
  constructor(private readonly acknowledgements: AssetAcknowledgementService) {}

  @Get('templates') @RequirePermission('asset:read') list(@Req() req: any) { return this.acknowledgements.listTemplates(req.authContext); }
  @Post('templates') @RequirePermission('asset:write') create(@Body() dto: TemplateDto, @Req() req: any) { return this.acknowledgements.createTemplate(req.authContext, dto.name, dto.content); }
  @Patch('templates/:templateId') @RequirePermission('asset:write') update(@Param('templateId') templateId: string, @Body() dto: TemplateDto, @Req() req: any) { return this.acknowledgements.updateTemplate(req.authContext, templateId, dto.name, dto.content); }
  @Post('templates/:templateId/default') @RequirePermission('asset:write') setDefault(@Param('templateId') templateId: string, @Req() req: any) { return this.acknowledgements.setDefault(req.authContext, templateId); }
  @Delete('templates/:templateId') @RequirePermission('asset:write') remove(@Param('templateId') templateId: string, @Req() req: any) { return this.acknowledgements.deleteTemplate(req.authContext, templateId); }

  @Post('assets/:assetId/pdf') @RequirePermission('asset:read') async generate(@Param('assetId') assetId: string, @Body() body: { templateId?: string }, @Req() req: any, @Res() res: Response) {
    const buffer = await this.acknowledgements.generate(req.authContext, assetId, body?.templateId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="asset-acknowledgement-${assetId}.pdf"`);
    return res.send(buffer);
  }
}
