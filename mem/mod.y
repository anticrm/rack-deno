
module [] [
  impl: import-js-module "./mod.ts"
  set: native [key value] :impl/set
  get: native [key] :impl/get
]
