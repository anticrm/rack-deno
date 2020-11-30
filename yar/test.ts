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
import { Suspend, Subscription } from './async.ts'

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
  const x = parse('fn /data')
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
  const x = parse('x: fn [n] [add n 10] x 5')
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
  const x = parse('fib: fn [n] [either gt n 1 [add n n] [n]] fib 10')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 20)
})

Deno.test('should execute', () => {
  const x = parse('fib: fn [n] [either gt n 1 [add n fib sub n 1] [n]] fib 100')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 5050)
})

Deno.test('should execute', () => {
  const x = parse('fib: fn [n] [either gt n 1 [add fib sub n 2 fib sub n 1] [n]] fib 20')
  const vm = boot()
  vm.bind(x)
  assertEquals(vm.exec(x), 6765)
})

Deno.test('should execute', () => {
  const x = parse('fib: fn [n] [either gt n 1 [add fib sub n 2 fib sub n 1] [n]] fib 20')
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

Deno.test('should execute', () => {
  const x = parse('add 5 5 throw "message"')
  const vm = boot()
  vm.bind(x)
  assertThrowsAsync(() => vm.exec(x))
})

Deno.test('should execute', () => {
  const x = parse('x: 10 p: fn [/local x] [x: 5 x] add p x')
  const vm = boot()
  vm.bind(x)
  const result = vm.exec(x)
  assertEquals(result, 15)
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
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, "7777")
})

Deno.test('should execute', async () => {
  const x = parse('pipe write "7777" passthrough')
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
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, "7777")
})

Deno.test('should execute', async () => {
  const x = parse('generate: proc [] [out 1 out 2 out 3] doubler: proc [/in /out] [out add in in] pipe generate doubler')
  const vm = boot()
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  const read: any[] = []
  suspend.out.subscribe({
    onNext(t: any) {
      read.push(t)
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, [2, 4, 6])
})

Deno.test('should execute', async () => {
  const x = parse('generate: proc [] [out 1 out 2 out 3] doubler: proc [/in /out] [out add in in] pipe generate doubler')
  const vm = boot()
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  const read: any[] = []
  suspend.out.subscribe({
    onNext(t: any) {
      read.push(t)
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, [2, 4, 6])
})

Deno.test('should execute', async () => {
  const x = parse('generate: proc [] [loop 1000 [out 8]] doubler: proc [/in /out] [out add in add in add in in] pipe generate doubler')
  const vm = boot()
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  let read: any
  suspend.out.subscribe({
    onNext(t: any) {
      read = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, 32)
})
