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

import { VM, Context } from '../yar/vm.ts'
import { Publisher } from '../yar/async.ts'
import { Node } from './node.ts'

export default async (vm: VM) => {
  return {
    stop () {},

    deploy (this: Context, id: string, module: string) {
      const out = new Publisher()
      return { 
        async resume () {
          const url = new URL(module, import.meta.url)
          await (vm as Node).deploy(id, url)
          out.write(true)
          out.done(true)
        },
        out
      }
    },

    exec (this: Context, server: string, code: string) {
      const out = new Publisher()
      return { 
        async resume () {
          // const response = await fetch('http://localhost:8086/do?do=' + code)
          // const text = response.text()
          out.write("text")
          out.done("text")
        },
        out
      }
    }
  }
}