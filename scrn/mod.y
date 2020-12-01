module [
  Require: [
    mem: "./mem/mod.y"
    http: "./http/mod.y"
  ]
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

  login: fn 

  http/expose :video-chunk "/video-chunk" [/query id chunk]
]
