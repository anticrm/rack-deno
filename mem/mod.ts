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
import { stripColor } from "https://deno.land/std@0.78.0/fmt/colors.ts"
import { Context } from '../y/vm.ts'

export default async () => {

  console.log('connecting to redis server')
  const redis = await connect({
    hostname: "127.0.0.1",
    port: 6379
  })

  return { 
    set(this: Context, key: string, value: string) {
      return redis.set(key, value)
    },
  
    get(this: Context, key: string) {
      return redis.get(key)
    },

    stop () {
      console.log('closing redis connection')
      redis.close()
    }
  }
  
}

