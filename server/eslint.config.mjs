// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      // Raw SQL only through Prisma's tagged templates, which bind every interpolation as a
      // parameter. The *Unsafe variants splice strings into the SQL text: SQL injection.
      'no-restricted-properties': [
        'error',
        { property: '$queryRawUnsafe', message: 'Use the $queryRaw tagged template: it parameterizes every value.' },
        { property: '$executeRawUnsafe', message: 'Use the $executeRaw tagged template: it parameterizes every value.' },
      ],
    },
  },
);
