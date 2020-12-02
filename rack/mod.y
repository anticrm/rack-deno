
module [
  Require: [
    mem: "./mem/mod.y"
    http: "./http/mod.y"
  ]
  Impl-TypeScript: "./mod.ts"
] [
  deploy: native [id module] :Impl/deploy

  http/expose :do [/requestBody "text/plain" /responseBody "application/json"]
]
