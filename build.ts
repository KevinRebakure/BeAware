// Compile to a single self-contained binary. Ink statically imports the optional
// `react-devtools-core` (an optional peer, needed as of Ink 8), which we don't ship, so it is replaced with an empty stub.
const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  compile: { outfile: "dist/beaware" },
  plugins: [
    {
      name: "stub-react-devtools",
      setup(b) {
        b.onResolve({ filter: /^react-devtools-core$/ }, () => ({ path: "react-devtools-core", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export default {};", loader: "js" }));
      },
    },
  ],
});
if (!result.success) {
  result.logs.forEach((l) => console.error(l));
  process.exit(1);
}
