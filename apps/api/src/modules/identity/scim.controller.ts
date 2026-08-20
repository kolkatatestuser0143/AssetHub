import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ScimService } from './scim.service';

@Controller('scim/v2.0')
export class ScimController {
  constructor(private readonly scim: ScimService) {}

  @Get('ServiceProviderConfig') serviceProviderConfig() { return this.scim.serviceProviderConfig(); }

  @Get('ResourceTypes') resourceTypes() {
    const resource = this.scim.resourceTypes();
    return { schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: 1, startIndex: 1, itemsPerPage: 1, Resources: [resource] };
  }

  @Get('Schemas') schemas() {
    const schema = this.scim.schemas();
    return { schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: 1, startIndex: 1, itemsPerPage: 1, Resources: [schema] };
  }

  @Get('Groups') async groups(@Headers('authorization') authorization?: string) {
    await this.scim.authenticate(authorization);
    return { schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: 0, startIndex: 1, itemsPerPage: 0, Resources: [] };
  }

  @Get('Users') async list(@Headers('authorization') authorization: string | undefined, @Query('startIndex') startIndex = '1', @Query('count') count = '100', @Query('filter') filter?: string) {
    const token = await this.scim.authenticate(authorization);
    return this.scim.listUsers(token, Number(startIndex), Number(count), filter);
  }

  @Get('Users/:id') async get(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const token = await this.scim.authenticate(authorization);
    const user = await this.scim.getUser(token, id);
    response.setHeader('ETag', user.meta.version);
    return user;
  }

  @Post('Users') async create(@Headers('authorization') authorization: string | undefined, @Body() body: any, @Res({ passthrough: true }) response: Response) {
    const token = await this.scim.authenticate(authorization);
    const user = await this.scim.createUser(token, body);
    response.status(201);
    response.setHeader('ETag', user.meta.version);
    return user;
  }

  @Put('Users/:id') async replace(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body: any, @Headers('if-match') ifMatch?: string, @Res({ passthrough: true }) response: Response) {
    const token = await this.scim.authenticate(authorization);
    const user = await this.scim.replaceUser(token, id, body, ifMatch);
    response.setHeader('ETag', user.meta.version);
    return user;
  }

  @Patch('Users/:id') async patch(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body: any, @Headers('if-match') ifMatch?: string, @Res({ passthrough: true }) response: Response) {
    const token = await this.scim.authenticate(authorization);
    const user = await this.scim.patchUser(token, id, body, ifMatch);
    response.setHeader('ETag', user.meta.version);
    return user;
  }

  @Delete('Users/:id') async remove(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Headers('if-match') ifMatch?: string, @Res({ passthrough: true }) response: Response) {
    const token = await this.scim.authenticate(authorization);
    await this.scim.deleteUser(token, id, ifMatch);
    response.status(204);
    return undefined;
  }
}
