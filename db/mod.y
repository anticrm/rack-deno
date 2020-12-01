module [
  Impl-TypeScript: "./mod.ts"
] [
  find-one: native [collection query] :Impl/findOne
  insert: native [colletion data] :Impl/insert
]
