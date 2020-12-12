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

export declare type BinarySequence = Uint8Array | Buffer | number[];

/**
 * A class representation of the BSON Binary type.
 * @public
 */
export declare class Binary {
  _bsontype: "Binary";
  /* Excluded from this release type: BSON_BINARY_SUBTYPE_DEFAULT */
  /** Initial buffer default size */
  static readonly BUFFER_SIZE = 256;
  /** Default BSON type */
  static readonly SUBTYPE_DEFAULT = 0;
  /** Function BSON type */
  static readonly SUBTYPE_FUNCTION = 1;
  /** Byte Array BSON type */
  static readonly SUBTYPE_BYTE_ARRAY = 2;
  /** Deprecated UUID BSON type @deprecated Please use SUBTYPE_UUID */
  static readonly SUBTYPE_UUID_OLD = 3;
  /** UUID BSON type */
  static readonly SUBTYPE_UUID = 4;
  /** MD5 BSON type */
  static readonly SUBTYPE_MD5 = 5;
  /** User BSON type */
  static readonly SUBTYPE_USER_DEFINED = 128;
  buffer: Buffer;
  sub_type: number;
  position: number;
  /**
   * @param buffer - a buffer object containing the binary data.
   * @param subType - the option binary type.
   */
  constructor(buffer?: string | BinarySequence, subType?: number);
  /**
   * Updates this binary with byte_value.
   *
   * @param byteValue - a single byte we wish to write.
   */
  put(byteValue: string | number | Uint8Array | Buffer | number[]): void;
  /**
   * Writes a buffer or string to the binary.
   *
   * @param sequence - a string or buffer to be written to the Binary BSON object.
   * @param offset - specify the binary of where to write the content.
   */
  write(sequence: string | BinarySequence, offset: number): void;
  /**
   * Reads **length** bytes starting at **position**.
   *
   * @param position - read from the given position in the Binary.
   * @param length - the number of bytes to read.
   */
  read(position: number, length: number): BinarySequence;
  /**
   * Returns the value of this binary as a string.
   * @param asRaw - Will skip converting to a string
   * @remarks
   * This is handy when calling this function conditionally for some key value pairs and not others
   */
  value(asRaw?: boolean): string | BinarySequence;
  /** the length of the binary sequence */
  length(): number;
  /* Excluded from this release type: toJSON */
  /* Excluded from this release type: toString */
  /* Excluded from this release type: toExtendedJSON */
  /* Excluded from this release type: fromExtendedJSON */
}

export default async () => {

  return { 
    randomBytes(this: Context, len: number) {
      return randomBytes(len)
    },

    pbkdf2(this: Context, pass: string, salt: Buffer, iterations: number, length: number, digest: any) {
      return pbkdf2Sync(pass, salt, iterations, length, digest)
    },

    buffer(this: Context, binary: Binary) {
      console.log('return buffer, length: ' + binary.length())
      const x = binary.buffer
      console.log('len', x.length)
      console.log('converted', x)
      return x
    },

    toStr(this: Context, object: Buffer) {
      return object.toString('base64')
    },

    fromStr(this: Context, str: string) {
      return Buffer.from(str, 'base64')
    },

    equalsBuffer(this: Context, left: Buffer, right: Buffer) {
      console.log('comparing')
      console.log(left)
      console.log(right)
      console.log(left[0])
      console.log(right[0])

      console.log(left.equals(right))
      return left.equals(right)
      //return right.equals(left)
    },
  
    stop () {
    }
  }
  
}

