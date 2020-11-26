//
// Copyright © 2020 Anticrm Platform Contributors.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Context, Proc, VM, PC, Code } from '../y/vm.ts'
import { boot } from '../y/boot.ts'
import { serve } from "https://deno.land/std@0.79.0/http/server.ts"

const procs = new Map<string, Proc>()

export async function run(vm: VM) {
  console.log('starting http server...')
  const server = serve({ hostname: "0.0.0.0", port: 8086 })

  for await (const request of server) {
    const proc = procs.get(request.url)
    if (proc) {
      const code: Code = []
      const pc = new PC(vm, code)
      const result = await proc(pc)
      request.respond({ status: 200, body: result });
    } else {
      request.respond({ status: 404 });
    }
  }
}

export async function expose(this: Context, proc: Proc, path: string) {
  procs.set(path, proc)
}