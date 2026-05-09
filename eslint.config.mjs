import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import importPlugin from 'eslint-plugin-import'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const asArray = (config) => Array.isArray(config) ? config : [config]

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/tinymce/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  ...asArray(nextVitals),
  ...asArray(nextTypescript),
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'import/no-anonymous-default-export': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react/no-unescaped-entities': 'error',
    },
  },
]

export default config
