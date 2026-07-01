const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const files = [
  'src/app/app.ts',
  'src/app/features/admin/admin.ts',
  'src/app/features/auth/login.ts',
  'src/app/features/dashboard/dashboard.ts',
  'src/app/features/dashboard/quotations-list.ts',
  'src/app/features/products/materials.ts',
  'src/app/features/products/skus.ts',
  'src/app/shared/forbidden.ts'
];

function toKebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace('-component', '');
}

const project = new Project({
  tsConfigFilePath: 'tsconfig.json'
});
project.addSourceFilesAtPaths(files);

async function main() {
  for (const filePath of files) {
    const sourceFile = project.getSourceFileOrThrow(filePath);
    const classes = sourceFile.getClasses();
    const components = classes.filter(c => c.getDecorator('Component'));
    const dir = path.dirname(sourceFile.getFilePath());
    
    // Extract imports and generic code from the top of the file
    // To be safe, we will just copy all imports from the original file
    const imports = sourceFile.getImportDeclarations().map(i => i.getText()).join('\n');
    
    for (const comp of components) {
      const decorator = comp.getDecorator('Component');
      const arg = decorator.getArguments()[0];
      if (!arg || !arg.isKind(SyntaxKind.ObjectLiteralExpression)) continue;

      const className = comp.getName();
      const kebabName = toKebabCase(className);
      const baseFilename = `${kebabName}.component`;

      // Extract template
      const templateProp = arg.getProperty('template');
      let templateContent = '';
      if (templateProp) {
        const initializer = templateProp.getInitializer();
        // Remove surrounding backticks or quotes
        // We use substring to strip the first and last char
        const text = initializer.getText();
        templateContent = text.substring(1, text.length - 1);
        templateProp.remove();
        arg.addPropertyAssignment({ name: 'templateUrl', initializer: `'./${baseFilename}.html'` });
      }

      // Extract styles
      const stylesProp = arg.getProperty('styles');
      let stylesContent = '';
      if (stylesProp) {
        const initializer = stylesProp.getInitializer();
        if (initializer.isKind(SyntaxKind.ArrayLiteralExpression)) {
          const elements = initializer.getElements();
          if (elements.length > 0) {
            const text = elements[0].getText();
            stylesContent = text.substring(1, text.length - 1);
          }
        }
        stylesProp.remove();
        arg.addPropertyAssignment({ name: 'styleUrls', initializer: `['./${baseFilename}.scss']` });
      }

      // We must write the new files
      fs.writeFileSync(path.join(dir, `${baseFilename}.html`), templateContent);
      fs.writeFileSync(path.join(dir, `${baseFilename}.scss`), stylesContent);

      // We also need to get the class text
      const classText = comp.getText();
      
      // We will write the new TS file
      // Note: If components reference each other, we might need cross-imports.
      const crossImports = components
        .filter(c => c.getName() !== className)
        .map(c => `import { ${c.getName()} } from './${toKebabCase(c.getName())}.component';`)
        .join('\n');

      // Also copy all interfaces or enums that might be in the original file (if any).
      // A safe way is to include everything in the file that is not a component class.
      const statements = sourceFile.getStatements()
        .filter(s => !components.includes(s) && !s.isKind(SyntaxKind.ImportDeclaration))
        .map(s => s.getText())
        .join('\n\n');

      const fullTsContent = `${imports}\n${crossImports}\n\n${statements}\n\n${classText}\n`;
      fs.writeFileSync(path.join(dir, `${baseFilename}.ts`), fullTsContent);
    }
  }
  console.log("Refactoring complete.");
}

main().catch(console.error);
