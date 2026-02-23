module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start:prod',
      startServerReadyPattern: 'Nest application successfully started',
      url: ['http://localhost:3000'],
      numberOfRuns: 1,
    },
    assert: {
      // https://googlechrome.github.io/lighthouse-ci/docs/configuration.html#preset
      preset: 'lighthouse:recommended',
      assertions: {
        // Relax or disable frontend-specific checks for backend APIs
        'network-dependency-tree-insight': 'warn',
        'unminified-javascript': 'warn',
        'unused-javascript': 'warn',
        'render-blocking-resources': 'warn',
        'forced-reflow-insight': 'warn',
        'document-latency-insight': 'warn',
        // Assertions not be necessary
        'unused-css-rules': 'warn',
        'render-blocking-insight': 'warn',
        'image-delivery-insight': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
