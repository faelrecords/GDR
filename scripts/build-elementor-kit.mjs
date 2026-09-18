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
  let initialized = false;
  const initializeGdrPage = () => {
    if (initialized) return;
    if (!document.querySelector("#inicio") || !document.querySelector("#resultados")) return;

${elementorJsSource.split("\n").map((line) => `    ${line}`).join("\n")}
    initialized = true;
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

const consultantsMotionBootstrap = `<script data-nowprocket data-no-optimize="1" data-cfasync="false">
(() => {
  const section = document.querySelector("#gdr");
  if (!section || section.dataset.localMotionReady === "true") return;
  section.dataset.localMotionReady = "true";
  section.classList.add("reveal-ready");
  let frame = 0;
  const update = () => {
    frame = 0;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    section.classList.toggle("is-visible", rect.top <= vh * .88 && rect.bottom >= vh * .08);
  };
  const requestUpdate = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  requestUpdate();
})();
</script>`;

const deliverablesMotionBootstrap = `<script data-nowprocket data-no-optimize="1" data-cfasync="false">
(() => {
  const section = document.querySelector("#entregas");
  const scrollArea = section?.querySelector(".deliverables-scroll");
  const stage = section?.querySelector(".deliverables-grid");
  const cards = [...(section?.querySelectorAll(".deliverable-card") || [])];
  if (!section || !scrollArea || !stage || !cards.length || section.dataset.localStackReady === "true") return;
  section.dataset.localStackReady = "true";
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let frame = 0;
  const update = () => {
    frame = 0;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const top = mobile ? 72 : 96;
    const rect = scrollArea.getBoundingClientRect();
    const travel = Math.max(1, scrollArea.offsetHeight - stage.offsetHeight);
    const progress = clamp((top - rect.top) / travel, 0, 1);
    const cardHeight = Math.max(190, cards[0].offsetHeight);
    const initialStep = cardHeight + (mobile ? 24 : 28);
    const finalStep = mobile ? 70 : 80;
    cards.forEach((card, index) => {
      const cardProgress = clamp((progress - index * .115) / .43, 0, 1);
      const eased = 1 - Math.pow(1 - cardProgress, 3);
      const y = index * initialStep + (index * finalStep - index * initialStep) * eased;
      card.style.setProperty("--card-y", y.toFixed(2) + "px");
    });
  };
  const requestUpdate = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  window.addEventListener("load", requestUpdate, { once: true });
  requestUpdate();
})();
</script>`;

const markupByKey = {
  config: globalCss,
  header,
  inicio: findSection("inicio"),
  "problemas-cards": findSection("problemas-cards"),
  gdr: `${findSection("gdr")}\n${consultantsMotionBootstrap}`,
  metodologia: findSection("metodologia"),
  entregas: `${findSection("entregas")}\n${deliverablesMotionBootstrap}`,
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

/*
  Os degradês ficam sempre dentro das seções claras.
  Assim, as áreas grafite permanecem sólidas e a transição não invade o conteúdo escuro.
*/
#problemas-cards {
  background: linear-gradient(180deg,
    var(--gdr-graphite) 0,
    #f5f3ef 42px,
    #f5f3ef calc(100% - 42px),
    var(--gdr-graphite) 100%);
}

.consultants-showcase {
  background: var(--gdr-graphite);
}

.consultants-shade {
  background: linear-gradient(90deg, rgba(26,27,30,.98) 0%, rgba(26,27,30,.86) 44%, rgba(26,27,30,.12) 76%);
}

/* A borda escura pertence à seção clara da metodologia. */
.method-unified {
  background: linear-gradient(180deg, var(--gdr-graphite) 0, #f7f6f3 42px, #f7f6f3 100%);
}

/* A seção de entregas continua clara e absorve a passagem para os cases. */
.deliverables-section {
  background:
    radial-gradient(circle at 84% 18%, rgba(200,0,18,.055), transparent 31%),
    linear-gradient(90deg, transparent 0 49.92%, rgba(25,25,29,.035) 49.92% 50%, transparent 50% 100%),
    linear-gradient(180deg, #f3f3f1 0%, #f3f3f1 calc(100% - 42px), var(--gdr-graphite) 100%);
}

#resultados.results-video-showcase {
  background: var(--gdr-graphite);
}

.results-video-showcase .testimonial-carousel,
.results-video-showcase .testimonial-content,
.results-video-showcase .testimonial-footer {
  background-color: var(--gdr-graphite-soft);
}

/* O FAQ é claro e recebe as duas transições, sem clarear as seções grafite. */
.faq-section {
  background: linear-gradient(180deg,
    var(--gdr-graphite) 0,
    #f5f3ef 42px,
    #f5f3ef calc(100% - 42px),
    var(--gdr-graphite) 100%);
}

.cta-section {
  background:
    radial-gradient(circle at 8% 42%, rgba(200,0,18,.07), transparent 31%),
    var(--gdr-graphite-deep);
}

/* Formulário nativo do Elementor — exclusivo desta versão. */
.gdr-native-cta-section { width: 100%; }
.gdr-native-cta-section > .e-con-inner,
.gdr-native-cta-grid { width: min(calc(100% - 48px), var(--container)); max-width: var(--container); margin-inline: auto; }
.gdr-native-cta-grid { position: relative; z-index: 2; display: flex !important; flex-direction: row !important; align-items: center; flex-wrap: nowrap; gap: 72px; }
.gdr-native-cta-copy-widget { order: 2; flex: .92 1 0; width: auto; min-width: 0; }
.gdr-native-cta-copy { grid-area: copy; }
.gdr-native-cta-copy h2 { color: #fff !important; }
.gdr-native-cta-copy > p { color: #a8a8ae !important; }
.gdr-native-cta-copy .cta-detail { color: #a8a8ae !important; border-color: rgba(255,255,255,.16) !important; }
.gdr-native-lead-form { order: 1; flex: 1.08 1 0; width: auto; min-width: 0; }
.gdr-native-lead-form .elementor-widget-container { width: 100%; }
.gdr-native-lead-form .elementor-form { width: 100%; }
.gdr-native-lead-form .elementor-form-fields-wrapper { margin: 0 -7px; }
.gdr-native-lead-form .elementor-field-group { padding-inline: 7px; margin-bottom: 17px; }
.gdr-native-lead-form .elementor-field-label { margin: 0 0 7px; color: #515156; font-family: "Montserrat", sans-serif; font-size: 10px; font-weight: 700; line-height: 1.35; }
.gdr-native-lead-form .elementor-field,
.gdr-native-lead-form .elementor-select-wrapper select { min-height: 49px; padding: 0 14px; border: 1px solid #dedee1; border-radius: 7px; color: #19191d; background: #fafafa; font-family: "Montserrat", sans-serif; font-size: 12px; box-shadow: none; }
.gdr-native-lead-form .elementor-field:focus,
.gdr-native-lead-form .elementor-select-wrapper select:focus { border-color: #c80012; outline: 3px solid rgba(200,0,18,.08); }
.gdr-native-lead-form .elementor-field-type-html { width: 100%; padding-inline: 7px; }
.gdr-native-lead-form .form-heading { margin-bottom: 13px; }
.gdr-native-lead-form .elementor-field-type-checkbox { align-items: center; margin: 0 0 18px; }
.gdr-native-lead-form .elementor-field-type-checkbox .elementor-field-subgroup { display: block; }
.gdr-native-lead-form .elementor-field-option { display: flex; align-items: center; gap: 10px; }
.gdr-native-lead-form .elementor-field-option input { flex: 0 0 16px; width: 16px; height: 16px; margin: 0; accent-color: #c80012; }
.gdr-native-lead-form .elementor-field-option label { margin: 0; color: #7c7c82; font-size: 9px; line-height: 1.5; }
.gdr-native-lead-form .elementor-field-type-submit { width: 100%; margin: 0; }
.gdr-native-lead-form .elementor-button,
.gdr-native-lead-form button.elementor-button { width: 100%; min-height: 54px; border: 0 !important; border-radius: 7px; color: #fff !important; background-color: #c80012 !important; font-family: "Poppins", sans-serif; font-size: 12px; font-weight: 800; box-shadow: none !important; }
.gdr-native-lead-form .elementor-button:hover,
.gdr-native-lead-form button.elementor-button:hover { color: #fff !important; background-color: #a90010 !important; transform: translateY(-1px); }
.gdr-native-lead-form .elementor-form::after { content: "Seus dados serão usados apenas para este atendimento."; display: block; margin-top: 12px; color: #a1a1a6; font-size: 8px; text-align: center; }

.site-footer {
  border-top: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, var(--gdr-graphite-deep), #1c1d20);
}

@media (max-width: 760px) {
  #problemas-cards { background: linear-gradient(180deg, var(--gdr-graphite) 0, #f5f3ef 28px, #f5f3ef calc(100% - 28px), var(--gdr-graphite) 100%); }
  .method-unified { background: linear-gradient(180deg, var(--gdr-graphite) 0, #f7f6f3 28px, #f7f6f3 100%); }
  .deliverables-section { background: linear-gradient(180deg, #f3f3f1 0%, #f3f3f1 calc(100% - 28px), var(--gdr-graphite) 100%); }
  .faq-section { background: linear-gradient(180deg, var(--gdr-graphite) 0, #f5f3ef 28px, #f5f3ef calc(100% - 28px), var(--gdr-graphite) 100%); }
  .gdr-native-cta-grid { width: min(calc(100% - 30px), var(--container)); flex-direction: column !important; align-items: stretch; gap: 36px; }
  .gdr-native-cta-copy-widget,
  .gdr-native-lead-form { flex: 0 0 auto; width: 100%; }
  .gdr-native-lead-form, .gdr-native-cta-copy { width: 100%; }
  .gdr-native-lead-form .elementor-field-group { width: 100% !important; }
}
</style>`;

const graphiteTemplate = structuredClone(pageTemplate);
graphiteTemplate.title = "GDR — Landing Page grafite com degradês";
graphiteTemplate.page_settings.background_color = "#1A1B1E";
graphiteTemplate.content[0].elements[0].settings.html += `\n${graphiteThemeCss}`;

const nativeField = (key, settings) => ({
  _id: idFor(`native-form-field-${key}`).slice(0, 7),
  custom_id: key,
  width: "100",
  width_tablet: "100",
  width_mobile: "100",
  ...settings,
});

const graphiteNativeFormWidget = {
  id: idFor("graphite-native-form-widget"),
  elType: "widget",
  widgetType: "form",
  isInner: false,
  settings: {
    form_name: "Pré-diagnóstico GDR",
    form_id: "gdr_pre_diagnostico",
    form_fields: [
      nativeField("cabecalho", {
        field_type: "html",
        field_html: '<div class="form-heading"><strong>Solicite seu pré-diagnóstico com a GDR.</strong><small>Leva cerca de 2 minutos.</small></div>',
      }),
      nativeField("nome", { field_type: "text", field_label: "Nome", placeholder: "Seu nome", required: "true", width: "25" }),
      nativeField("sobrenome", { field_type: "text", field_label: "Sobrenome", placeholder: "Seu sobrenome", required: "true", width: "33" }),
      nativeField("empresa", { field_type: "text", field_label: "Nome da sua empresa", placeholder: "Nome da empresa", required: "true", width: "42" }),
      nativeField("telefone", { field_type: "tel", field_label: "Telefone", placeholder: "(00) 00000-0000", required: "true", width: "50" }),
      nativeField("email", { field_type: "email", field_label: "E-mail", placeholder: "voce@empresa.com.br", required: "true", width: "50" }),
      nativeField("cidade", { field_type: "text", field_label: "Cidade", placeholder: "Sua cidade", required: "true", width: "50" }),
      nativeField("colaboradores", {
        field_type: "number",
        field_label: "Quantidade de colaboradores",
        placeholder: "Ex.: 12",
        required: "true",
        width: "50",
      }),
      nativeField("consentimento", {
        field_type: "checkbox",
        field_label: "",
        field_options: "Concordo em receber o contato da equipe GDR sobre meu pré-diagnóstico.|sim",
        required: "true",
        css_classes: "gdr-native-consent",
      }),
    ],
    show_labels: "yes",
    input_size: "sm",
    button_size: "sm",
    button_text: "Quero meu pré-diagnóstico ↗",
    button_width: "100",
    submit_actions: ["redirect"],
    redirect_to: `${WORDPRESS_SITE_URL}/obrigado/`,
    success_message: "Dados enviados. Estamos direcionando você...",
    error_message: "Não foi possível enviar. Confira os campos e tente novamente.",
    required_message: "Este campo é obrigatório.",
    invalid_message: "Preencha este campo corretamente.",
    _css_classes: "lead-form gdr-native-lead-form",
    _element_id: "gdr-formulario-nativo",
  },
  elements: [],
};

const graphiteCtaCopyWidget = {
  id: idFor("graphite-native-cta-copy"),
  elType: "widget",
  widgetType: "html",
  isInner: false,
  settings: {
    html: `<div class="cta-copy gdr-native-cta-copy">
  <h2>Descubra o que está impedindo o lucro de aparecer.</h2>
  <p>Conte um pouco sobre a sua empresa. A equipe GDR analisa o cenário antes da conversa para chegar ao ponto mais rápido.</p>
  <p class="cta-detail">Em até 24 horas, entramos em contato para agendar o pré-diagnóstico. Sem compromisso e sem promessa fácil.</p>
</div>`,
    _css_classes: "gdr-native-cta-copy-widget",
    _element_id: "gdr-texto-formulario",
  },
  elements: [],
};

const graphiteCtaGrid = {
  id: idFor("graphite-native-cta-grid"),
  elType: "container",
  isInner: true,
  settings: {
    content_width: "full",
    flex_direction: "row",
    flex_direction_tablet: "row",
    flex_direction_mobile: "column",
    flex_wrap: "nowrap",
    align_items: "center",
    align_items_mobile: "stretch",
    _css_classes: "container cta-grid gdr-native-cta-grid",
    _element_id: "gdr-grade-formulario",
    html_tag: "div",
  },
  elements: [graphiteCtaCopyWidget, graphiteNativeFormWidget],
};

const graphiteNativeCtaSection = {
  id: idFor("graphite-native-cta-section"),
  elType: "container",
  isInner: true,
  settings: {
    content_width: "full",
    flex_direction: "column",
    _css_classes: "section cta-section gdr-native-cta-section",
    _element_id: "diagnostico",
    html_tag: "section",
  },
  elements: [graphiteCtaGrid],
};

const graphiteDiagnosticIndex = definitions.findIndex(({ key }) => key === "diagnostico");
const graphitePreviewTemplate = structuredClone(graphiteTemplate);
graphiteTemplate.content[graphiteDiagnosticIndex].elements = [graphiteNativeCtaSection];

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

No JSON original, o formulário HTML mantém o visual original e envia atualmente para:
\`${WORDPRESS_SITE_URL}/obrigado/\`

No arquivo **GDR-Landing-Page-Elementor-Grafite.json**, o formulário já foi substituído pelo widget nativo do Elementor/Pro Elements. Ele preserva nome e sobrenome separados, demais campos, consentimento e o redirecionamento para a página de obrigado.

Para conectar o Integrately nessa versão, abra o formulário no Elementor, adicione **Webhook** em **Ações após o envio** e cole a URL fornecida pelo Integrately. O JSON não inclui uma URL fictícia para evitar perda de leads.

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
  ${graphitePreviewTemplate.content.map((container) => `<div class="e-con ${container.settings._css_classes}">
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
