/*
 * Eslint config guide:
 * https://www.robertcooper.me/using-eslint-and-prettier-in-a-typescript-project
 */
module.exports = {
  ignorePatterns: ['node_modules', 'dist'],
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint',
      ],
      rules: {
        '@typescript-eslint/ban-ts-comment': 0,
        '@typescript-eslint/ban-types': 0,
        '@typescript-eslint/camelcase': 0,
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-empty-function': 0,
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-unused-vars': 2,
        '@typescript-eslint/no-use-before-define': [
          'error',
          { functions: false },
        ],
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  /*
   * 0: Off
   * 1: Warning
   * 2: Error
   */
  rules: {
    'react/display-name': 0,
    'react/jsx-boolean-value': 2,
    'react/self-closing-comp': 2,
    'react/jsx-curly-brace-presence': [2, 'never'],
    'react-hooks/exhaustive-deps': 1,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
