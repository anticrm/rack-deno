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

type Dict = { [key: string]: any }
export type Proc = (pc: PC) => Promise<any>

export enum WordKind {
  Norm = 0,
  Get,
  Set,
  Quote
}

type BindFactory = (sym: string) => Bound | undefined
export type Bound = { 
  get: (sym: string) => any
  set: (sym: string, value: any) => void
}

export abstract class CodeItem {
  abstract bind(factory: BindFactory): void
  abstract exec(pc: PC): Promise<any>
}

export type Code = CodeItem[]

export class Word extends CodeItem {
  private kind: WordKind
  readonly sym: string
  private infix: boolean
  private bound?: Bound

  constructor(kind: WordKind, sym: string) {
    super ()
    this.kind = kind
    this.sym = sym
    this.infix = '+-|*>='.indexOf(sym.charAt(0)) !== -1 && kind === WordKind.Norm
  }

  bind(f: BindFactory) {
    const bound = f(this.sym)
    if (bound) this.bound = bound
  }

  async exec (pc: PC): Promise<any> {
    if (!this.bound)
      throw new Error('word not bound ' + this.sym)
    switch (this.kind) {
      case WordKind.Set: 
        const x = await pc.next()
        this.bound.set(this.sym, x)
        return x
      case WordKind.Norm:
        const f = this.bound.get(this.sym)
        // if (f === undefined) {
        //   throw new Error('nothing when read ' + this.sym)
        // }
        if (this.infix) {
          return f(pc, pc.vm.result, pc.nextNoInfix())
        } else {
          return typeof f === 'function' ? f(pc) : f
        }
      default: 
        throw new Error('not implemented')
    }
  }
}

export class Path extends CodeItem {
  private kind: WordKind
  private path: string[]
  private bound?: Bound

  constructor(kind: WordKind, path: string[]) {
    super ()
    this.kind = kind
    this.path = path
  }

  bind(f: BindFactory) {
    const bound = f(this.path[0])
    if (bound) this.bound = bound
  }

  async exec (pc: PC): Promise<any> {
    if (!this.bound)
      throw new Error('path not bound')
    switch (this.kind) {
      case WordKind.Get:
        return this.path.slice(1).reduce((acc, val) => acc[val], this.bound.get(this.path[0]))
      default:
        // throw new Error('should not be here ' + this.path.toString())
        const result = this.path.slice(1).reduce((acc, val) => acc[val], this.bound.get(this.path[0]))
        return typeof result === 'function' ? result(pc) : result
    }
  }
}

export class Brackets extends CodeItem {

  constructor (code: CodeItem[]) {
    super ()
  }

  bind(f: BindFactory) {
    throw new Error('not implemented')
  }

  async exec (pc: PC): Promise<any> {
    throw new Error('not implemented')
  }
}

export class Const extends CodeItem {
  private val: any

  constructor (val: any) {
    super()
    this.val = val
  }

  bind() {}

  async exec (): Promise<any> {
    return this.val
  }

}

export class Block extends CodeItem {
  private code: Code

  constructor (code: Code) {
    super()
    this.code = code
  }

  bind(f: BindFactory) {
    bind(this.code, f)
  }

  async exec (pc: PC): Promise<any> {
    return this.code
  }

}

export function bind(code: Code, boundFactory: (sym: string) => Bound | undefined) {
  code.forEach(item => {if (!item.bind) { console.log(item); throw new Error('no bind') } else { return item.bind(boundFactory) }})
}

export class VM {
  dictionary: Dict = {}
  stack: any[] = []
  result: any
  url?: URL

  bind(code: Code) {
    bind(code, () => {
      return { 
        get: (sym: string) => this.dictionary[sym],
        set: (sym: string, value: any) => this.dictionary[sym] = value
      }  
    })
  }

  async exec(code: Code): Promise<any> {
    return new PC(this, code).exec()
  }

}

export class PC { 
  code: Code
  pc: number
  vm: VM

  constructor(vm: VM, code: Code) { 
    this.code = code
    this.pc = 0
    this.vm = vm
  }

  nextNoInfix(): Promise<any> {
    if (!this.code[this.pc]) {
      console.log(this.code, this.pc)
      throw new Error('no exec')
    }
    const result = this.code[this.pc++].exec(this)    
    this.vm.result = result
    return result
  }

  async next(): Promise<any> {
    const result = this.nextNoInfix()
    if (this.pc < this.code.length) {
      const probe = this.code[this.pc] as any
      if (probe.infix) {
        this.pc++
        const infix = probe.exec(this)
        this.vm.result = infix
        return infix
      }
    }
    return result
  }

  async exec(): Promise<any> {
    let result
    while (this.pc < this.code.length) {
      result = await this.next()
    }
    return result
  }
}

export interface Context {
  vm: VM
}
