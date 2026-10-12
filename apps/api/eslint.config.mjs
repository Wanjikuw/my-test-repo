import root from '../../eslint.config.mjs';

export default [
  ...root,
  {
    // The seeders under src/db are scripts that need the database; nothing else may import it
    // eagerly. Dynamic import() is not covered by this rule, which is the point.
    files: ['src/**/*.ts'],
    ignores: ['src/db/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/db/client', '**/db/client.ts'],
              message:
                'Load the database client with a dynamic import() inside the function that needs it. A static import makes the module unimportable without DATABASE_URL, which fails unit tests on a clean checkout.',
            },
          ],
        },
      ],
    },
  },
];
