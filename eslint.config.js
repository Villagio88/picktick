import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-server']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // PickTick nutzt den React Compiler nicht; die Regel meldet nur, dass der Compiler
      // eine Komponente überspringen würde. Die übrigen Hooks-Regeln bleiben aktiv.
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: ['server/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
])
