import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AssignPermissionToRoleDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  permissionIds: string[];
}
