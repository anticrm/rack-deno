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

import { Context, Proc, VM, PC, Code, Refinement, Word, Const, ProcFunctions, asyncResult, CodeItem } from '../yar/vm.ts'
import { serve, ServerRequest } from "https://deno.land/std/http/server.ts"
import {CoreError, STATUS_UNAUTHORIZED} from '../platform/core.ts'

type Extractor = (request: ServerRequest) => Promise<Const>

export default async () => {

  const procs = new Map<string, (request: ServerRequest) => Promise<any>>()
  const base = "http://localhost:8086/"

  const extractFactory: { [key: string]: undefined | ((item: CodeItem, pc: PC) => Extractor) } = {
    query: (word: CodeItem) => async (request: ServerRequest) => new Const(new URL(request.url, base).searchParams.get((word as Word).sym)),
    auth: (codeItem: CodeItem, pc: PC) => { 
      const vm = pc.vm
      const auth = codeItem.exec(pc)
      const authFunc = (typeof auth === 'function' ? auth : auth.default)
      console.log('auth', authFunc)
      return async (request: ServerRequest) => {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
          throw new CoreError(STATUS_UNAUTHORIZED, 'authorization required')
        }
        const code = [new Const(authHeader)]
        const pc = new PC(vm, code)

        const result = authFunc(pc)
        // result.resume.then((res: any) => console.log('RESUME', res)).catch((err: Error) => console.log('ERR', err))
        const ar = await asyncResult(result)
        return new Const(ar)
      }
    }
  }

  console.log('starting http server...')
  const server = serve({ hostname: "0.0.0.0", port: 8086 })


  function expose(this: Context, proc: Proc, path: string, params: Code, auth: Proc) {
    const extractors: Extractor[] = []
  
    const pc = new PC(this.vm, params)
    let factory = extractFactory.query as (item: CodeItem, pc: PC) => (request: ServerRequest) => Promise<Const>

    while (pc.hasNext()) {
      const param = pc.fetch()
      if (param instanceof Refinement) {
        const kind = param.ident
        const f = extractFactory[kind]
        if (!f) {
          throw new Error('unsupported param kind ' + kind)
        } else {
          factory = f
        }
      } else {
        extractors.push(factory(param, pc))
      }
    }

    const procFunc = typeof proc === 'function' ? proc : (proc as ProcFunctions).default
    const authFunc = (auth !== undefined) ?
      typeof auth === 'function' ? auth : (auth as ProcFunctions).default : undefined

    const launch = async (request: ServerRequest): Promise<any> => {
      const code = await Promise.all(extractors.map(extractor => extractor(request)))
      const pc = new PC(this.vm, code)
      // if (authFunc !== undefined) {
      //   const authHeader = request.headers.get('authorization')
      //   const code = [new Const(authHeader)]
      //   const pc = new PC(this.vm, code)
      //   const auth = await asyncResult(authFunc(pc))
      // }
      return procFunc(pc)
    }
  
    procs.set(path, launch)
  }

  return { 
    async run() {    
      try {
        for await (const request of server) {
          const proc = procs.get(new URL(request.url, base).pathname)
          if (proc) {
            try {
              const result = await proc(request)
              if (typeof result === 'object' && result.resume) {
                request.respond({ status: 200, body: result.toString() })
              } else {
                request.respond({ status: 200, body: result.toString() })
              }
            } catch (err) {
              console.log(err)
              if (err instanceof CoreError) {
                const coreError = err as CoreError
                request.respond({ status: coreError.getCode(), body: err.toString() })
              } else {
                request.respond({ status: 500, body: err.toString() })
              }
            }
          } else {
            request.respond({ status: 404 })
          }
        }
      } catch (err) {
        console.log('http error: ', err)
      }
    },

    stop () {
      console.log('stopping http server...')
      server.close()
    },

    expose: {
      default: expose,
      auth: expose,
    }
  }

}
