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
import { Context } from '../y/vm.ts'

let redis: Redis 

async function start() {
  redis = await connect({
    hostname: "127.0.0.1",
    port: 6379
  })
}

function getClient(): Redis {
  return redis
}

export async function set(this: Context, key: string, value: string) {
  return getClient().set(key, value)
}

export async function get(this: Context, key: string) {
  return getClient().get(key)
}
