const generate = require('@babel/generator');
const { parse } = require('@babel/parser');

const hooksPlugin = () => {
	let program;
	return {
		visitor: {
			Program(path) {
				program = path;
			},
			JSXElement: {
				exit(path) {
					// console.log(path, 'exit');
				}
			},
			JSXAttribute(path) {
				console.log(path, 'attribute');
			},
			ReturnStatement(path) {
				// console.log(path, 'return');
			}
		}
	};
};

module.exports = hooksPlugin;
