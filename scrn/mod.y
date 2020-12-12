module [
  Require: [
    mem: "./mem/mod.y"
    http: "./http/mod.y"
  ]
  Impl-TypeScript: "./mod.ts"
] [
  key-len: 32

  random-bytes: native [len] :Impl/randomBytes
  pbkdf2: native [pass salt iter len digest] :Impl/pbkdf2
  equals-buffer: native [left right] :Impl/equalsBuffer

  hash-with-salt: fn [pass salt] [pbkdf2 pass salt 1000 key-len "sha1"]

  verify-password: proc [pass /in /out] [
    out either equals-buffer hash-with-salt pass in/salt/buffer in/hash/buffer [1] [2]
  ]

  login: fn [_email password] [
    pipe db/find-one "user" [email: _email] verify-password password
  ]

  create-user: fn [_email password] [
    _salt: random-bytes key-len
    _hash: hash-with-salt password _salt
    db/insert "user" [email: _email hash: _hash salt: _salt]
  ]

]
