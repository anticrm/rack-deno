module [
  Require: [mem http]
] [
  new-video: proc [/local id] [
    id: uuid
    job save-video transcode get-video
  ]

  video-key: proc [id chunk] [join id ["." chunk]]

  get-video: async [id /out /local chunk] [
    chunk: 0
    while [unset? mem/get join video-key id chunk ".last"]] [      
      copy mem/get video-key id chunk out
      chunk: add chunk 1      
    ]
  ]

  video-chunk: proc [id chunk] [
    mem/set video-key id chunk in
  ]

  http/expose :video-chunk "/video-chunk" [/query id chunk]
  http/expose :video-chunk "/video-chunk" [/query id chunk]
  http/expose :video-chunk "/video-chunk" [/query id chunk]
]

module [
  Require: [
    mem: "./mem/mod.y"
    http: "./http/mod.y"
  ]
  Impl-TypeScript: "./mod.ts"
] [
  new-video: fn [/local id] [
    id: uuid
  ]

  video-key: fn [id chunk] [join id ["." chunk]]

  get-video: proc [id /out /local chunk] [
    chunk: 0
    while [unset? mem/get join video-key id chunk ".last"] [      
      copy mem/get video-key id chunk out
      chunk: add chunk 1      
    ]
  ]

  video-chunk: proc [id chunk /in] [
    mem/set video-key id chunk in
  ]

  verify-password: proc [/in /out] [
    if compare-md5 password in/password [out jwt-encode [email: in/email]] [throw "password does not match"]
  ]

  login: proc [email password] [
    db/find-one "user" [email: email] | verify-password
  ]

  http/expose :video-chunk "/video-chunk" [/query id chunk]
]
