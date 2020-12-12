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
import { Base64 } from "https://deno.land/x/bb64/mod.ts"

async function main() {
  console.log('rackOS v0.1.0 (c) copyright 2020 Anticrm Project Contributors. All rights reserved.')
  let server = 'localhost'
  let user: string | undefined
  let password: string | undefined
  while(true) {
    try {
      await Deno.stdout.write(new TextEncoder().encode('rackOS> '))
      const input = await readLines(Deno.stdin).next()
      const code = input.value
      if (code.startsWith('server')) {
        const values = code.split(' ')
        server = values[1]
      } else if (code.startsWith('user')) {
        const values = code.split(' ')
        user = values[1]
      } else if (code.startsWith('password')) {
        const values = code.split(' ')
        password = values[1]
      } else {
        const response = await fetch('http://' + server + ':8086/do?do=' + encodeURIComponent(code),
          user && password ?
            {
              headers: { 'authorization': 'Basic ' + Base64.fromString(user + ':' + password).toString() }
            } : {}
        )
        console.log(response.status + ' ' + response.statusText)
        console.log(await response.text())
      }
    } catch (err) {
      console.log(err)
    }
  }
}

main()
