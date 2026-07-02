const { Project } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({
  tsConfigFilePath: 'tsconfig.json'
});

const featuresDir = path.join(__dirname, 'src/app/features');
const features = ['admin', 'auth', 'dashboard', 'products'];

// Components to KEEP at the root of their feature folder
const rootComponents = [
  'admin.component',
  'login.component',
  'dashboard.component',
  'skus.component',
  'materials.component'
];

async function main() {
  project.addSourceFilesAtPaths('src/**/*.ts');

  // Find all components in the targeted features
  const sourceFiles = project.getSourceFiles();

  for (const sf of sourceFiles) {
    const filePath = sf.getFilePath();
    
    // Only process files in our targeted feature folders
    if (!features.some(f => filePath.includes(`/features/${f}/`))) {
      continue;
    }

    const basename = path.basename(filePath, '.ts');
    
    // Skip if it's not a component file
    if (!basename.endsWith('.component')) {
      continue;
    }

    // Skip root components
    if (rootComponents.includes(basename)) {
      continue;
    }

    const folderName = basename.replace('.component', '');
    const dir = path.dirname(filePath);

    // If it's already inside a folder with its name, skip
    if (path.basename(dir) === folderName) {
      continue;
    }

    const newDir = path.join(dir, folderName);
    
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }

    const htmlFile = path.join(dir, `${basename}.html`);
    const scssFile = path.join(dir, `${basename}.scss`);
    const newHtmlFile = path.join(newDir, `${basename}.html`);
    const newScssFile = path.join(newDir, `${basename}.scss`);

    if (fs.existsSync(htmlFile)) {
      fs.renameSync(htmlFile, newHtmlFile);
    }
    
    if (fs.existsSync(scssFile)) {
      fs.renameSync(scssFile, newScssFile);
    }

    // Move the TS file using ts-morph to automatically update imports elsewhere
    const newTsPath = path.join(newDir, `${basename}.ts`);
    sf.moveToDirectory(newDir);
    
    // Wait! ts-morph moves the file, but we need to update the decorator paths (templateUrl, styleUrls)
    // Actually, since the HTML and SCSS move with it to the same directory, the relative paths `./name.component.html` remain the SAME!
    // We do not need to change templateUrl or styleUrls because they are relative to the TS file.
  }

  console.log('Files moved. Saving project to update imports...');
  await project.save();
  console.log('Refactoring complete.');
}

main().catch(console.error);
