import { Transform } from 'class-transformer';
import { IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  static readonly validationRoot = '#/body';

  @ApiProperty({ example: 'new.user@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  emailAddress!: string;

  @ApiProperty({ enum: ['admin', 'member', 'owner'], example: 'member' })
  @IsIn(['admin', 'member', 'owner'])
  role!: 'admin' | 'member' | 'owner';
}
