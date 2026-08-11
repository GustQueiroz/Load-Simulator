import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const layerFences = [
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'domain must stay pure TypeScript (no React).',
            },
            {
              name: 'react-dom',
              message: 'domain must stay pure TypeScript (no React DOM).',
            },
          ],
          patterns: [
            {
              group: ['@/application', '@/application/*', '@/application/**'],
              message: 'domain may not import application.',
            },
            {
              group: ['@/infrastructure', '@/infrastructure/*', '@/infrastructure/**'],
              message: 'domain may not import infrastructure.',
            },
            {
              group: ['@/features', '@/features/*', '@/features/**'],
              message: 'domain may not import features.',
            },
            {
              group: ['@/components', '@/components/*', '@/components/**'],
              message: 'domain may not import components.',
            },
            {
              group: ['@/i18n', '@/i18n/*', '@/i18n/**'],
              message: 'domain may not import i18n.',
            },
            {
              group: ['@xyflow/*', '@xyflow/**'],
              message: 'domain may not import React Flow.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'application must stay free of React.',
            },
            {
              name: 'react-dom',
              message: 'application must stay free of React DOM.',
            },
          ],
          patterns: [
            {
              group: ['@/infrastructure', '@/infrastructure/*', '@/infrastructure/**'],
              message: 'application may not import infrastructure.',
            },
            {
              group: ['@/features', '@/features/*', '@/features/**'],
              message: 'application may not import features.',
            },
            {
              group: ['@/components', '@/components/*', '@/components/**'],
              message: 'application may not import components.',
            },
            {
              group: ['@/i18n', '@/i18n/*', '@/i18n/**'],
              message: 'application may not import i18n (return codes, not copy).',
            },
            {
              group: ['@xyflow/*', '@xyflow/**'],
              message: 'application may not import React Flow.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/infrastructure/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features', '@/features/*', '@/features/**'],
              message: 'infrastructure may not import features.',
            },
            {
              group: ['@/components', '@/components/*', '@/components/**'],
              message: 'infrastructure may not import components.',
            },
            {
              group: ['@xyflow/*', '@xyflow/**'],
              message: 'React Flow is only allowed in features.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/i18n/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features', '@/features/*', '@/features/**'],
              message: 'i18n may not import features.',
            },
            {
              group: ['@/components', '@/components/*', '@/components/**'],
              message: 'i18n may not import components.',
            },
            {
              group: ['@/infrastructure', '@/infrastructure/*', '@/infrastructure/**'],
              message: 'i18n may not import infrastructure.',
            },
          ],
        },
      ],
    },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...layerFences,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
