module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    'postcss-px-to-viewport-8-plugin': {
      unitToConvert: 'px',
      viewportWidth: 375, // 设计稿宽度 (iPhone X/12/13 mini 标准)
      unitPrecision: 5,
      propList: ['*'],
      viewportUnit: 'vw',
      fontViewportUnit: 'vw',
      selectorBlackList: ['ignore-'], // 指定不转换的类名
      minPixelValue: 1,
      mediaQuery: false,
    },
  },
}