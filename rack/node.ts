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

import { VM } from '../yar/vm.ts'
import { parse } from '../yar/parse.ts'
import { boot } from '../yar/boot.ts'
import { importModule } from '../yar/import.ts'

export class Node extends VM {
  private deployments = new Map<string, VM>()

  async boot () {
    console.log('starting node boot sequence...')
    boot(this)
    this.dictionary['rack'] = await importModule(this, 'rack', new URL('../rack/mod.y', import.meta.url))
    // this.dictionary['db'] = await importModule(this, 'db', new URL('../db/mod.y', import.meta.url))
    // this.dictionary['scrn'] = await importModule(this, 'scrn', new URL('../scrn/mod.y', import.meta.url))
  }

  async deploy(id: string, url: URL) {
    console.log(`deploying '${id}'...`)
    const vm = new VM()
    boot(vm)
    this.deployments.set(id, vm)
    this.dictionary[id] = await importModule(this, 'rack', url)
  }

  parseAndExec(code: string): any {
    const parsed = parse(code)
    this.bind(parsed)
    return this.exec(parsed)
  }
}
