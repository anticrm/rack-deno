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
import randomBytes from 'https://deno.land/std/node/_crypto/randomBytes.ts'

export default async () => {

  return { 
    randomBytes(this: Context, len: number) {
      return randomBytes(len)
    },

    pbkdf2(this: Context, pass: string, salt: Buffer, iterations: number, length: number, digest: any) {
      return pbkdf2Sync(pass, salt, iterations, length, digest)
    },

    equalsBuffer(this: Context, left: Buffer, right: Buffer) {
      return left.equals(right)
    },
  
    stop () {
    }
  }
  
}

