import * as esbuild from 'esbuild'
//import pkg from './package.json'
//const dependencies = () => Object.keys(pkg.dependencies)

const formats = {
  'esm': '.mjs',
  'cjs': '.js'
} as { [key in esbuild.Format]: string }

Object.keys(formats).forEach(key => {
  const extension = formats[key]

  esbuild.build({
    entryPoints: [
      './src/index.ts',
    ],
    external: ['form-data'],
    bundle: true,
    format: key as esbuild.Format,
    outExtension: { '.js': extension },
    outdir: `./dist`
  })
})
