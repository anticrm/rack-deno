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
  assertEquals
} from "https://deno.land/std/testing/asserts.ts"

import { boot } from './boot.ts'
import { parse } from './parse.ts'
import { VM, PC } from './vm.ts'
import { Suspend, Publisher, Subscription } from './async.ts'

Deno.test('should parse', () => {
  const x = parse('add 1 2')
  assertEquals(x[1], 1)
})

Deno.test('should parse', () => {
  const x = parse('add "1" "2"')
  assertEquals(x[1], '1')
})

Deno.test('should parse', () => {
  const x = parse('add 1 core/data')
})

Deno.test('should execute', () => {
  const x = parse('core/b/c')
  const vm = new VM()
  vm.dictionary['core'] = { a: 1, b: { c: 5 } }
  vm.bind(x)
  assertEquals(vm.exec(x), 5)
})

Deno.test('should execute', () => {
  const x = parse('add 1 2')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 3)
})

Deno.test('should execute', () => {
  const x = parse('1 + 2 * 3')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 9)
})

Deno.test('should execute', () => {
  const x = parse('1 + (2 * 3)')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 7)
})

Deno.test('should execute', () => {
  const x = parse('1 + 2')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 3)
})

Deno.test('should execute', () => {
  const x = parse('1 + 2 + 3')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 6)
})

Deno.test('should execute', () => {
  const x = parse('x: 7 y: 8 add x y')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 15)
})

Deno.test('should execute', () => {
  const x = parse('x: proc [n] [add n 10] x 5')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 15)
})

Deno.test('should execute', () => {
  const x = parse('gt 7 8 gt 8 7 eq 7 7 eq 7 8')
  const vm = boot()
  vm.bind(x)
  const ctx = new PC(vm, x)
  assertEquals(ctx.next(), false)
  assertEquals(ctx.next(), true)
  assertEquals(ctx.next(), true)
  assertEquals(ctx.next(), false)
})

Deno.test('should execute', () => {
  const x = parse('either gt 2 1 [5] [6]')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 5)
})

Deno.test('should execute', () => {
  const x = parse('fib: proc [n] [either gt n 1 [add fib sub n 1 fib sub n 2] [n]] fib 20')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 6765)
})

Deno.test('should execute', () => {
  const x = parse('fib: proc [n] [either n > 1 [(fib n - 1) + (fib n - 2)] [n]] fib 20')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 6765)
})

Deno.test('should execute', () => {
  const x = parse('add add 1 2 3')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 6)
})

Deno.test('should execute', async () => {
  const x = parse('write "7777"')
  const vm = boot()
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  let read
  suspend.out.subscribe({
    onNext(t: any) {
      read = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {}
  })
  await suspend.resume()
  assertEquals(read, "7777")
})

Deno.test('should execute', async () => {
  const x = parse('write "7777"')
  const vm = boot()
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  try {
    await suspend.resume()
    assertEquals(true, false)
  } catch (err) {
    assertEquals(true, true)
  }
})

Deno.test('should execute', async () => {
  const x = parse('pipe write "7777" passthrough')
  const vm = boot()
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  suspend.out.subscribe({
    onNext(t: any) {
      console.log(t)
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {}
  })
  const res = await suspend.resume()
})

Deno.test('should execute', async () => {
  const x = parse('dbl: proc-async [] "" [out add in in] pipe write 88 dbl')
  const vm = boot()
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  let data: any
  suspend.out.subscribe({
    onNext(t: any) {
      data = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {}
  })
  const res = await suspend.resume()
  assertEquals(data, 176)
})

Deno.test('should execute', async () => {
  const x = parse('dbl: proc-async [] "" [out add in in] (write 88) | dbl')
  const vm = boot()
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  let data: any
  suspend.out.subscribe({
    onNext(t: any) {
      data = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {}
  })
  const res = await suspend.resume()
  assertEquals(data, 176)
})

Deno.test('should execute', () => {
  const x = parse('module [] [dbl: proc [x] [add x x]]')
  const vm = boot()
  vm.bind(x)
  const result = vm.exec(x)
  assertEquals(typeof result.dbl === 'function', true)
})

Deno.test('should execute', () => {
  const x = parse('m: module [] [dbl: proc [x] [add x x]] m/dbl 55')
  const vm = boot()
  vm.bind(x)
  const result = vm.exec(x)
  assertEquals(result, 110)
})
