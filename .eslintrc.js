module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:prettier/recommended', // enables eslint-plugin-prettier + eslint-config-prettier
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        indent: ['error', 2],
        'prettier/prettier': ['error', { tabWidth: 2 }],
        "no-restricted-imports": [
            "error",
            {
                "patterns": [{ "regex": "^@mui/[^/]+$" }]
            }
        ]
    },
};
