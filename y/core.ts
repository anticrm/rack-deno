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
import { Publisher, Subscription, Suspend, Subscriber } from './async.ts'

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
          if (kind === 'out') {
            stream = true
          }
        } else switch (kind) {
          case 'default':
            stackParams++
          case 'local':
            stackSize++
            const word = params[i] as Word
            offsets[word.sym] = pos++
            break
          default: 
            throw new Error('unknown kind')
        }
      }

      const vm = this.vm

      if (stream) {  
        return async (pc: PC): Promise<any> => {
          const stack: any[] = Array(stackSize)
          for (let i = 0; i < stackParams; i++) {
            stack[i] = await pc.next()
          } 
          const out = new Publisher()
          let inputValueHolder: any
          bind(code, (sym: string): Bound | undefined => {
            if (sym === 'in') {
              return {
                get: (sym: string): any => inputValueHolder,
                set: (sym: string, value: any) => { throw new Error('in is read only') }
              }                
            }
            if (sym === 'out') {
              return {
                get: (sym: string): any => async (pc: PC): Promise<any> => out.write(await pc.next()),
                set: (sym: string, value: any) => { throw new Error('out is read only') }
              }
            }
            if (offsets[sym] !== undefined) {
              return {
                get: (sym: string): any => stack[offsets[sym]],
                set: (sym: string, value: any) => stack[offsets[sym]] = value
              }
            }
          })   
          return { 
            resume: async (input?: Publisher<any>): Promise<void> => {
              if (!input) {
                const result = await vm.exec(code)
                console.log('writing done')
                out.done()
                return result
              } else {
                console.log('PASSSSS')
                return new Promise((resolve, reject) => {
                  input.subscribe({
                    onSubscribe(s: Subscription): void {},
                    onNext(t: any): void {
                      console.log('onnext: ' + t)
                      inputValueHolder = t
                      vm.exec(code).then(() => resolve())
                    },
                    onError(e: Error): void {},
                    onComplete(): void { console.log('oncomplete'); resolve() },          
                  })
                })
              }
            },
            out,
            // mimeType
          }  
        }
      }

      for (const sym in offsets) {
        const ofs = offsets[sym]
        offsets[sym] = ofs - stackSize
      }
    
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
    },
    
    pipe(this: Context, left: Suspend, right: Suspend): Suspend {
      console.log('LEFT', left)
      console.log('RIGHT', right)
      const pub = new Publisher<any>()
      const sub: Subscriber<any> = {
        onSubscribe(s: Subscription): void {},
        onNext(t: any): void {
          pub.write(t)
        },
        onError(e: Error): void {},
        onComplete(): void {},
      }
      left.out.subscribe(sub)
    
      return {
        resume: async (input?: Publisher<any>) => {
          console.log('resume pipe')
          return Promise.all([left.resume(input), right.resume(pub)]) as unknown as Promise<void>
        },
        out: right.out,
        mimeType: ''
      }  
    },

    print(this: Context, message: string) {
      console.log('PRINT', message)
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
print: native [message] :core/print

pipe: native [left right] :core/pipe
write: proc [value /out] [out value]
passthrough: proc [/out] [print "FUCK" out in]
`

export default async function (vm: VM) {
  vm.dictionary['core'] = createModule()
  const bootCode = parse(coreY)
  vm.bind(bootCode)
  await vm.exec(bootCode)
}
