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

import { VM } from '../y/vm.ts'
import { parse } from '../y/parse.ts'
import { boot } from '../y/boot.ts'
import { importModule } from '../y/core.ts'

export class Node {
  private vm!: VM
  private deployments: { [key: string]: VM }  = {}

  async boot () {
    console.log('starting node boot sequence...')
    console.log('creating yarilo vm...')
    this.vm = await boot()
    // console.log('importing mem module...')
    this.vm.dictionary['mem'] = await importModule(this.vm, new URL('../mem/mod.y', import.meta.url))
  }

  exec(code: string): any {
    const parsed = parse(code)
    this.vm.bind(parsed)
    return this.vm.exec(parsed)
  }
}
