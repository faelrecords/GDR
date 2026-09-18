import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const exportDirectory = path.join(projectDirectory, "export");

const [source, css, javascript, thankYouSource] = await Promise.all([
  readFile(path.join(projectDirectory, "index.html"), "utf8"),
  readFile(path.join(projectDirectory, "styles.css"), "utf8"),
  readFile(path.join(projectDirectory, "script.js"), "utf8"),
  readFile(path.join(projectDirectory, "obrigado.html"), "utf8"),
]);

const sectionDefinitions = [
  { id: "inicio", file: "01-hero.html", title: "Hero" },
  { id: "problemas-cards", file: "02-problemas.html", title: "Problemas que a GDR resolve" },
  { id: "gdr", file: "03-apresentacao-gdr.html", title: "Apresentação da GDR" },
  { id: "metodologia", file: "04-metodologia.html", title: "Metodologia" },
  { id: "entregas", file: "05-entregas.html", title: "O que muda quando a GDR entra" },
  { id: "resultados", file: "06-cases-de-sucesso.html", title: "Cases de sucesso" },
  { id: "faq", file: "07-faq.html", title: "Perguntas frequentes" },
  { id: "diagnostico", file: "08-formulario-cta.html", title: "Formulário e CTA" },
];

const sectionFileById = Object.fromEntries(sectionDefinitions.map(({ id, file }) => [id, file]));

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractTagById = (tag, id) => {
  const pattern = new RegExp(`<${tag}\\b[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>[\\s\\S]*?<\\/${tag}>`, "i");
  const match = source.match(pattern);
  if (!match) throw new Error(`Não foi possível localizar ${tag}#${id}.`);
  return match[0];
};

const extractElement = (pattern, label) => {
  const match = source.match(pattern);
  if (!match) throw new Error(`Não foi possível localizar ${label}.`);
  return match[0];
};

const rewritePaths = (markup) => {
  let rewritten = markup
    .replaceAll('src="assets/', 'src="../assets/')
    .replaceAll("src='assets/", "src='../assets/")
    .replaceAll('data-video-poster="assets/', 'data-video-poster="../assets/')
    .replaceAll("data-video-poster='assets/", "data-video-poster='../assets/")
    .replaceAll('action="obrigado.html"', 'action="../obrigado.html"')
    .replaceAll("action='obrigado.html'", "action='../obrigado.html'");

  for (const [id, file] of Object.entries(sectionFileById)) {
    rewritten = rewritten
      .replaceAll(`href="#${id}"`, `href="${file}#${id}"`)
      .replaceAll(`href='#${id}'`, `href='${file}#${id}'`);
  }

  return rewritten;
};

const standaloneDocument = ({ title, markup, pageClass = "" }) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#b9000c">
  <title>${title} | GDR Consulting</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;500;600;700;800&family=Poppins:wght@600;700;800;900&display=swap" rel="stylesheet">
  <style>
${css}

/* Ajustes exclusivos das prévias exportadas. */
html { scroll-behavior: smooth; }
body.export-component-page { min-height: 100vh; overflow-x: clip; }
body.export-component-page > main { min-height: 100vh; }
body.export-component-page .site-header { position: relative; inset: auto; }
body.export-component-page .site-footer { margin-top: 0; }
  </style>
</head>
<body class="export-component-page ${pageClass}">
  <main>
${rewritePaths(markup)}
  </main>
  <script>
${javascript}
  </script>
</body>
</html>
`;

await mkdir(exportDirectory, { recursive: true });

const resultsStart = source.indexOf('<section class="section section-light results-showcase');
const resultsEnd = source.indexOf("</section>", resultsStart) + "</section>".length;
const faqStart = source.indexOf('<section class="section faq-section', resultsEnd);
const resultsModal = source.slice(resultsEnd, faqStart).trim();

for (const definition of sectionDefinitions) {
  let markup = extractTagById("section", definition.id);
  if (definition.id === "resultados") markup += `\n\n${resultsModal}`;
  await writeFile(
    path.join(exportDirectory, definition.file),
    standaloneDocument({ title: definition.title, markup, pageClass: `export-${definition.id}` }),
    "utf8",
  );
}

const header = extractElement(/<header class="site-header">[\s\S]*?<\/header>/i, "cabeçalho");
const footer = extractElement(/<footer class="site-footer">[\s\S]*?<\/footer>/i, "rodapé");

await writeFile(
  path.join(exportDirectory, "00-cabecalho.html"),
  standaloneDocument({ title: "Cabeçalho", markup: header, pageClass: "export-header" }),
  "utf8",
);

await writeFile(
  path.join(exportDirectory, "09-rodape.html"),
  standaloneDocument({ title: "Rodapé", markup: footer, pageClass: "export-footer" }),
  "utf8",
);

const navigationItems = [
  { file: "00-cabecalho.html", title: "Cabeçalho" },
  ...sectionDefinitions,
  { file: "09-rodape.html", title: "Rodapé" },
  { file: "10-obrigado.html", title: "Página de obrigado" },
];

const exportIndex = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Seções exportadas | GDR Consulting</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Poppins:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: dark; --red: #e00016; --surface: #151517; --line: #303034; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #0b0b0d; color: #fff; font-family: Montserrat, sans-serif; }
    main { width: min(1120px, calc(100% - 40px)); margin: 0 auto; padding: 72px 0 96px; }
    h1 { max-width: 760px; margin: 0; font: 800 clamp(2rem, 5vw, 4.4rem)/.98 Poppins, sans-serif; letter-spacing: -.05em; }
    .intro { max-width: 700px; margin: 20px 0 44px; color: #aaaab1; line-height: 1.7; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    a { display: flex; align-items: center; justify-content: space-between; min-height: 92px; padding: 24px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); color: #fff; text-decoration: none; transition: border-color .2s ease, transform .2s ease, background .2s ease; }
    a:hover { border-color: var(--red); background: #1b1517; transform: translateY(-2px); }
    strong { font: 700 1rem/1.3 Poppins, sans-serif; }
    span { color: var(--red); font-size: 1.5rem; }
    @media (max-width: 680px) { main { width: min(100% - 28px, 1120px); padding-top: 48px; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>Seções exportadas da landing page GDR.</h1>
    <p class="intro">Cada arquivo funciona de forma independente e já contém todo o CSS necessário. As imagens continuam centralizadas na pasta de assets do projeto.</p>
    <div class="grid">
      ${navigationItems.map(({ file, title }) => `<a href="${file}"><strong>${title}</strong><span aria-hidden="true">↗</span></a>`).join("\n      ")}
    </div>
  </main>
</body>
</html>
`;

await writeFile(path.join(exportDirectory, "index.html"), exportIndex, "utf8");

const exportedThankYou = thankYouSource
  .replace(
    /<link rel="stylesheet" href="styles\.css[^>]*>/i,
    `<style>\n${css}\n</style>`,
  )
  .replaceAll('src="assets/', 'src="../assets/')
  .replaceAll("src='assets/", "src='../assets/")
  .replaceAll('href="index.html"', 'href="../index.html"')
  .replaceAll("href='index.html'", "href='../index.html'");

await writeFile(path.join(exportDirectory, "10-obrigado.html"), exportedThankYou, "utf8");

console.log(`Exportadas ${sectionDefinitions.length} seções, cabeçalho, rodapé, página de obrigado e índice para ${exportDirectory}`);
