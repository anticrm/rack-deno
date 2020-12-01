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
