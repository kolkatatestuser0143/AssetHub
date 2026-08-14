import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { InviteService } from './invite.service';

class AcceptInviteDto {
  @IsString() token!: string;
  @IsString() @MinLength(8) password!: string;
}

@Controller('auth/invite')
export class InviteController {
  constructor(private readonly invites: InviteService) {}

  @Post('accept')
  accept(@Body() dto: AcceptInviteDto) {
    return this.invites.accept(dto.token, dto.password);
  }
}
