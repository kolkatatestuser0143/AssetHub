import { Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Req, Res, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { ScimService } from './scim.service';

@Controller('scim/v2.0')
export class ScimController {
  constructor(private readonly scim: ScimService) {}

  @Get('ServiceProviderConfig')
  serviceProviderConfig() { return this.scim.serviceProviderConfig(); }

  @Get('ResourceTypes')
  resourceTypes() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
      id: 'User',
      name: 'User',
      endpoint: '/Users',
      schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
    };
  }

  @Get('Schemas')
  schemas() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Schema'],
      id: 'urn:ietf:params:scim:schemas:core:2.0:User',
      name: 'User',
      description: 'AssetHub SCIM User schema',
      attributes: [],
    };
  }

  @Get('Groups')
  async groups(@Headers('authorization') authorization?: string) {
    await this.scim.authenticate(authorization);
    // AssetHub deliberately does not synchronize IdP groups into AssetHub.
    return { schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: 0, startIndex: 1, itemsPerPage: 0, Resources: [] };
  }

  @Get('Users')
  async list(@Headers('authorization') authorization: string | undefined, @Query('startIndex') startIndex = '1', @Query('count') count = '100', @Query('filter') filter?: string) {
    const token = await this.scim.authenticate(authorization);
    return this.scim.listUsers(token, Number(startIndex), Number(count), filter);
  }

  @Get('Users/:id')
  async get(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    const token = await this.scim.authenticate(authorization);
    return this.scim.getUser(token, id);
  }

  @Post('Users')
  async create(@Headers('authorization') authorization: string | undefined, @Body() body: any, @Res({ passthrough: true }) response: Response) {
    const token = await this.scim.authenticate(authorization);
    const user = await this.scim.createUser(token, body);
    response.status(201);
    return user;
  }

  @Put('Users/:id')
  async replace(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body: any) {
    const token = await this.scim.authenticate(authorization);
    return this.scim.replaceUser(token, id, body);
  }

  @Patch('Users/:id')
  async patch(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body: any) {
    const token = await this.scim.authenticate(authorization);
    return this.scim.patchUser(token, id, body);
  }

  @Delete('Users/:id')
  async remove(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const token = await this.scim.authenticate(authorization);
    await this.scim.deleteUser(token, id);
    response.status(204);
    return undefined;
  }
}
