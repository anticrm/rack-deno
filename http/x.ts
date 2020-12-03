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

import { superdeno } from "https://deno.land/x/superdeno/mod.ts"
import {
  assertEquals, assertThrowsAsync
} from "https://deno.land/std/testing/asserts.ts"

Deno.test('should expose simple function', async () => {
  const vm = new VM()
  boot(vm)
  const http = await importModule(vm, 'http', new URL('../http/mod.y', import.meta.url))

  const x = parse('http/expose fn [x] [add 5 5] "/test" [/query x]')
  vm.bind(x)
  vm.exec(x)

  const res = await superdeno('http://localhost:8086')
    .get("/test")
    .query({x: 7})

  assertEquals((res as any).text, "10")

  http.Impl.stop()
})

Deno.test('should expose `do`', async () => {
  const vm = new VM()
  boot(vm)
  const http = await importModule(vm, 'http', new URL('../http/mod.y', import.meta.url))

  const x = parse('http/expose :do "/test" [/query x]')
  vm.bind(x)
  vm.exec(x)

  const res = await superdeno('http://localhost:8086')
    .get("/test")
    .query({x: "add 7 8"})

  assertEquals((res as any).text, "15")

  http.Impl.stop()
})
