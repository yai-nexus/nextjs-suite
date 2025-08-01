import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const external = ['next', 'react', 'react-dom'];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/__tests__/**'],
      }),
    ],
  },
  {
    input: 'src/decorators/index.ts',
    output: [
      {
        file: 'dist/decorators/index.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/decorators/index.cjs',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/__tests__/**'],
      }),
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
  {
    input: 'src/decorators/index.ts',
    output: {
      file: 'dist/decorators/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
];