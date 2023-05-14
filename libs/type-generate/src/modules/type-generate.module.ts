import { LibraryModule } from "@digital-alchemy/boilerplate";

import { LIB_TYPE_GENERATE } from "../config";

@LibraryModule({
  configuration: {},
  exports: [],
  imports: [],
  library: LIB_TYPE_GENERATE,
  providers: [],
})
export class TypeGenerateModule {}
