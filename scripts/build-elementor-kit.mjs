import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const wordpressDirectory = path.join(projectDirectory, "export", "wordpress");
const kitDirectory = path.join(wordpressDirectory, "elementor-kit");
const sourceDirectory = path.join(kitDirectory, "fontes-editaveis");
const widgetDirectory = path.join(wordpressDirectory, "widgets-html");
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

const elementorCompatibilityCss = `/* Correção de largura para menu e rodapé dentro do Elementor. */
.gdr-kit-row-header,
.gdr-kit-row-footer {
  position: relative;
  left: 50%;
  width: 100vw !important;
  max-width: 100vw !important;
  margin-right: -50vw !important;
  margin-left: -50vw !important;
}

.gdr-kit-header .site-header,
.gdr-kit-footer .site-footer {
  width: 100%;
  max-width: none;
}

/* Protege a cor do botão contra o estilo global do tema. */
.gdr-kit-diagnostico .lead-form .form-submit.button-red {
  color: #fff !important;
  background: #c80012 !important;
}`;

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

${elementorCompatibilityCss}

${cssSource}
</style>`;

const elementorJsSource = jsSource
  .replace('? (window.matchMedia("(min-width: 761px)").matches ? .96 : .36)', '? (window.matchMedia("(min-width: 761px)").matches ? .45 : .28)')
  .replace('threshold: [0, .1, .36, .96]', 'threshold: [0, .1, .28, .45]')
  .replace('rootMargin: "0px 0px -10%"', 'rootMargin: "0px 0px -4%"');

const interactions = `<script id="gdr-elementor-interactions" data-nowprocket data-no-optimize="1" data-cfasync="false">
(() => {
  const initializeGdrPage = () => {
    if (document.documentElement.dataset.gdrPageReady === "true") return;
    if (!document.querySelector("#inicio") || !document.querySelector("#resultados")) return;
    document.documentElement.dataset.gdrPageReady = "true";

${elementorJsSource.split("\n").map((line) => `    ${line}`).join("\n")}
  };

  const scheduleGdrInitialization = () => window.requestAnimationFrame(initializeGdrPage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleGdrInitialization, { once: true });
  } else {
    scheduleGdrInitialization();
  }

  window.addEventListener("load", scheduleGdrInitialization, { once: true });
  window.addEventListener("pageshow", scheduleGdrInitialization, { once: true });
  window.addEventListener("elementor/frontend/init", scheduleGdrInitialization, { once: true });
  if (window.jQuery) window.jQuery(window).one("elementor/frontend/init", scheduleGdrInitialization);
  window.setTimeout(scheduleGdrInitialization, 350);
  window.setTimeout(scheduleGdrInitialization, 1200);
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

const localFixFor = (key) => {
  if (key === "header") return `<style>
/* Correção local: menu em largura total no Elementor. */
.gdr-kit-row-header {
  position: relative;
  left: 50%;
  width: 100vw !important;
  max-width: 100vw !important;
  margin-right: -50vw !important;
  margin-left: -50vw !important;
}
.gdr-kit-header .site-header { width: 100%; max-width: none; }
</style>`;

  if (key === "footer") return `<style>
/* Correção local: rodapé em largura total no Elementor. */
.gdr-kit-row-footer {
  position: relative;
  left: 50%;
  width: 100vw !important;
  max-width: 100vw !important;
  margin-right: -50vw !important;
  margin-left: -50vw !important;
}
.gdr-kit-footer .site-footer { width: 100%; max-width: none; }
</style>`;

  if (key === "diagnostico") return `<style>
/* Impede o tema do WordPress de trocar a cor do botão do formulário. */
.gdr-kit-diagnostico .lead-form .form-submit.button-red {
  color: #fff !important;
  background: #c80012 !important;
}
</style>`;

  return "";
};

const htmlFor = (definition) => [
  commentBlock(definition),
  localFixFor(definition.key),
  rewriteForWordPress(markupByKey[definition.key]),
].filter(Boolean).join("\n");

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

const graphiteThemeCss = `<style id="gdr-graphite-theme">
/*
  OPÇÃO VISUAL 02 — GRAFITE + TRANSIÇÕES SUAVES
  Edite aqui somente se quiser ajustar os tons ou a altura dos degradês.
*/
:root {
  --gdr-graphite: #1a1b1e;
  --gdr-graphite-deep: #141518;
  --gdr-graphite-soft: #222328;
}

body.elementor-page {
  background: var(--gdr-graphite);
}

.site-header,
.site-header.is-scrolled {
  background: rgba(26, 27, 30, .94);
}

.hero {
  background: var(--gdr-graphite);
}

.hero-shell {
  border-color: #3a3b40;
  background:
    radial-gradient(circle at 88% 36%, rgba(200, 0, 18, .17), transparent 31%),
    linear-gradient(135deg, #202125 0%, #18191c 58%, #242024 100%);
}

.client-logos {
  background: linear-gradient(180deg, var(--gdr-graphite) 0%, #1d1e22 100%);
}

/* Grafite para claro: hero → problemas. */
#problemas-cards {
  background: linear-gradient(180deg, var(--gdr-graphite) 0%, #f5f3ef 105px, #f5f3ef 100%);
}

.consultants-showcase {
  background: var(--gdr-graphite);
}

/* Claro para imagem escura: problemas → apresentação da equipe. */
#gdr.consultants-showcase::before {
  content: "";
  position: absolute;
  z-index: 4;
  inset: 0 0 auto;
  height: 92px;
  pointer-events: none;
  background: linear-gradient(180deg, #f5f3ef 0%, rgba(245,243,239,.72) 28%, transparent 100%);
}

.consultants-shade {
  background: linear-gradient(90deg, rgba(26,27,30,.98) 0%, rgba(26,27,30,.86) 44%, rgba(26,27,30,.12) 76%);
}

/* Imagem escura para claro: apresentação → método. */
.method-unified {
  background: linear-gradient(180deg, var(--gdr-graphite) 0%, #f7f6f3 92px, #f7f6f3 100%);
}

/* Claro para grafite: entregas → cases. */
#resultados.results-video-showcase {
  background: linear-gradient(180deg, #f3f3f1 0%, var(--gdr-graphite) 82px, var(--gdr-graphite) 100%);
}

.results-video-showcase .testimonial-carousel,
.results-video-showcase .testimonial-content,
.results-video-showcase .testimonial-footer {
  background-color: var(--gdr-graphite-soft);
}

/* Grafite para claro: cases → FAQ. */
.faq-section {
  background: linear-gradient(180deg, var(--gdr-graphite) 0%, #f5f3ef 92px, #f5f3ef 100%);
}

/* Claro para grafite: FAQ → formulário. */
.cta-section {
  background:
    radial-gradient(circle at 12% 34%, rgba(200,0,18,.2), transparent 35%),
    linear-gradient(180deg, #f5f3ef 0%, var(--gdr-graphite) 92px, var(--gdr-graphite-deep) 100%);
}

.site-footer {
  border-top: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, var(--gdr-graphite-deep), #1c1d20);
}

@media (max-width: 760px) {
  #problemas-cards { background: linear-gradient(180deg, var(--gdr-graphite) 0%, #f5f3ef 68px, #f5f3ef 100%); }
  #gdr.consultants-showcase::before { height: 62px; }
  .method-unified { background: linear-gradient(180deg, var(--gdr-graphite) 0%, #f7f6f3 64px, #f7f6f3 100%); }
  #resultados.results-video-showcase { background: linear-gradient(180deg, #f3f3f1 0%, var(--gdr-graphite) 58px, var(--gdr-graphite) 100%); }
  .faq-section { background: linear-gradient(180deg, var(--gdr-graphite) 0%, #f5f3ef 62px, #f5f3ef 100%); }
  .cta-section { background: linear-gradient(180deg, #f5f3ef 0%, var(--gdr-graphite) 64px, var(--gdr-graphite-deep) 100%); }
}
</style>`;

const graphiteTemplate = structuredClone(pageTemplate);
graphiteTemplate.title = "GDR — Landing Page grafite com degradês";
graphiteTemplate.page_settings.background_color = "#1A1B1E";
graphiteTemplate.content[0].elements[0].settings.html += `\n${graphiteThemeCss}`;

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

1. \`GDR-Landing-Page-Elementor.json\` — opção visual original corrigida.
2. \`GDR-Landing-Page-Elementor-Grafite.json\` — opção grafite com degradês entre as seções.
3. \`GDR-Obrigado-Elementor.json\` — página de agradecimento.

No WordPress, abra **Modelos → Modelos salvos → Importar modelos** e envie o JSON.
Depois, crie uma página com layout **Elementor Canvas** e insira o modelo importado.

## Organização no editor

Cada seção está em um widget HTML independente, nesta ordem:

${definitions.map((item) => `- ${item.name}`).join("\n")}

Todos os widgets possuem comentários no início do HTML indicando os elementos seguros para edição.

Para substituição manual no Elementor, use os arquivos da pasta vizinha \`widgets-html\`. Cada arquivo contém exatamente o código que deve ser colado no widget correspondente. Menu, formulário e rodapé já incluem suas correções locais.

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

## Se você importou uma versão anterior

O arquivo \`CORRECAO-MENU-RODAPE.css\` contém a correção isolada para menu e rodapé ocuparem toda a largura. Cole seu conteúdo no final do widget **00 — Configuração visual global** e limpe o cache. No JSON atual essa correção já está incluída.
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

const graphitePreviewHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Prévia do Kit Elementor Grafite — GDR</title>
</head>
<body class="elementor-page">
  ${graphiteTemplate.content.map((container) => `<div class="e-con ${container.settings._css_classes}">
    <div class="elementor-widget-html ${container.elements[0].settings._css_classes}">
      <div class="elementor-widget-container">
${container.elements[0].settings.html}
      </div>
    </div>
  </div>`).join("\n")}
</body>
</html>
`;

await Promise.all([
  mkdir(kitDirectory, { recursive: true }),
  mkdir(sourceDirectory, { recursive: true }),
  mkdir(widgetDirectory, { recursive: true }),
  mkdir(assetDirectory, { recursive: true }),
]);

await Promise.all([
  writeFile(path.join(kitDirectory, "GDR-Landing-Page-Elementor.json"), `${JSON.stringify(pageTemplate, null, 2)}\n`, "utf8"),
  writeFile(path.join(kitDirectory, "GDR-Landing-Page-Elementor-Grafite.json"), `${JSON.stringify(graphiteTemplate, null, 2)}\n`, "utf8"),
  writeFile(path.join(kitDirectory, "GDR-Obrigado-Elementor.json"), `${JSON.stringify(thankYouTemplate, null, 2)}\n`, "utf8"),
  writeFile(path.join(wordpressDirectory, "GDR-Landing-Page-Elementor.json"), `${JSON.stringify(pageTemplate, null, 2)}\n`, "utf8"),
  writeFile(path.join(wordpressDirectory, "GDR-Landing-Page-Elementor-Grafite.json"), `${JSON.stringify(graphiteTemplate, null, 2)}\n`, "utf8"),
  writeFile(path.join(wordpressDirectory, "GDR-Obrigado-Elementor.json"), `${JSON.stringify(thankYouTemplate, null, 2)}\n`, "utf8"),
  writeFile(path.join(kitDirectory, "README.md"), readme, "utf8"),
  writeFile(path.join(kitDirectory, "CORRECAO-MENU-RODAPE.css"), `${elementorCompatibilityCss}\n`, "utf8"),
  writeFile(path.join(kitDirectory, "preview.html"), previewHtml, "utf8"),
  writeFile(path.join(kitDirectory, "preview-grafite.html"), graphitePreviewHtml, "utf8"),
  writeFile(path.join(widgetDirectory, "00-config-grafite.html"), `${graphiteTemplate.content[0].elements[0].settings.html}\n`, "utf8"),
  writeFile(path.join(sourceDirectory, "gdr-global.css"), cssSource, "utf8"),
  writeFile(path.join(sourceDirectory, "gdr-interacoes.js"), jsSource, "utf8"),
  cp(path.join(projectDirectory, "assets"), assetDirectory, { recursive: true, force: true }),
]);

await Promise.all(definitions.map((definition, index) => writeFile(
  path.join(sourceDirectory, `${String(index).padStart(2, "0")}-${definition.key}.html`),
  `${htmlFor(definition)}\n`,
  "utf8",
)));

await Promise.all(definitions.map((definition, index) => writeFile(
  path.join(widgetDirectory, `${String(index).padStart(2, "0")}-${definition.key}.html`),
  `${htmlFor(definition)}\n`,
  "utf8",
)));

await copyFile(
  path.join(projectDirectory, "obrigado.html"),
  path.join(sourceDirectory, "obrigado-original.html"),
);

console.log(`Kit Elementor criado em: ${kitDirectory}`);
console.log(`Widgets HTML na landing page: ${definitions.length}`);
