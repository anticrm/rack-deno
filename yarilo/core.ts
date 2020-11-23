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

import { Context, Code, CodeItem, Word, Bound, bind, PC, VM } from './vm.ts'
import { parse } from './parse.ts'
// import { Writable, Readable, pipeline, PassThrough } from 'stream'

export function add (x: any, y: any): any {
  return x + y
}

function sub (x: any, y: any): any {
  return x - y
}

function mul (x: any, y: any): any {
  return x * y
}

function gt (x: any, y: any): any {
  return x > y
}

function eq (x: any, y: any): any {
  return x === y
}

export function proc(this: Context, params: Code, code: Code): any {

  const offset: { [key: string]: number } = {}
  params.forEach((param: CodeItem, index: number) => {
    const word = param as Word
    offset[word.sym] = index - params.length
  })

  const vm = this.vm

  bind(code, (sym: string): Bound | undefined => {
    if (offset[sym]) {
      return { 
        get: (sym: string): any => vm.stack[vm.stack.length + offset[sym]],
        set: (sym: string, value: any) => vm.stack[vm.stack.length + offset[sym]] = value
      }  
    }
  })

  return (pc: PC): any => {
    params.forEach(item => {
      vm.stack.push(pc.next())      
    })
    const x = vm.exec(code)
    vm.stack.length = vm.stack.length - params.length
    return x
  }
}

function either(this: Context, cond: any, ifTrue: Code, ifFalse: Code) {
  return this.vm.exec(cond ? ifTrue : ifFalse)
}

// S T R E A M S

// function pipe(this: Context, left: Suspend, right: Suspend): Suspend {
//   if (!left.out)
//     throw new Error('no output from left')
//   const pass = new PassThrough()
//   pipeline(left.out, pass, (err: Error | null) => {
//   })

//   return {
//     resume: async (input?: Readable) => Promise.all([left.resume(input), right.resume(pass)]) as unknown as Promise<void>,
//     out: right.out,
//   }  
// }

// async function write(this: Context, value: string) {
//   console.log('WRITING')
//   this.out.write(value)
// }

// async function passthrough(this: Context) {
//   for await (const chunk of this.input) {
//     console.log('writing', chunk)
//     this.out.write(chunk)
//   }
//   console.log('PASSED')
// }

// new-video: proc [] [
//   id: nanoid
//   job [get-video id] | [transcode] | [save-video id]
//   id
// ]

// video-chunk: proc [id chunk final] [
//   in | ram/wset join id ['.' chunk]
//   if final [
//     ram/set join id ['.' chunk ".final"] chunk
//   ]
// ]

// get-video: proc [id /local chunk] [
//   chunk: 0
//   until [
//     ram/wget join id ["." chunk] | out
//     chunk: add chunk 1
//     ram/get join id ["." chunk ".final"]
//   ]  
// ]

const core = { 
  add, sub, mul, proc, gt, eq, either,
  // write, passthrough, pipe
}

const coreY = `
add: native [x y] core/add
sub: native [x y] core/sub
mul: native [x y] core/mul

gt: native [x y] core/gt
eq: native [x y] core/eq

+: native-infix [x y] core/add
-: native-infix [x y] core/sub
*: native-infix [x y] core/mul

>: native-infix [x y] core/gt
=: native-infix [x y] core/eq

proc: native [params code] core/proc
either: native [cond ifTrue ifFalse] core/either
`

export default function (vm: VM) {
  vm.dictionary['core'] = core
  const bootCode = parse(coreY)
  vm.bind(bootCode)
  vm.exec(bootCode)
}
