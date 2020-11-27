module [] [
  impl: import-js-module "./mod.ts"
  expose: native [fn path params] :impl/expose
]
