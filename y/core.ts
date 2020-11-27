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

import { VM, Context, Code, Proc, CodeItem, Word, Bound, bind, bindDictionary, PC, Refinement } from './vm.ts'
import { parse } from './parse.ts'
import { Publisher } from './async.ts'

export async function importModule(vm: VM, url: URL): Promise<any> {
  console.log('loading module ' + url.toString() + '...')
  vm.url = url
  const buf = await Deno.readFile(url)
  const code = parse(new TextDecoder().decode(buf))
  vm.bind(code)
  return vm.exec(code)
}

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

      const offsets: { [key: string]: number } = {}

      // count stack parameters
      let stackParams = 0
      let stackSize = 0
      let kind = 'default'

      let pos = 0
      let stream = false

      for (let i = 0; i < params.length; i++) {
        if (params[i] instanceof Refinement) {
          kind = (params[i] as Refinement).ident
        } else switch (kind) {
          case 'default':
            stackParams++
          case 'local':
            stackSize++
            const word = params[i] as Word
            offsets[word.sym] = pos++
            break
          case 'out':
            stream = true
            break
          default: 
            throw new Error('unknown kind')
        }
      }

      for (const sym in offsets) {
        const ofs = offsets[sym]
        offsets[sym] = ofs - stackSize
      }

      const vm = this.vm
    
      bind(code, (sym: string): Bound | undefined => {
        if (offsets[sym]) {
          return { 
            get: (sym: string): any => vm.stack[vm.stack.length + offsets[sym]],
            set: (sym: string, value: any) => vm.stack[vm.stack.length + offsets[sym]] = value
          } 
        }
      })

      const locals = stackSize - stackParams

      if (!stream)
        return async (pc: PC): Promise<any> => {
          for (let i = 0; i < stackParams; i++) {
            vm.stack.push(await pc.next())
          }
          for (let i = 0; i < locals; i++) {
            vm.stack.push(undefined)
          }
          const x = await vm.exec(code)
          vm.stack.length = vm.stack.length - stackSize
          return x
        }
      else return (pc: PC): any => {
        // const values = params.map(param => pc.next())
        // const out = new Publisher()

        // return { 
        //   resume: (input?: Publisher<any>): Promise<void> => {
        //     const ctx = {
        //       vm: pc.vm,
        //       out,
        //     }
    
        //     if (!input) {
        //       return new Promise((resolve, reject) => {
        //         impl.apply(ctx, values)
        //         resolve()
        //       })
        //     } else {
        //       return new Promise((resolve, reject) => {
        //         input.subscribe({
        //           onSubscribe(s: Subscription): void {},
        //           onNext(t: any): void {
        //             impl.apply(ctx, [t])
        //             resolve()
        //           },
        //           onError(e: Error): void {},
        //           onComplete(): void { resolve() },          
        //         })
        //       })
        //     }
        //   },
        //   out,
        //   mimeType
        // }
      }    
    },

    async importJsModule (this: Context, url: string): Promise<any> {
      const u = new URL(url, this.vm.url)
      const mod = await import(u.toString())
      if (mod['run']) {
        mod.run(this.vm)
      }
      return mod
    },

    async module (this: Context, desc: Code, code: Code): Promise<any> {
      //this.vm.bind(code)  
      const dict = {}
      bindDictionary(code, dict)
      await this.vm.exec(code)
      return dict
    },

    async throw (this: Context, message: string): Promise<any> {
      throw new Error(message)
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
module: native [desc code] :core/module
import-js-module: native [url] :core/importJsModule

throw: native [message] :core/throw
`

export default async function (vm: VM) {
  vm.dictionary['core'] = createModule()
  const bootCode = parse(coreY)
  vm.bind(bootCode)
  await vm.exec(bootCode)
}
