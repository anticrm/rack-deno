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

import { connect, Redis } from "https://deno.land/x/redis/mod.ts"
import { config } from "https://deno.land/x/dotenv/mod.ts"
import { stripColor } from "https://deno.land/std@0.78.0/fmt/colors.ts"
import { Context } from '../yar/vm.ts'
import { Publisher, Subscription } from '../yar/async.ts'


export default async () => {

  console.log('connecting to redis server')
  const env = config()

  const redis = await connect({
    hostname: env.REDIS_SERVER || 'localhost',
    port: 6379
  })

  return { 
    get(this: Context, key: string) {
      const out = new Publisher()
      return {
        resume: async () => {
          const value = await redis.get(key)
          out.write(value)
          out.done(value)
        },
        out
      }      
    },
  
    set(this: Context, key: string) {
      const out = new Publisher()
      const _in = new Publisher()
      return {
        resume: async () => {
          return new Promise((resolve, reject) => {
            _in.subscribe({
              onSubscribe(s: Subscription): void {},
              onNext(t: any): void {
                redis.set(key, t).then(resolve).catch(reject)
              },
              onError(e: Error): void {},
              onComplete(res: any): void {},          
            })
          })
        },
        out,
        in: _in
      }      
    },

    stop () {
      console.log('closing redis connection')
      redis.close()
    }
  }
  
}

