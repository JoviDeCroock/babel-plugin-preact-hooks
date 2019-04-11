const { transformSync } = require('@babel/core');
const jsx = require('@babel/plugin-syntax-jsx');
const hooksPlugin = require('../src');

describe('babel-plugin-preact-hooks', () => {
	it('Should replace a top-level function without dependencies', () => {
		const code = transform(`
      () => {
        const clickAlert = () => alert('clicked')
        return (
          <button onClick={clickAlert} />
        )
      }
    `);

		expect(code).toEqual(`
      () => {
        const clickAlert = useCallback(() => alert('clicked'), []);
        return <button onClick={clickAlert} />;
      };
    `);
	});
});

const transform = (code) => transformSync(code, {
	plugins: [hooksPlugin, jsx],
	code: true,
	ast: false
}).code;
