const generate = require('@babel/generator').default;
const { parse } = require('@babel/parser');
const { addNamed } = require('@babel/helper-module-imports');

const hooksPlugin = ({ types }) => {
	let program, addedCallback, cbImport, addedMemo, memoImport;
	// Helpers!
	const isAnyFunctionExpression = node => node && (types.isArrowFunctionExpression(node) || types.isFunctionExpression(node));
	// Dependent on the fact whether or not this becomes a standard...
	const isHook = node => /^use/.test(node.name) || /^use/.test(node.property.name);

	const getDependencyArgs = parent => {
		const values = [];
		parent.traverse({
			Identifier: {
				enter(path) {
					if (
						values.includes(path.node.name) ||
						!parent.scope.hasBinding(path.node.name) ||
						(parent.node.params && parent.node.params.some(param => param.name === path.node.name))
					) return;
					values.push(path.node.name);
				}
			},
			MemberExpression: {
				exit(path) {
					const expression = generate(path.node).code;
					if (/[^.$\w]/.test(expression)) return;
					const rootIdentifier = expression.split('.')[0];
					if (!values.includes(rootIdentifier) || values.includes(expression)) return;
					values.push(expression);
				}
			}
		});
		return values;
	};

	const getAllOwnBindings = scope => {
		const allBindings = scope.getAllBindings();

		return Object.keys(allBindings).reduce((ownBindings, bindingName) => {
			const binding = allBindings[bindingName];

			if (scope.hasOwnBinding(bindingName)) {
				ownBindings[bindingName] = binding;
			}

			return ownBindings;
		}, {});
	};

	const injectCallback = (callbackName, callbackBody) => {
		const values = getDependencyArgs(callbackBody);
		callbackBody = generate(callbackBody.node).code;
		if (!addedCallback) {
			const { name } = addNamed(program, 'useCallback', 'preact/hooks');
			cbImport = name;
			addedCallback = true;
		}
		return parse(`
				const ${callbackName} = ${cbImport}(${callbackBody}, [${values}])
			`).program.body[0];
	};

	const injectMemo = (memoName, memoBody) => {
		const values = getDependencyArgs(memoBody);
		memoBody = generate(memoBody.node).code;
		if (!addedMemo) {
			const { name } = addNamed(program, 'useMemo', 'preact/hooks');
			memoImport = name;
			addedMemo = true;
		}
		return parse(`
				const ${memoName} = ${memoImport}(() => ${memoBody}, [${values}])
			`).program.body[0];
	};

	return {
		visitor: {
			Program(path) {
				// Used to add imports if need be.
				program = path;
				addedCallback = false;
				addedMemo = false;
				cbImport = '';
				memoImport = '';
			},
			ReturnStatement(path) {
				if (!types.isJSXElement(path.node.argument) || !isAnyFunctionExpression(path.parentPath.parentPath.node)) return;
				const ownBindings = getAllOwnBindings(path.scope);
				Object.keys(ownBindings).forEach(bindingName => {
					const binding = ownBindings[bindingName];
					if (
						!binding.constant ||
						!types.isVariableDeclarator(binding.path.node) ||
						(types.isCallExpression(binding.path.node.init) && isHook(binding.path.node.init.callee))
					) return;
					const injectReplacement = isAnyFunctionExpression(binding.path.node.init) ? injectCallback : injectMemo;
					const wrappedAssignment = injectReplacement(bindingName, binding.path.get('init'));
					binding.path.parentPath.replaceWith(wrappedAssignment);
				});
			}
		}
	};
};

module.exports = hooksPlugin;
