import { configApp } from '@adonisjs/eslint-config'
export default configApp({
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'interface',
      format: ['PascalCase'],
      custom: {
        regex: '^I[A-Z]',
        match: true,
      },
    },
  ],
})
