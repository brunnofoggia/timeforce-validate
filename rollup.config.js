import babel from 'rollup-plugin-babel';
import { eslint } from 'rollup-plugin-eslint';
import json from 'rollup-plugin-json';
import { terser } from 'rollup-plugin-terser';
import { version } from './package.json';

const globals = {
  'v8n-99xp': 'v8n',
};

const now = new Date();
const year = now.getFullYear();

const banner = `/**
* @license
* validate 99xp
* ----------------------------------
* v${version}
*
* Copyright (c)${year} Bruno Foggia, 99xp.
* Distributed under MIT license
*
* https://validate.99xp.org
*/\n\n`;

const footer = '';

export default [
  {
    input: 'src/validate-99xp.js',
    external: ['v8n-99xp'],
    output: [
      {
        file: 'lib/validate-99xp.js',
        format: 'umd',
        name: 'vl',
        exports: 'named',
        sourcemap: true,
        globals,
        banner,
        footer
      },
      {
        file: 'lib/validate-99xp.esm.js',
        format: 'es'
      }
    ],
    plugins: [
      eslint({ exclude: ['package.json'] }),
      json(),
      babel()
    ]
  },
  {
    input: 'src/validate-99xp.js',
    external: ['v8n-99xp'],
    output: [
      {
        file: 'lib/validate-99xp.min.js',
        format: 'umd',
        name: 'vl',
        exports: 'named',
        sourcemap: true,
        globals,
        banner,
        footer
      }
    ],
    plugins: [
      json(),
      babel(),
      terser({ output: { comments: /@license/ }})
    ]
  }
]
