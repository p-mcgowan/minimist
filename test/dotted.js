const parse = require('../dist/index').minimist;
const test = require('tape');

test('dotted alias', function (t) {
  const argv = parse(['--a.b', '22'], { default: { 'a.b': 11 }, alias: { 'a.b': 'aa.bb' } });
  t.equal(argv['a.b'], 22);
  t.equal(argv['aa.bb'], 22);
  t.end();
});

test('dotted default', function (t) {
  const argv = parse('', { default: { 'a.b': 11 }, alias: { 'a.b': 'aa.bb' } });
  t.equal(argv['a.b'], 11);
  t.equal(argv['aa.bb'], 11);
  t.end();
});

test('dotted default with no alias', function (t) {
  const argv = parse('', { default: { 'a.b': 11 } });
  t.equal(argv['a.b'], 11);
  t.end();
});
