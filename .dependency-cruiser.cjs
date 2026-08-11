/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-outer-layers',
      severity: 'error',
      comment: 'domain is the innermost layer and must not import outward.',
      from: { path: '^src/domain' },
      to: {
        path: '^src/(application|infrastructure|features|components|i18n)',
      },
    },
    {
      name: 'application-no-ui-or-infra',
      severity: 'error',
      comment: 'application may only depend on domain (plus its own tree).',
      from: { path: '^src/application' },
      to: {
        path: '^src/(infrastructure|features|components|i18n)',
      },
    },
    {
      name: 'application-no-react',
      severity: 'error',
      comment: 'application must not import React or React Flow.',
      from: { path: '^src/application' },
      to: {
        path: 'node_modules/(react|react-dom|@xyflow)',
      },
    },
    {
      name: 'domain-no-react',
      severity: 'error',
      comment: 'domain must not import React or React Flow.',
      from: { path: '^src/domain' },
      to: {
        path: 'node_modules/(react|react-dom|@xyflow)',
      },
    },
    {
      name: 'infrastructure-no-features',
      severity: 'error',
      comment: 'infrastructure must not import the presentation layer.',
      from: { path: '^src/infrastructure' },
      to: {
        path: '^src/(features|components)',
      },
    },
    {
      name: 'infrastructure-no-react-flow',
      severity: 'error',
      comment: 'React Flow belongs only in features.',
      from: { path: '^src/infrastructure' },
      to: {
        path: 'node_modules/@xyflow',
      },
    },
    {
      name: 'i18n-no-features',
      severity: 'error',
      comment: 'i18n catalogues must not pull presentation or infrastructure.',
      from: { path: '^src/i18n' },
      to: {
        path: '^src/(features|components|infrastructure)',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: ['node_modules', '\\.next', 'out', 'build'],
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['types', 'module', 'main'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
