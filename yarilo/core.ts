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

import { Context, Code, CodeItem, Word, Bound, bind, PC, VM, bindDictionary } from './vm.ts'
import { parse } from './parse.ts'
import { bgMagenta } from "https://deno.land/std@0.78.0/fmt/colors.ts"
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

export function importModule(vm: VM, url: URL) {
  console.log('importing from ' + url.toString())
  vm.url = url
  const buf = Deno.readFileSync(url)
  const code = parse(new TextDecoder().decode(buf))
  vm.bind(code)
  return vm.exec(code)
}

const core = { 
  add, sub, mul, proc, gt, eq, either,
  import (this: Context, url: URL) {
    return importModule(this.vm, url)
  },
  module (this: Context, desc: Code, code: Code) {
    this.vm.bind(code)  
    const dict = {}
    bindDictionary(code, dict)
    this.vm.exec(code)
    return dict
  }
}

const coreY = `
add: native [x y] :core/add
sub: native [x y] :core/sub
mul: native [x y] :core/mul

gt: native [x y] :core/gt
eq: native [x y] :core/eq

+: native-infix [x y] :core/add
-: native-infix [x y] :core/sub
*: native-infix [x y] :core/mul

>: native-infix [x y] :core/gt
=: native-infix [x y] :core/eq

proc: native [params code] :core/proc
either: native [cond ifTrue ifFalse] :core/either

module: native [desc code] :core/module
import: native [url] :core/import
`

export default function (vm: VM) {
  vm.dictionary['core'] = core
  const bootCode = parse(coreY)
  vm.bind(bootCode)
  vm.exec(bootCode)
}
