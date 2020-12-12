module [
  Require: [
    mem: "./mem/mod.y"
    http: "./http/mod.y"
    db: "./db/mod.y"
  ]
  Impl-TypeScript: "./mod.ts"
] [
  key-len: 32

  random-bytes: native [len] :Impl/randomBytes
  pbkdf2: native [pass salt iter len digest] :Impl/pbkdf2
  buffer: native [binary] :Impl/buffer
  equals-buffer: native [left right] :Impl/equalsBuffer
  to-string: native [object] :Impl/toStr
  from-string: native [str] :Impl/fromStr

  hash-with-salt: fn [pass salt] [pbkdf2 pass salt 1000 key-len "sha1"]

  verify-password: proc [pass /in /out] [
    out either (to-string hash-with-salt pass from-string in/salt) = in/hash [1] [2]
  ]

  login: fn [_email password] [
    pipe db/find-one "user" [email: _email] verify-password password
  ]

  create-user: fn [_email password] [
    _salt: random-bytes key-len
    _hash: hash-with-salt password _salt
    db/insert "user" [email: _email hash: to-string _hash salt: to-string _salt]
  ]

]
