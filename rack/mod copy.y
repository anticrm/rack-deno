#
#  Copyright © 2020 Anticrm Platform Contributors.
#  
#  Licensed under the Eclipse Public License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License. You may
#  obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
#  
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  
#  See the License for the specific language governing permissions and
#  limitations under the License.
#


module [
  Require: [
    mem: "./mem/mod.y"
    http: "./http/mod.y"
  ]
  Impl-TypeScript: "./mod.ts"
] [
  deploy: native [id module] :Impl/deploy

  user-auth: fn [auth] [
    x: split auth " "
    either x/0 == "Basic" [
      pair: split debase x[1] ":"
      mem/get pair/0 | proc [/in /out] [either in == pair/1 [out 1] [throw "key and secret does not match"]]
    ] [
      throw "expecting Basic authorization"
    ]
  ]

  http/expose :do [/requestBody "text/plain" /responseBody "application/json" /auth :user-auth]
]
