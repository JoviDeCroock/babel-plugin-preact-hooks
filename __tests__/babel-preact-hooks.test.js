const { transformSync } = require('@babel/core');
const jsx = require('@babel/plugin-syntax-jsx');
const hooksPlugin = require('../src');

describe('babel-plugin-preact-hooks', () => {
	describe('useCallback', () => {
		it('Should replace a top-level function without dependencies', () => {
			const code = transform(`
        () => {
          const clickAlert = () => alert('clicked')
          return (
            <button onClick={clickAlert} />
          )
        }
      `);
  
			expect(code).toEqual(
				'import { useCallback as _useCallback } from "preact/hooks";\n' +
				'\n' +
				'() => {\n' +
        "  const clickAlert = _useCallback(() => alert('clicked'), []);\n\n" +
        '  return <button onClick={clickAlert} />;\n' +
				'};'
			);
		});

		it('Should not add the import twice', () => {
			const code = transform(`
        () => {
					const clickAlert = () => alert('clicked')
					const clickAlert2 = () => alert('clicked2')
          return (
            <button onClick={clickAlert} onClick2={clickAlert2} />
          )
        }
      `);
  
			expect(code).toEqual(
				'import { useCallback as _useCallback } from "preact/hooks";\n' +
				'\n' +
				'() => {\n' +
        "  const clickAlert = _useCallback(() => alert('clicked'), []);\n\n" +
        "  const clickAlert2 = _useCallback(() => alert('clicked2'), []);\n\n" +
        '  return <button onClick={clickAlert} onClick2={clickAlert2} />;\n' +
				'};'
			);
		});

		it('Should not make a conditional callback', () => {
			const code = transform(`
        ({ y }) => {
					let x;
					if (y) {
						x = () => alert('clicked');
					}
          return <button onClick={x} />
        }
      `);
  
			expect(code).toEqual(
				'({\n' +
				'  y\n' +
				'}) => {\n' +
				'  let x;\n\n' +
				'  if (y) {\n' +
				"    x = () => alert('clicked');\n" +
				'  }\n\n' +
        '  return <button onClick={x} />;\n' +
				'};'
			);
		});

		it('Should not make a callback in a function', () => {
			const code = transform(`
        () => {
          return ['1'].map(x => <button onClick={() => alert('clicked', x)} />)
        }
      `);
  
			expect(code).toEqual(
				'() => {\n' +
        "  return ['1'].map(x => <button onClick={() => alert('clicked', x)} />);\n" +
				'};'
			);
		});

		it('Should ignore conditional callbacks', () => {
			const code = transform(`
        ({ x }) => {
					let clickAlert = () => {}
					if (x) {
						clickAlert = () => alert('clicked')
					}
          return (
            <button onClick={clickAlert} />
          )
        }
      `);
  
			expect(code).toEqual(
				'({\n' +
				'  x\n' +
				'}) => {\n' +
				'  let clickAlert = () => {};\n\n' +
				'  if (x) {\n' +
				"    clickAlert = () => alert('clicked');\n" +
				'  }\n\n' +
        '  return <button onClick={clickAlert} />;\n' +
				'};'
			);
		});

		it.skip('Should replace an inline function without dependencies', () => {
			const code = transform(`
        () => {
          return (
            <button onClick={() => alert('clicked')} />
          )
        }
      `);
  
			expect(code).toEqual('() => {\n' +
        "  const clickAlert = useCallback(() => alert('clicked'), []);\n" +
        '  return <button onClick={clickAlert} />;\n' +
      '};');
		});
	});

	describe('useMemo', () => {
		it('Should replace a simple memoization', () => {
			const code = transform(`
	      () => {
	        const number = 1 + 1;
	        return <p>{number}</p>
	      }
	    `);
  
			expect(code).toEqual(
				'import { useMemo as _useMemo } from "preact/hooks";\n' +
				'\n' +
				'() => {\n' +
	      '  const number = _useMemo(() => 1 + 1, []);\n\n' +
	      '  return <p>{number}</p>;\n' +
	    '};');
		});

		it('Should replace a top-level array function with dependencies', () => {
			const code = transform(`
	      ({ array }) => {
	        const parents = array.filter(p => p.age > 40);
	        return <div>{parents.map(p => p.name)}</div>
	      }
	    `);
  
			expect(code).toEqual(
				'import { useMemo as _useMemo } from "preact/hooks";\n' +
				'\n' +
				'({\n' +
	      '  array\n' +
				'}) => {\n' +
	      '  const parents = _useMemo(() => array.filter(p => p.age > 40), [array, array.filter]);\n\n' +
	      '  return <div>{parents.map(p => p.name)}</div>;\n' +
	    '};');
		});
	});

});

const transform = (code) => transformSync(code, {
	plugins: [hooksPlugin, jsx],
	code: true,
	ast: false
}).code;
