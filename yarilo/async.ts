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

import { VM, PC, Proc, Code, Context, bind, CodeItem, Word, Bound } from "./vm.ts"
import { parse } from './parse.ts'

export class Publisher<T> {
  private subscriber?: Subscriber<T>
  private queue: any[] = []

  subscribe(s: Subscriber<T>): void {
    this.subscriber = s
    // console.log('flushing ' + this.queue.length + ' elements')
    this.queue.forEach(item => s.onNext(item))
    this.queue = []
  }

  write(val: T) {
    if (!this.subscriber)
      this.queue.push(val)
    else
      this.subscriber.onNext(val)
  }
}

interface Subscriber<T> {
  onSubscribe(s: Subscription): void
  onNext(t: T): void 
  onError(e: Error): void 
  onComplete(): void
}

export interface Subscription {
  request(n: number): void;
  cancel(): void;
}

export type Suspend = { 
  resume: (input?: Publisher<any>) => Promise<void>
  out: Publisher<any>,
  mimeType: string
}

export interface AsyncContext extends Context {
  out: Publisher<any>
}

export function nativeAsync(pc: PC): Proc {
  const params = pc.next() as Code
  const mimeType = pc.next() as string
  const impl = pc.next() as Function

  return (pc: PC): any => {
    const values = params.map(param => pc.next())
    const out = new Publisher()
    return { 
      resume: (input?: Publisher<any>): Promise<void> => {
        const ctx = {
          vm: pc.vm,
          out,
        }

        if (!input) {
          return new Promise((resolve, reject) => {
            impl.apply(ctx, values)
            resolve()
          })
        } else {
          return new Promise((resolve, reject) => {
            input.subscribe({
              onSubscribe(s: Subscription): void {},
              onNext(t: any): void {
                impl.apply(ctx, [t])
                resolve()
              },
              onError(e: Error): void {},
              onComplete(): void { resolve() },          
            })
          })
        }
      },
      out,
      mimeType
    }
  }
}

function createModule() {
  return {

    procAsync(this: Context, params: Code, mimeType: string, code: Code): any {

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

      const impl = (pc: PC): any => {
        params.forEach(item => {
          vm.stack.push(pc.next())      
        })
        const x = vm.exec(code)
        vm.stack.length = vm.stack.length - params.length
        return x
      }      

      return (pc: PC): any => {
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
        })
        return { 
          resume: (input?: Publisher<any>): Promise<void> => {
            if (!input) {
              return new Promise((resolve, reject) => {
                impl(pc)
                resolve()
              })
            } else {
              return new Promise((resolve, reject) => {
                input.subscribe({
                  onSubscribe(s: Subscription): void {},
                  onNext(t: any): void {
                    inputValueHolder = t
                    resolve(impl(pc))
                  },
                  onError(e: Error): void {},
                  onComplete(): void { resolve() },          
                })
              })
            }
          },
          out,
          mimeType
        }
      }
    },

    await(this: Context, proc: Suspend): any {
      proc.out.subscribe({
        onSubscribe(s: Subscription): void {},
        onNext(t: any): void {
          console.log(t)
        },
        onError(e: Error): void {},
        onComplete(): void {},
      })
    },

    async importJsModule(this: AsyncContext, url: string) {
      const u = new URL(url, this.vm.url)
      console.log('importing js from ' + u.toString())
      this.out.write(await import(u.toString()))
    },

    write(this: AsyncContext, value: string) {
      this.out.write(value)
    },
    
    pipe(this: Context, left: Suspend, right: Suspend): Suspend {    
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
          return Promise.all([left.resume(input), right.resume(pub)]) as unknown as Promise<void>
        },
        out: right.out,
        mimeType: ''
      }  
    },
    
    passthrough(this: Context, value: any) {
      return value
    }

  }
}

const Y = `
proc-async: native [params mimeType code] :async/procAsync
pipe: native [left right] :async/pipe
write: native-async [value] "application/octet-stream" :async/write
import-js-module: native-async [url] "application-json" :async/importJsModule
passthrough: native-async [value] "application/octet-stream" :async/passthrough
|: native-infix [left right] :async/pipe
`

export default function (vm: VM) {
  vm.dictionary['async'] = createModule()
  const bootCode = parse(Y)
  vm.bind(bootCode)
  vm.exec(bootCode)
}
