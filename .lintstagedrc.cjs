module.exports = {
  '.ai/kenkeep/nodes/**/*.md': () => ['node ./dist/cli.js index rebuild --stage'],
};
