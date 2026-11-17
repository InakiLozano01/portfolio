import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const asArray = (config) => Array.isArray(config) ? config : [config]
const upstreamConfigs = [...asArray(nextVitals), ...asArray(nextTypescript)]
const plugins = Object.assign({}, ...upstreamConfigs.map(config => config.plugins ?? {}))

const config = [
  {
    ignores: [
      '.next/**',
      '.next-test/**',
      'node_modules/**',
      'public/tinymce/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  ...upstreamConfigs,
  {
    plugins,
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
