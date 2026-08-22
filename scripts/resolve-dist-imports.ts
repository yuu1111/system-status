import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const relativeSpecifier =
	/((?:from\s+|import\s*\(\s*)["'])(\.\.?\/[^"']+)(["'])/g;

async function filesIn(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await filesIn(path)));
		else if (entry.isFile() && /(?:\.js|\.d\.ts)$/.test(entry.name))
			files.push(path);
	}
	return files;
}

function addJavaScriptExtension(source: string): string {
	return source.replace(
		relativeSpecifier,
		(match, prefix, specifier, suffix) => {
			if (/\.[^/]+$/.test(specifier)) return match;
			return `${prefix + specifier}.js${suffix}`;
		},
	);
}

for (const file of await filesIn("dist")) {
	const source = await readFile(file, "utf8");
	const rewritten = addJavaScriptExtension(source);
	if (rewritten !== source) await writeFile(file, rewritten);
}
