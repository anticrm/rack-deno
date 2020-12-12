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

import { boot } from '../yar/boot.ts'
import { importModule } from '../yar/import.ts'
import { VM } from '../yar/vm.ts'
import { parse } from '../yar/parse.ts'
import { Subscription } from "../yar/async.ts"

import {
  assertEquals, assertThrowsAsync
} from "https://deno.land/std/testing/asserts.ts"

Deno.test('mem/set', async () => {
  const vm = new VM()
  boot(vm)
  const mem = await importModule(vm, 'mem', new URL('./mod.y', import.meta.url))

  const x = parse('(write "77777") | mem/set "xxxxx"')
  vm.bind(x)
  const suspend = vm.exec(x)
  console.log('RESULT', suspend)
  let read: any
  suspend.out.subscribe({
    onNext(t: any) {
      read = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {}
  })
  await suspend.resume
  mem.Impl.stop()
})
