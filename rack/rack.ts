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

import { readLines } from "https://deno.land/std/io/mod.ts"
import { Node } from './node.ts'
import { Subscription } from '../yarilo/async.ts'

async function main() {
  console.log('rackOS v0.1.0 (c) copyright 2020 Anticrm Project Contributors. All rights reserved.')
  const node = new Node()
  node.boot()
  const cb = (err: Error | null, res: any) => { 
    if (err) {
      console.log('error: ', err)
    } else {
      console.log(res)
    }
  }
  while(true) {
    await Deno.stdout.write(new TextEncoder().encode('rackOS> '))
    const input = await readLines(Deno.stdin).next()
    const code = input.value
    const result = node.exec(code)
    if (result && result.resume) {
      let promiseResult
      result.resume()
        .then(async (res: any) => {
          result.out.subscribe({
            onNext(t: any) {
              console.log(t)
            },
            onSubscribe(s: Subscription): void {},
            onError(e: Error): void {},
            onComplete(): void {}
          })        
        })
        .catch((err: Error) => { cb(err, undefined) })
  
    } else {
      cb (null, result)
    }
  }
}

main()
