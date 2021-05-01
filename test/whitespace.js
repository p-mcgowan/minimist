const parse = require('../dist/index').minimist;

const test = require('tape');

test('whitespace should be whitespace', function (t) {
  t.plan(1);
  const x = parse(['-x', '\t']).x;
  t.equal(x, '\t');
});
