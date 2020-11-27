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

import { Context, Proc, VM, PC, Code, Refinement, Word, Const } from '../y/vm.ts'
import { serve, ServerRequest } from "https://deno.land/std/http/server.ts"

const procs = new Map<string, (request: ServerRequest) => Promise<any>>()
const base = "http://localhost:8086/"

export async function run() {
  console.log('starting http server...')
  const server = serve({ hostname: "0.0.0.0", port: 8086 })

  try {
    for await (const request of server) {
      const proc = procs.get(new URL(request.url, base).pathname)
      if (proc) {
        const result = await proc(request)
        request.respond({ status: 200, body: result })
      } else {
        request.respond({ status: 404 })
      }
    }
  } catch (err) {
    console.log('http error: ', err)
  }
}

enum Extract {
  Unknown = 0,
  Query
}

const extractFactory = [
  (ident: string) => { throw new Error('unknown param extraction kind')},
  (ident: string) => (request: ServerRequest) => {
    // console.log('url: ', request.url)
    return new Const(new URL(request.url, base).searchParams.get(ident))
  }
]

export async function expose(this: Context, proc: Proc, path: string, params: Code) {

  let kind = Extract.Unknown
  const extractors: any[] = []

  params.forEach(param => {
    if (param instanceof Refinement) {
      if (param.ident === 'query') {
        kind = Extract.Query
      } else {
        throw new Error('unsupported param kind: ' + param.ident)
      }
    } else if (param instanceof Word) {
      extractors.push(extractFactory[kind](param.sym))
    } else throw new Error('unsupported param kind')
  })

  const launch = async (request: ServerRequest): Promise<any> => {
    const code = extractors.map(extractor => extractor(request))
    // console.log('code: ', code)
    const pc = new PC(this.vm, code)
    return proc(pc)
  }

  procs.set(path, launch)
}