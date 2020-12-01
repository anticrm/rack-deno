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

import { Context } from '../yar/vm.ts'
import { Buffer } from 'https://deno.land/std/node/buffer.ts'
import { pbkdf2Sync } from 'https://deno.land/std/node/_crypto/pbkdf2.ts'

function hashWithSalt (password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, 1000, 32, 'sha256')
}

export default async () => {

  return { 
    compareHash(this: Context, password: string, hash: Buffer, salt: Buffer) {
      return true
    },
  
    stop () {
    }
  }
  
}

