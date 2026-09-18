import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const kitDirectory = path.join(projectDirectory, "elementor-kit");
const sourceDirectory = path.join(kitDirectory, "fontes-editaveis");
const assetDirectory = path.join(kitDirectory, "assets");

const PUBLIC_ASSET_URL = "https://gdr.vibecodex.pro/assets/";
const WORDPRESS_SITE_URL = "https://gdrconsulting.com.br";

const [pageSource, thankYouSource, cssSource, jsSource] = await Promise.all([
  readFile(path.join(projectDirectory, "index.html"), "utf8"),
  readFile(path.join(projectDirectory, "obrigado.html"), "utf8"),
  readFile(path.join(projectDirectory, "styles.css"), "utf8"),
  readFile(path.join(projectDirectory, "script.js"), "utf8"),
]);

const definitions = [
  {
    key: "config",
    name: "00 — Configuração visual global",
    notes: [
      "Este widget contém fontes, cores, responsividade e estilos da página.",
      "Não remova este widget. Os demais widgets dependem dele.",
    ],
  },
  {
    key: "header",
    name: "01 — Cabeçalho",
    notes: [
      "EDITE: links do menu e texto do botão principal.",
      "LOGO: altere somente o atributo src da imagem, preservando a classe brand-logo.",
    ],
  },
  {
    key: "inicio",
    name: "02 — Hero",
    notes: [
      "EDITE: título em h1, subtítulo em .hero-lead e texto/link do botão.",
      "IMAGEM PRINCIPAL: altere o src dentro de .hero-visual.",
      "LOGOS: adicione ou remova imagens somente dentro de .client-logo-list; o loop é automático.",
    ],
  },
  {
    key: "problemas-cards",
    name: "03 — Problemas que a GDR resolve",
    notes: [
      "EDITE: título, descrição e os artigos .comparison-card.",
      "Para criar outro card, duplique um article completo e altere título e texto.",
    ],
  },
  {
    key: "gdr",
    name: "04 — Apresentação da GDR",
    notes: [
      "EDITE: título, descrição, botão e imagem da equipe.",
      "Preserve as classes existentes para manter o layout responsivo.",
    ],
  },
  {
    key: "metodologia",
    name: "05 — Metodologia",
    notes: [
      "EDITE: título, introdução e os passos numerados da metodologia.",
      "Cada passo é um item li dentro de .method-story-steps.",
    ],
  },
  {
    key: "entregas",
    name: "06 — O que muda quando a GDR entra",
    notes: [
      "EDITE: título e os artigos .deliverable-card.",
      "A ordem e o atributo data-step controlam a sequência visual dos cartões.",
    ],
  },
  {
    key: "resultados",
    name: "07 — Cases de sucesso",
    notes: [
      "EDITE: cada depoimento está em um article .testimonial-slide.",
      "VÍDEO: altere data-video-src. CAPA: altere data-video-poster e o src da imagem.",
      "Ao adicionar um case, crie também uma miniatura correspondente em .testimonial-logo-nav.",
    ],
  },
  {
    key: "faq",
    name: "08 — Perguntas frequentes",
    notes: [
      "EDITE: cada pergunta é um bloco details; summary é a pergunta e p é a resposta.",
      "O comportamento de abrir e fechar é automático.",
    ],
  },
  {
    key: "diagnostico",
    name: "09 — Formulário e CTA",
    notes: [
      "EDITE: textos da coluna .cta-copy e campos dentro de form.lead-form.",
      "INTEGRAÇÃO: substitua action pelo endpoint desejado ou troque apenas este widget pelo formulário nativo do Elementor.",
      "A página de destino atual é /obrigado/.",
    ],
  },
  {
    key: "footer",
    name: "10 — Rodapé",
    notes: [
      "EDITE: frase institucional, Instagram e copyright.",
      "O botão fixo mobile está no final deste widget.",
    ],
  },
  {
    key: "scripts",
    name: "11 — Interações e animações",
    notes: [
      "Este widget controla carrosséis, vídeos, FAQ, logos e animações de rolagem.",
      "Mantenha-o como o último widget da página.",
    ],
  },
];

const idFor = (value) => createHash("sha1").update(value).digest("hex").slice(0, 8);

const findElement = (pattern, label) => {
  const match = pageSource.match(pattern);
  if (!match) throw new Error(`Elemento não encontrado: ${label}`);
  return match[0];
};

const findSection = (id) => findElement(
  new RegExp(`<section\\b[^>]*\\bid=["']${id}["'][^>]*>[\\s\\S]*?<\\/section>`, "i"),
  `section#${id}`,
);

const rewriteForWordPress = (markup) => markup
  .replaceAll('src="assets/', `src="${PUBLIC_ASSET_URL}`)
  .replaceAll("src='assets/", `src='${PUBLIC_ASSET_URL}`)
  .replaceAll('data-video-poster="assets/', `data-video-poster="${PUBLIC_ASSET_URL}`)
  .replaceAll("data-video-poster='assets/", `data-video-poster='${PUBLIC_ASSET_URL}`)
  .replaceAll('action="obrigado.html"', `action="${WORDPRESS_SITE_URL}/obrigado/"`)
  .replaceAll("action='obrigado.html'", `action='${WORDPRESS_SITE_URL}/obrigado/'`)
  .replaceAll("http://127.0.0.1:8080/index.html#resultados", `${WORDPRESS_SITE_URL}/#resultados`);

const commentBlock = (definition) => `<!--
  ================================================================
  ${definition.name}
  ================================================================
  ${definition.notes.join("\n  ")}
  DICA: edite textos e URLs, mas preserve classes e atributos data-*.
-->`;

const header = findElement(/<header class="site-header">[\s\S]*?<\/header>/i, "cabeçalho");
const footer = findElement(/<footer class="site-footer">[\s\S]*?<\/footer>/i, "rodapé");
const stickyCta = findElement(/<a class="mobile-sticky-cta"[\s\S]*?<\/a>/i, "CTA fixo mobile");

const resultsStart = pageSource.indexOf('<section class="section section-light results-showcase');
const resultsEnd = pageSource.indexOf("</section>", resultsStart) + "</section>".length;
const faqStart = pageSource.indexOf('<section class="section faq-section', resultsEnd);
const resultsModal = pageSource.slice(resultsEnd, faqStart).trim();

const globalCss = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;500;600;700;800&family=Poppins:wght@600;700;800;900&display=swap" rel="stylesheet">
<style id="gdr-elementor-global-styles">
/* Remove espaçamentos inseridos pelo Elementor entre os widgets do kit. */
body.elementor-page { margin: 0; overflow-x: clip; }
.gdr-kit-row,
.gdr-kit-row > .e-con-inner,
.gdr-kit-widget,
.gdr-kit-widget > .elementor-widget-container {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  gap: 0 !important;
}

${cssSource}
</style>`;

const interactions = `<script id="gdr-elementor-interactions">
(() => {
  const initializeGdrPage = () => {
    if (document.documentElement.dataset.gdrPageReady === "true") return;
    document.documentElement.dataset.gdrPageReady = "true";

${jsSource.split("\n").map((line) => `    ${line}`).join("\n")}
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeGdrPage, { once: true });
  } else {
    window.requestAnimationFrame(initializeGdrPage);
  }
})();
</script>`;

const markupByKey = {
  config: globalCss,
  header,
  inicio: findSection("inicio"),
  "problemas-cards": findSection("problemas-cards"),
  gdr: findSection("gdr"),
  metodologia: findSection("metodologia"),
  entregas: findSection("entregas"),
  resultados: `${findSection("resultados")}\n${resultsModal}`,
  faq: findSection("faq"),
  diagnostico: findSection("diagnostico"),
  footer: `${footer}\n${stickyCta}`,
  scripts: interactions,
};

const htmlFor = (definition) => `${commentBlock(definition)}\n${rewriteForWordPress(markupByKey[definition.key])}`;

const createHtmlWidget = (definition) => ({
  id: idFor(`widget-${definition.key}`),
  elType: "widget",
  widgetType: "html",
  isInner: false,
  settings: {
    html: htmlFor(definition),
    _css_classes: `gdr-kit-widget gdr-kit-${definition.key}`,
    _element_id: `gdr-widget-${definition.key}`,
  },
  elements: [],
});

const createContainer = (definition) => ({
  id: idFor(`container-${definition.key}`),
  elType: "container",
  isInner: false,
  settings: {
    content_width: "full",
    flex_direction: "column",
    flex_gap: { column: "0", row: "0", isLinked: true, unit: "px", size: 0 },
    padding: { unit: "px", top: "0", right: "0", bottom: "0", left: "0", isLinked: true },
    margin: { unit: "px", top: "0", right: "0", bottom: "0", left: "0", isLinked: true },
    _css_classes: `gdr-kit-row gdr-kit-row-${definition.key}`,
    _element_id: `gdr-container-${definition.key}`,
    html_tag: "div",
  },
  elements: [createHtmlWidget(definition)],
});

const pageTemplate = {
  title: "GDR — Landing Page completa",
  type: "page",
  version: "0.4",
  page_settings: {
    template: "elementor_canvas",
    hide_title: "yes",
    background_background: "classic",
    background_color: "#09090B",
  },
  content: definitions.map(createContainer),
};

const thankYouBody = thankYouSource.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim();
if (!thankYouBody) throw new Error("Conteúdo da página de obrigado não encontrado.");

const thankConfigDefinition = {
  key: "thank-config",
  name: "00 — Configuração visual da página de obrigado",
  notes: ["Contém as fontes e todos os estilos da página de agradecimento."],
};
const thankContentDefinition = {
  key: "thank-content",
  name: "01 — Conteúdo da página de obrigado",
  notes: [
    "EDITE: status, título, mensagem, botão e imagem da equipe.",
    "O botão retorna para a página inicial da GDR.",
  ],
};

markupByKey["thank-config"] = globalCss;
markupByKey["thank-content"] = `<div class="thank-you-page">
${rewriteForWordPress(thankYouBody)
  .replaceAll('href="index.html"', `href="${WORDPRESS_SITE_URL}/"`)
  .replaceAll("href='index.html'", `href='${WORDPRESS_SITE_URL}/'`)}
</div>`;

const thankYouTemplate = {
  title: "GDR — Página de obrigado",
  type: "page",
  version: "0.4",
  page_settings: {
    template: "elementor_canvas",
    hide_title: "yes",
    background_background: "classic",
    background_color: "#070708",
  },
  content: [thankConfigDefinition, thankContentDefinition].map(createContainer),
};

const readme = `# Kit Elementor — GDR Consulting

Compatibilidade preparada:
- Elementor 4.2.4
- Elementor Pro 3.34.0
- Containers Flexbox ativos
- Editor V4/Atomic desativado
- Tema Hello Elementor

## Arquivos para importar

1. \`GDR-Landing-Page-Elementor.json\` — landing page completa.
2. \`GDR-Obrigado-Elementor.json\` — página de agradecimento.

No WordPress, abra **Modelos → Modelos salvos → Importar modelos** e envie o JSON.
Depois, crie uma página com layout **Elementor Canvas** e insira o modelo importado.

## Organização no editor

Cada seção está em um widget HTML independente, nesta ordem:

${definitions.map((item) => `- ${item.name}`).join("\n")}

Todos os widgets possuem comentários no início do HTML indicando os elementos seguros para edição.

## Imagens

Para abrir com fidelidade imediata, o template usa temporariamente:
\`${PUBLIC_ASSET_URL}\`

Uma cópia de todas as imagens está na pasta \`assets\` deste pacote. Depois de enviá-las à Biblioteca de Mídia, substitua a URL-base nos widgets HTML se quiser eliminar a dependência externa.

## Formulário

O formulário HTML mantém o visual original e envia atualmente para:
\`${WORDPRESS_SITE_URL}/obrigado/\`

Para usar o webhook do Integrately com os recursos do Elementor Pro, substitua somente o widget **09 — Formulário e CTA** por um widget Formulário nativo e aplique o CSS visual já fornecido.

## Após importar

1. Elementor → Ferramentas → Regenerar CSS e dados.
2. Limpe o cache do WP Rocket.
3. Confira desktop, tablet e mobile.
4. Não remova os widgets de configuração global e interações.
`;

const previewHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Prévia do Kit Elementor — GDR</title>
</head>
<body class="elementor-page">
  ${definitions.map((definition) => `<div class="e-con gdr-kit-row gdr-kit-row-${definition.key}">
    <div class="elementor-widget-html gdr-kit-widget gdr-kit-${definition.key}">
      <div class="elementor-widget-container">
${htmlFor(definition)}
      </div>
    </div>
  </div>`).join("\n")}
</body>
</html>
`;

await Promise.all([
  mkdir(kitDirectory, { recursive: true }),
  mkdir(sourceDirectory, { recursive: true }),
  mkdir(assetDirectory, { recursive: true }),
]);

await Promise.all([
  writeFile(path.join(kitDirectory, "GDR-Landing-Page-Elementor.json"), `${JSON.stringify(pageTemplate, null, 2)}\n`, "utf8"),
  writeFile(path.join(kitDirectory, "GDR-Obrigado-Elementor.json"), `${JSON.stringify(thankYouTemplate, null, 2)}\n`, "utf8"),
  writeFile(path.join(kitDirectory, "README.md"), readme, "utf8"),
  writeFile(path.join(kitDirectory, "preview.html"), previewHtml, "utf8"),
  writeFile(path.join(sourceDirectory, "gdr-global.css"), cssSource, "utf8"),
  writeFile(path.join(sourceDirectory, "gdr-interacoes.js"), jsSource, "utf8"),
  cp(path.join(projectDirectory, "assets"), assetDirectory, { recursive: true, force: true }),
]);

await Promise.all(definitions.map((definition, index) => writeFile(
  path.join(sourceDirectory, `${String(index).padStart(2, "0")}-${definition.key}.html`),
  `${htmlFor(definition)}\n`,
  "utf8",
)));

await copyFile(
  path.join(projectDirectory, "obrigado.html"),
  path.join(sourceDirectory, "obrigado-original.html"),
);

console.log(`Kit Elementor criado em: ${kitDirectory}`);
console.log(`Widgets HTML na landing page: ${definitions.length}`);
