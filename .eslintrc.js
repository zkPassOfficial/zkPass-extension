module.exports = {
  env: {
    es6: true,
    browser:true,
    node:true,
  },
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 8,
  },
  rules: {
    'eol-last': [ 'error', 'never' ],
    'jsdoc/check-tag-names': 0,
    semi: [ 'error', 'never' ],
    'operator-linebreak': [ 'error', 'before' ],
    indent: [ 'error', 2, {
      SwitchCase: 1,
    } ],
    'linebreak-style': 0,
    quotes: [
      'error',
      'single',
    ],
    'no-multiple-empty-lines': [
      'warn',
      {
        max: 2,
        maxBOF: 0,
        maxEOF: 0,
      },
    ],
    'no-console': 'off',
    'no-return-assign': 'off',
    'no-useless-escape': 'off',
    'no-var': 'warn',
    'no-const-assign': 'warn',
    'no-debugger': 'warn',
    'no-caller': 'warn',
    'no-eval': 'error',
    'no-new-func': 'error',
    'no-case-declarations': 'off',
    'no-multi-spaces': 'error',
    'array-bracket-spacing': [ 'error', 'always' ],
  },
  globals: {
    chrome: true
  }
}