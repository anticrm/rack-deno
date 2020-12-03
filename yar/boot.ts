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

import { PC, Code, Proc, VM } from "./vm.ts"
import coreModule from "./core.ts"

// import asyncModule, { nativeAsync } from './async.ts'
import { parse } from "./parse.ts"

function native(pc: PC): Proc {
  const params = pc.next() as Code
  const impl = pc.next() as Function

  return (pc: PC): any => {
    const values: any[] = []
    for (let i = 0; i < params.length; i++) {
      values.push(pc.next())
    }
    return impl.apply(pc, values)
  }
}

function nativeInfix(pc: PC) {
  const impl = pc.next() as Function

  return (pc: PC): any => {
    const values = [pc.vm.result, pc.nextNoInfix()]
    return impl.apply(pc, values)
  }
}

export function boot(vm: VM) {
  vm.dictionary['native'] = native
  vm.dictionary['native-infix'] = nativeInfix
  coreModule(vm)
}
