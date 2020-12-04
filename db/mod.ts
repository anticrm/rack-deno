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

import { MongoClient } from "https://deno.land/x/mongo/mod.ts"
import { Code, Context, bindDictionary } from '../yar/vm.ts'
import { Publisher } from '../yar/async.ts'

export default async () => {

  console.log('connecting to mongodb...')
  const client = new MongoClient()
  await client.connect({ 
    servers: [
      { host: "localhost", port: 27017}
    ]
  })

  const db = client.database('racktest')
    
  return {

    findOne (this: Context, collection: string, query: Code) {
      const out = new Publisher()
      return {
        resume: async () => {
          const dict = {} as { [key: string]: string }
          bindDictionary(query, dict)
          this.vm.exec(query)
          const result = await db.collection(collection).findOne(dict)
          if (result)
            out.write(result)
          out.done(result)
        },
        out
      }
    },

    insert (this: Context, collection: string, data: Code) {
      const out = new Publisher()
      return {
        resume: async () => {
          const dict = {} as { [key: string]: string }
          bindDictionary(data, dict)
          this.vm.exec(data)
          const result = await db.collection(collection).insert(dict)
          out.write(result)
          out.done(result)
        },
        out
      }
    },

    stop () {
      console.log('closing mongodb connection...')
      client.close()
    }
  }
  
}

