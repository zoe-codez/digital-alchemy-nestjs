import { ApiProperty } from "@nestjs/swagger";

export class GenericVersionDTO {
  @ApiProperty()
  public projects: Record<string, string>;
  @ApiProperty()
  public version: string;
}

export class VersionResponse extends GenericVersionDTO {
  @ApiProperty()
  public application: string;
  @ApiProperty()
  public boot: number;
}
