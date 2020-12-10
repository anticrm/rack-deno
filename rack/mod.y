
module [
  Require: [
    mem: "./mem/mod.y"
    http: "./http/mod.y"
  ]
  Impl-TypeScript: "./mod.ts"
] [
  deploy: native [id module] :Impl/deploy
  exec: native [server code] :Impl/exec

  verify-key: proc [secret /in /out] [either in = secret [out 1] [throw "key and secret does not match"]]

  user-auth: fn [auth] [
    x: split auth " "
    either x/0 = "Basic" [
      pair: split debase x/1 ":"
      (mem/get pair/0) | verify-key pair/1
    ] [
      throw "expecting Basic authorization"
    ]
  ]

  http/expose :do "/do" [/query do /auth :user-auth] 
]
