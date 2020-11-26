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

import { VM, Context, Code, Proc, CodeItem, Word, Bound, bind, PC } from './vm.ts'
import { parse } from './parse.ts'

function createModule() {
  return { 
    async add (x: number, y: number): Promise<number> {
      // console.log('add ', x, y)
      return x + y
    },

    async sub (x: any, y: any): Promise<number> {
      //console.log('sub ', x, y)
      return x - y
    },
    
    async mul (x: any, y: any): Promise<number> {
      return x * y
    },
    
    async gt (x: any, y: any): Promise<boolean> {
      return x > y
    },
    
    async eq (x: any, y: any): Promise<boolean> {
      return x === y
    },

    async either(this: Context, cond: any, ifTrue: Code, ifFalse: Code): Promise<any> {
      return this.vm.exec(cond ? ifTrue : ifFalse)
    },    
    
    async proc (this: Context, params: Code, code: Code): Promise<Proc> {

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
    
      return async (pc: PC): Promise<any> => {
        //const promises = params.map(item => pc.next())
        const values: any[] = []
        for (let i = 0; i < params.length; i++) {
          values.push(await pc.next())
        }
        // console.log(values)
        vm.stack.push(...values)
        // console.log('stack', vm.stack)
        const x = vm.exec(code)
        const y = await x
        // console.log(values + ' -> ' + y)
        vm.stack.length = vm.stack.length - params.length
        return x
      }
    }
    
  }
}

const coreY = `
add: native [x y] :core/add
sub: native [x y] :core/sub
mul: native [x y] :core/mul

gt: native [x y] :core/gt
eq: native [x y] :core/eq

proc: native [params code] :core/proc
either: native [cond ifTrue ifFalse] :core/either
`

export default async function (vm: VM) {
  vm.dictionary['core'] = createModule()
  const bootCode = parse(coreY)
  vm.bind(bootCode)
  await vm.exec(bootCode)
}
