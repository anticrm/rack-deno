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

export type Proc = (pc: PC) => any
type Dict = { [key: string]: any }
type BindFactory = (sym: string) => Bound | undefined

export type Bound = { 
  get: (sym: string) => any
  set: (sym: string, value: any) => void
}

abstract class Executable {
  abstract exec(pc: PC): any
  abstract bind(f: BindFactory): void
}

export enum WordKind { 
  Word = 0,
  GetWord,
  SetWord,
  Quote
}

export class Word extends Executable {
  readonly kind: WordKind
  readonly sym: string
  bound?: Bound
  private infix: boolean

  constructor(kind: WordKind, sym: string) {
    super ()
    this.kind = kind
    this.sym = sym
    this.infix = '+-|*>='.indexOf(sym.charAt(0)) !== -1
  }

  exec(pc: PC): any {
    if (!this.bound)
      throw new Error('word not bound ' + this.sym)
    switch (this.kind) {
      case WordKind.SetWord: 
        const x = pc.next()
        this.bound.set(this.sym, x)
        return x
      default:
        const f = this.bound.get(this.sym)
        if (this.infix) {
          if (typeof f !== 'function') 
            throw new Error('infix must be a function')
          return f(pc, pc.vm.result, pc.nextNoInfix())
        } else {
          return typeof f === 'function' ? f(pc) : f
        }
    }
  }

  bind(f: BindFactory) {
    const bound = f(this.sym)
    if (bound) this.bound = bound
  }
}

export class Path extends Executable {
  readonly path: string[]
  bound?: Bound

  constructor(path: string[]) {
    super()
    this.path = path
  }

  bind(f: BindFactory) {
    const bound = f(this.path[0])
    if (bound) this.bound = bound
  }

  exec(pc: PC): any {
    if (!this.bound)
      throw new Error('path not bound')
    return this.path.slice(1).reduce((acc, val) => acc[val], this.bound.get(this.path[0]))
  }
}

export class Braces extends Executable {
  private code: Code

  constructor(code: Code) {
    super()
    this.code = code
  }

  bind(f: BindFactory) {
    bind(this.code, f)
  }

  exec(pc: PC): any {
    return pc.vm.exec(this.code)
  }
}

export type CodeItem = Executable | number | string | CodeItem[]
export type Code = CodeItem[]

export function bind(code: Code, boundFactory: (sym: string) => Bound | undefined) {
  let i = 0
  while (i < code.length) {
    const item = code[i]
    if (typeof item === 'object') {
      if ((item as any).bind) {
        (item as any).bind(boundFactory)
      } else if (Array.isArray(item)) {
        bind(item, boundFactory)
      }
    }
    i++
  }
}

export class VM {
  dictionary: Dict = {}
  stack: any[] = []
  result: any

  bind(code: Code) {
    bind(code, () => {
      return { 
        get: (sym: string) => this.dictionary[sym],
        set: (sym: string, value: any) => this.dictionary[sym] = value
      }
    })
  }

  exec(code: Code): any {
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

  nextNoInfix() {
    let result
    const item = this.code[this.pc++]
    switch (typeof item) {
      case 'object':
        result = (item as any).exec ? (item as any).exec(this) : item
        break
      case 'number':
      case 'string':
        result = item
        break
    }
    this.vm.result = result
    return result
  }

  next(): any {
    const result = this.nextNoInfix()
    if (this.pc < this.code.length) {
      const probe = this.code[this.pc] as any
      if (probe.infix && probe.kind === WordKind.Word) {
        this.pc++
        const infix = probe.exec(this)
        this.vm.result = infix
        return infix
      }
    }
    return result
  }

  exec(): any { 
    let result
    while (this.pc < this.code.length) {
      result = this.next()
    }
    return result
  }
}

export interface Context {
  vm: VM
}
