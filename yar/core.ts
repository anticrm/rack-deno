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

function createModule() {
  return { 
    add (x: number, y: number): number {
      // console.log('add ', x, y)
      return x + y
    },

    sub (x: any, y: any): number {
      //console.log('sub ', x, y)
      return x - y
    },
    
    mul (x: any, y: any): number {
      return x * y
    },
    
    gt (x: any, y: any): boolean {
      return x > y
    },
    
    eq (x: any, y: any): boolean {
      return x === y
    },

    either(this: Context, cond: any, ifTrue: Code, ifFalse: Code): any {
      return this.vm.exec(cond ? ifTrue : ifFalse)
    },

    loop(this: Context, times: number, code: Code): any {
      let result
      for (let i = 0; i < times; i++) 
        result = this.vm.exec(code)
      return result
    },

    do(this: Context, code: any): any {
      if (Array.isArray(code)) {
        // assume code block
        return this.vm.exec(code)
      } else {
        throw new Error('unsupported type: ' + code)
      }
    },
    
    proc (this: Context, params: Code, code: Code): Proc {

      const offsets: { [key: string]: number } = {}

      // count stack parameters
      let stackParams = 0
      let stackSize = 0
      let kind = 'default'

      let pos = 0

      let input: boolean = false
      let output: boolean = false

      for (let i = 0; i < params.length; i++) {
        if (params[i] instanceof Refinement) {
          kind = (params[i] as Refinement).ident
          if (kind === 'in') {
            input = true
          } else if (kind === 'out') {
            output = true
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

      return (pc: PC): any => {
        const stack: any[] = Array(stackSize)
        for (let i = 0; i < stackParams; i++) {
          stack[i] = pc.next()
        }
        const _in = new Publisher()
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
              get: (sym: string): any => (pc: PC): any => out.write(pc.next()),
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
          resume: async (): Promise<void> => {
            if (!input) {
              const result = vm.exec(code)
              out.done()
              return result
            } else {
              return new Promise((resolve, reject) => {
                _in.subscribe({
                  onSubscribe(s: Subscription): void {},
                  onNext(t: any): void {
                    inputValueHolder = t
                    vm.exec(code)
                  },
                  onError(e: Error): void {},
                  onComplete(): void { resolve() },          
                })
              })
            }
          },
          out,
          in: _in,
        }  
      }
    },
    
    fn (this: Context, params: Code, code: Code): Proc {

      const offsets: { [key: string]: number } = {}

      // count stack parameters
      let stackParams = 0
      let stackSize = 0
      let kind = 'default'

      let pos = 0

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
          default: 
            throw new Error('unknown kind')
        }
      }

      const vm = this.vm

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

      return (pc: PC): any => {
        for (let i = 0; i < stackParams; i++) {
          vm.stack.push(pc.next())
        }
        for (let i = 0; i < locals; i++) {
          vm.stack.push(undefined)
        }
        const x = vm.exec(code)
        vm.stack.length = vm.stack.length - stackSize
        return x
      }
    },

    pipe(this: Context, left: Suspend, right: Suspend): Suspend {
      // console.log('LEFT', left)
      // console.log('RIGHT', right)
      if (right.in === undefined)
        throw new Error('no input on the right side')
      left.out.subscribe({
        onSubscribe(s: Subscription): void {},
        onNext(t: any): void {
          (right.in as Publisher<any>).write(t)
        },
        onError(e: Error): void {},
        onComplete(): void {
          (right.in as Publisher<any>).done()
        },
      })
    
      return {
        resume: async () => Promise.all([left.resume, right.resume]) as unknown as Promise<void>,
        out: right.out,
        in: left.in
      }  
    },

    // async importJsModule (this: Context, url: string): Promise<any> {
    //   const u = new URL(url, this.vm.url)
    //   const mod = await import(u.toString())
    //   if (mod['run']) {
    //     mod.run(this.vm)
    //   }
    //   return mod
    // },

    // async module (this: Context, desc: Code, code: Code): Promise<any> {
    //   //this.vm.bind(code)  
    //   const dict = {}
    //   bindDictionary(code, dict)
    //   await this.vm.exec(code)
    //   return dict
    // },

    throw (this: Context, message: string): Promise<any> {
      throw new Error(message)
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

fn: native [params code] :core/fn
proc: native [params code] :core/proc

either: native [cond ifTrue ifFalse] :core/either
loop: native [times code] :core/loop

throw: native [message] :core/throw
print: native [message] :core/print

pipe: native [left right] :core/pipe
write: proc [value /out] [out value]
passthrough: proc [/in /out] [out in]
`

export default function (vm: VM) {
  vm.dictionary['core'] = createModule()
  const bootCode = parse(coreY)
  vm.bind(bootCode)
  vm.exec(bootCode)
}
