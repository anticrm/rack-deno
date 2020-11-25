
module [] [
  await pipe import-js-module "./mod.ts" set 'impl
  set: native-async [key] "application/octet-stream" :impl/set 
]
