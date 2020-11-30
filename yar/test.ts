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

import {
  assertEquals, assertThrowsAsync
} from "https://deno.land/std/testing/asserts.ts"

import { boot } from './boot.ts'
import { parse } from './parse.ts'
import { Refinement } from "./vm.ts"
import { importModule } from './import.ts'

Deno.test('should parse', () => {
  const x = parse('add 1 2')
  assertEquals(x[1].val, 1)
})

Deno.test('should parse', () => {
  const x = parse('add "1" "2"')
  assertEquals(x[1].val, '1')
})

Deno.test('should parse', () => {
  const x = parse('add 1 core/data')
})

Deno.test('should parse', () => {
  const x = parse('proc /data')
  assertEquals(x[1] instanceof Refinement, true)
  assertEquals(x[1].ident, 'data')
})

Deno.test('should execute', () => {
  const x = parse('add 10 20')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 30)
})

Deno.test('should execute', () => {
  const x = parse('add add 1 2 3')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 6)
})

Deno.test('should execute', () => {
  const x = parse('sub 1 20')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), -19)
})

Deno.test('should execute', () => {
  const x = parse('x: proc [n] [add n 10] x 5')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 15)
})

Deno.test('should execute', () => {
  const x = parse('either gt 2 1 [5] [6]')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 5)
})

Deno.test('should execute', () => {
  const x = parse('fib: proc [n] [either gt n 1 [add n n] [n]] fib 10')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 20)
})

Deno.test('should execute', () => {
  const x = parse('fib: proc [n] [either gt n 1 [add n fib sub n 1] [n]] fib 100')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 5050)
})

Deno.test('should execute', () => {
  const x = parse('fib: proc [n] [either gt n 1 [add fib sub n 2 fib sub n 1] [n]] fib 20')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 6765)
})

Deno.test('should execute', () => {
  const x = parse('fib: proc [n] [either gt n 1 [add fib sub n 2 fib sub n 1] [n]] fib 20')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 6765)
})

Deno.test('should import module', async () => {
  const vm = boot()
  const mod = await importModule(vm, new URL('../mem/mod.y', import.meta.url))
  assertEquals(typeof mod.set, 'function')
  assertEquals(typeof mod.get, 'function')
})