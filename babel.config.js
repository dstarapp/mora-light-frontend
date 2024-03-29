module.exports = {
    presets: ['@babel/preset-typescript'],
    overrides: [
        {
            include: ['./packages/core'],
            presets: [['@babel/preset-env', { targets: 'defaults, not ie 11' }]],
        },
    ],
};
